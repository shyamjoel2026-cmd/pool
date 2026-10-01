import { defineConfig } from 'vitest/config';

// These suites exercise recovery of the same local DBOS executor; serialize files.
export default defineConfig({ test: { fileParallelism: false } });
