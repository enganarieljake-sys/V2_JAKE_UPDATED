import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Documentation tooling only; never bundled into the application.
export const { chromium } = require(process.env.VMS_PLAYWRIGHT_MODULE || 'playwright');
export const browserOptions = process.env.VMS_CHROMIUM_PATH ? { executablePath: process.env.VMS_CHROMIUM_PATH } : {};
