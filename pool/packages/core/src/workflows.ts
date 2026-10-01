import { DBOS } from '@dbos-inc/dbos-sdk';
import { connect, validateEnv } from '@pool/db';
import type { Slab, WaveOrder } from '@pool/engine';
import { command } from './store.ts';
import {
  closePool,
  expirePoolPricing,
  expirePoolOffers,
  releaseOrderHolds,
  waveClose,
  closePersistedWaves,
  settleOrder,
} from './index.ts';
// API verified in installed 5.2.11 declarations and https://docs.dbos.dev/typescript/programming-guide
async function waitUntil(at: number) {
  const now = await DBOS.runStep(async () => Date.now(), { name: 'clock' });
  await DBOS.sleep(Math.max(0, at - now));
}
async function withDb<T>(fn: (db: ReturnType<typeof connect>['pool']) => Promise<T>) {
  const { pool } = connect();
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}
export const poolCloseWorkflow = DBOS.registerWorkflow(
  async (id: string, at: number) => {
    await waitUntil(at);
    return DBOS.runStep(() => withDb((db) => closePool(db, id, at)), {
      name: 'close-pool',
    });
  },
  { name: 'pool-close' },
);
export const pricingWorkflow = DBOS.registerWorkflow(
  async (id: string, at: number) => {
    await waitUntil(at + 1);
    return DBOS.runStep(() => withDb((db) => expirePoolPricing(db, id, at + 1)), {
      name: 'expire-pricing',
    });
  },
  { name: 'pricing-deadline' },
);
export const acceptWorkflow = DBOS.registerWorkflow(
  async (id: string, at: number) => {
    await waitUntil(at + 1);
    return DBOS.runStep(() => withDb((db) => expirePoolOffers(db, id, at + 1)), {
      name: 'expire-offers',
    });
  },
  { name: 'accept-expiry' },
);
export const holdWorkflow = DBOS.registerWorkflow(
  async (id: string, at: number, generation: string = 'initial') => {
    await waitUntil(at);
    const executedAt = await DBOS.runStep(async () => Date.now(), { name: 'execution-clock' });
    return DBOS.runStep(() => withDb((db) => releaseOrderHolds(db, id, executedAt, generation)), {
      name: 'release-holds',
    });
  },
  { name: 'hold-release' },
);
export const waveWorkflow = DBOS.registerWorkflow(
  async (id: string, at: number, slabs?: readonly Slab[], orders?: readonly WaveOrder[]) => {
    await waitUntil(at);
    const executedAt = await DBOS.runStep(async () => Date.now(), { name: 'wave-execution-clock' });
    return DBOS.runStep(
      async () => {
        const result = await withDb((db) =>
          slabs && orders
            ? waveClose(db, id, slabs, orders, executedAt)
            : closePersistedWaves(db, id, executedAt),
        );
        // Test-only process crash boundary AFTER business transaction commit, BEFORE DBOS records step completion.
        if (process.env.POOL_TEST_CRASH_BOUNDARY === '1') {
          process.send?.({ type: 'committed' });
          await new Promise<void>(() => {});
        }
        return result;
      },
      { name: 'close-wave' },
    );
  },
  { name: 'wave-close' },
);
export const settleWorkflow = DBOS.registerWorkflow(
  async (id: string, at: number, generation: string) => {
    await waitUntil(at);
    const executedAt = await DBOS.runStep(async () => Date.now(), {
      name: 'settle-execution-clock',
    });
    return DBOS.runStep(() => withDb((db) => settleOrder(db, id, executedAt, generation)), {
      name: 'settle-order',
    });
  },
  { name: 'order-settle' },
);
export async function launchWorkflows() {
  DBOS.setConfig({
    name: 'pool-india',
    applicationVersion: 'm2-v1',
    systemDatabaseUrl: validateEnv().databaseUrl,
    executorID: 'pool-local-worker',
    enableOTLP: false,
    tracingEnabled: false,
    logLevel: 'error',
  });
  await DBOS.launch();
}
/** Outbox survives a crash between domain commit and DBOS submission. Stable workflow IDs deduplicate dispatch. */
export async function dispatchOutbox(aggregateId?: string) {
  return withDb(async (db) => {
    const rows = await db.query(
      "SELECT id,kind,due_at,data FROM workflow_outbox WHERE NOT dispatched AND ($1::text IS NULL OR data->>'aggregateId'=$1) ORDER BY due_at LIMIT 100",
      [aggregateId ?? null],
    );
    for (const row of rows.rows) {
      const id = row.data.aggregateId as string,
        at = Number(row.due_at);
      const options = { workflowID: row.id };
      switch (row.kind) {
        case 'close':
          await DBOS.startWorkflow(poolCloseWorkflow, options)(id, at);
          break;
        case 'pricing':
          await DBOS.startWorkflow(pricingWorkflow, options)(id, at);
          break;
        case 'accept':
          await DBOS.startWorkflow(acceptWorkflow, options)(id, at);
          break;
        case 'hold':
          await DBOS.startWorkflow(holdWorkflow, options)(id, at, row.id);
          break;
        case 'wave':
          await DBOS.startWorkflow(waveWorkflow, options)(id, at);
          break;
        case 'settle':
          await DBOS.startWorkflow(settleWorkflow, options)(id, at, row.id);
          break;
        default:
          throw new Error('unknown durable workflow kind');
      }
      await db.query('UPDATE workflow_outbox SET dispatched=true WHERE id=$1', [row.id]);
    }
  });
}
export { DBOS };

/** Local operational view: no inputs, outputs, secrets or raw error messages are exposed.
 * https://docs.dbos.dev/typescript/tutorials/workflow-management
 */
export async function inspectWorkflows(aggregateId: string) {
  return withDb(async (db) => {
    const rows = await db.query(
      "SELECT id,kind,dispatched FROM workflow_outbox WHERE data->>'aggregateId'=$1 ORDER BY due_at,id",
      [aggregateId],
    );
    const result: { id: string; kind: string; dispatched: boolean; status: string }[] = [];
    for (const row of rows.rows) {
      const status = await DBOS.getWorkflowStatus(row.id);
      result.push({
        id: row.id,
        kind: row.kind,
        dispatched: row.dispatched,
        status: status?.status ?? 'NOT_SUBMITTED',
      });
    }
    return result;
  });
}

/** Audited recovery forks at the failed step, preserving completed clocks and the
 * original failed workflow as evidence. Stable retry ID handles crash after fork.
 * Official API and installed 5.2.11 declarations:
 * https://docs.dbos.dev/typescript/tutorials/workflow-management
 */
export async function retryFailedWorkflow(
  workflowId: string,
  requestId: string,
  actor: string,
  reason: string,
  now: number,
) {
  if (!requestId.trim() || !actor.trim() || !reason.trim() || !Number.isSafeInteger(now))
    throw new Error('workflow recovery requires request identity, actor, reason and UTC time');
  const retryId = 'recovery:' + requestId;
  const intent = await withDb((db) =>
    command<{ source: string; retryId: string; startStep: number }>(
      db,
      retryId,
      'workflow-recovery',
      retryId,
      { workflowId, actor, reason, now },
      async (_, c) => {
        if (!(await c.query('SELECT id FROM workflow_outbox WHERE id=$1', [workflowId])).rowCount)
          throw new Error('only a persisted POOL outbox workflow can be recovered');
        const status = await DBOS.getWorkflowStatus(workflowId);
        if (status?.status !== 'ERROR') throw new Error('recovery requires a failed workflow');
        const failed = (await DBOS.listWorkflowSteps(workflowId))?.find(
          (step) => step.error !== null,
        );
        if (!failed) throw new Error('no recorded failed step; investigation required');
        const state = { source: workflowId, retryId, startStep: failed.functionID };
        return {
          state,
          events: [{ type: 'WORKFLOW_RECOVERY_REQUESTED', ...state, actor, reason, at: now }],
          postings: [],
        };
      },
    ),
  );
  const existing = await DBOS.getWorkflowStatus(intent.retryId);
  const handle = existing
    ? DBOS.retrieveWorkflow(intent.retryId)
    : await DBOS.forkWorkflow(intent.source, intent.startStep, { newWorkflowID: intent.retryId });
  return handle;
}
