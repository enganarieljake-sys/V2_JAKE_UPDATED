import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, browserOptions } from './browser.mjs';
const base = process.env.VMS_FRONTEND_URL || 'http://localhost:5173';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use a local demo environment for public documentation.');
const output = new URL('../../docs/manuals/screenshots/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ ...browserOptions, headless: true });
const manifest = [];
const errors = [];
async function capture(page, name) {
  await page.waitForTimeout(900);
  await page.evaluate(() => document.fonts.ready);
  const masks = page.locator('.workspace-profile, .profile-menu, .sidebar-user, .topbar-profile, .workspace-user, .user-menu-trigger');
  await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)), fullPage: false, mask: await masks.all() });
  manifest.push({ name, route: new URL(page.url()).pathname + new URL(page.url()).search, viewport: '1440x1000', source: 'Local seeded VMS application; authenticated through the normal login form' });
}
const credentials = JSON.parse(process.env.VMS_MANUAL_ACCOUNTS_JSON || '{}');
const accounts = [
  ['admin', credentials.admin?.email, credentials.admin?.password, ['dashboard', 'vehicles', 'tickets', 'schedules', 'maintenance', 'conditions', 'reports', 'logs', 'users', 'locations']],
  ['custodian', credentials.custodian?.email, credentials.custodian?.password, ['dashboard', 'vehicles', 'conditions', 'reportOrPropose', 'myTasks', 'schedules', 'histories']],
  ['maintenance', credentials.maintenance?.email, credentials.maintenance?.password, ['dashboard', 'ticketWorkOrders', 'maintenance', 'schedules']],
];
if (accounts.some(([, email, password]) => !email || !password)) throw new Error('Set VMS_MANUAL_ACCOUNTS_JSON with authorized local demo credentials for all three roles.');
try {
  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const publicPage = await publicContext.newPage();
  await publicPage.goto(`${base}/login`); await capture(publicPage, 'login'); await publicContext.close();
  for (const [role, email, password, modules] of accounts) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/login`);
    await page.locator('[name=email]').fill(email); await page.locator('[name=password]').fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(`**/${role}`, { timeout: 20000 });
    for (const module of modules) {
      await page.goto(`${base}/${role}?module=${module}`);
      await page.waitForLoadState('networkidle');
      // Only use known seeded sample records. User account lists are masked in full.
      if (module === 'users') continue;
      await capture(page, `${role}-${module}`);
      if (module === 'vehicles' && role === 'admin') {
        const add = page.getByRole('button', { name: /Add Vehicle/ }).first();
        if (await add.count()) { await add.click(); await capture(page, 'vehicle-form'); }
      }
      if (module === 'conditions' && role === 'custodian') {
        const add = page.getByRole('button', { name: /Add Condition|Record Condition|Add Check/ }).first();
        if (await add.count()) { await add.click(); await capture(page, 'condition-form'); }
      }
    }
    const extra = role === 'admin' ? [['tickets/3', 'proposal-review'], ['vehicles/1', 'vehicle-profile']]
      : role === 'custodian' ? [['issues/new', 'issue-form'], ['tickets/new', 'proposal-form'], ['schedules/new', 'schedule-form'], ['tickets/2', 'verification-detail']]
        : [['tickets/1', 'repair-detail']];
    for (const [route, name] of extra) {
      await page.goto(`${base}/${role}/${route}`); await page.waitForLoadState('networkidle'); await capture(page, name);
      if (name === 'repair-detail' || name === 'verification-detail') {
        const action = page.getByRole('button', { name: name === 'repair-detail' ? /^Log Repairs$/ : /^Verify Repair$/ }).first();
        if (await action.count()) { await action.click(); await capture(page, name === 'repair-detail' ? 'repair-form' : 'verification-form'); }
      }
    }
    await context.close();
  }
  await writeFile(new URL('manifest.json', output), JSON.stringify({ capturedAt: new Date().toISOString(), screenshots: manifest, errors }, null, 2));
  console.log(JSON.stringify({ screenshots: manifest.length, errors }));
} finally { await browser.close(); }
