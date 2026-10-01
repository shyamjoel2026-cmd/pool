import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// Fork/IPC/kill APIs: https://nodejs.org/api/child_process.html (tested on local Node 24.12.0).
const workerDiagnostics = new WeakMap<ChildProcess, string>();
export function worker(crash = false) {
  const child = fork(fileURLToPath(new URL('../src/worker.ts', import.meta.url)), [], {
    execArgv: ['--env-file=../../.env'],
    env: {
      ...process.env,
      POOL_TEST_WORKER: '1',
      POOL_TEST_CRASH_BOUNDARY: crash ? '1' : '0',
    },
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  workerDiagnostics.set(child, '');
  child.stderr?.on('data', (chunk: Buffer) => {
    let value = chunk.toString();
    for (const secret of [
      process.env.DATABASE_URL,
      process.env.CODE_SECRET,
      process.env.POSTGRES_PASSWORD,
    ])
      if (secret) value = value.replaceAll(secret, '[REDACTED]');
    value = value.replace(/postgres(?:ql)?:\/\/\S+/g, '[REDACTED_DATABASE_URL]');
    workerDiagnostics.set(child, ((workerDiagnostics.get(child) ?? '') + value).slice(-4096));
  });
  return child;
}
export function message(child: ChildProcess, type: string, timeout = 60000) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('worker timeout: ' + type + '; ' + workerDiagnostics.get(child)));
    }, timeout);
    const onMessage = (m: unknown) => {
      if ((m as { type: string }).type === type) {
        cleanup();
        resolve();
      } else if ((m as { type: string }).type === 'failed') {
        cleanup();
        reject(new Error('worker failed'));
      }
    };
    const cleanup = () => {
      clearTimeout(timer);
      child.off('message', onMessage);
      child.off('exit', onExit);
    };
    const onExit = (code: number | null) => {
      cleanup();
      reject(
        new Error(
          'worker exited before ' + type + ': ' + code + '; ' + workerDiagnostics.get(child),
        ),
      );
    };
    child.on('message', onMessage);
    child.once('exit', onExit);
  });
}
