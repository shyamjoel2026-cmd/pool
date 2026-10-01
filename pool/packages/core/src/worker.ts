import {
  launchWorkflows,
  dispatchOutbox,
  DBOS,
  waveWorkflow,
  poolCloseWorkflow,
} from './workflows.ts';
await launchWorkflows();
process.send?.({ type: 'ready' });
// Production service loop. Tests explicitly submit only their own workflow IDs.
if (process.env.POOL_TEST_WORKER !== '1') {
  let dispatching = false;
  const dispatch = async () => {
    if (dispatching) return;
    dispatching = true;
    try {
      const result = await dispatchOutbox();
      if (result.blocked || result.deferred)
        console.error(
          `Workflow dispatch: ${result.blocked} invalid jobs blocked, ${result.deferred} submissions deferred; inspect workflow status`,
        );
    } catch {
      console.error('Workflow dispatch failed; retrying, credentials redacted');
    } finally {
      dispatching = false;
    }
  };
  await dispatch();
  setInterval(() => void dispatch(), 1000);
}
if (process.env.POOL_TEST_WORKER === '1')
  process.on(
    'message',
    async (message: { kind: string; id: string; at: number; workflowId: string }) => {
      try {
        const handle =
          message.kind === 'wave'
            ? await DBOS.startWorkflow(waveWorkflow, {
                workflowID: message.workflowId,
              })(message.id, message.at)
            : await DBOS.startWorkflow(poolCloseWorkflow, {
                workflowID: message.workflowId,
              })(message.id, message.at);
        await handle.getResult();
        process.send?.({ type: 'done' });
      } catch {
        process.send?.({ type: 'failed' });
      }
    },
  );
