// Finds a browser for the QA scripts on any computer:
// CHROME_PATH if set, the cloud container's Chromium if present, else installed Google Chrome, else Microsoft Edge.
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const CLOUD_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export async function launchBrowser(options = {}) {
  if (process.env.CHROME_PATH) return chromium.launch({ ...options, executablePath: process.env.CHROME_PATH });
  if (existsSync(CLOUD_CHROMIUM)) return chromium.launch({ ...options, executablePath: CLOUD_CHROMIUM });
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ ...options, channel });
    } catch {
      // try the next one
    }
  }
  throw new Error('No browser found. Install Google Chrome (or Microsoft Edge), or set CHROME_PATH to a Chromium-based browser.');
}
