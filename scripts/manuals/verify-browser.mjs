import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium, browserOptions } from './browser.mjs';
const root = new URL('../../', import.meta.url);
const browser = await chromium.launch({ ...browserOptions, headless: true });
const base = process.env.VMS_FRONTEND_URL || 'http://localhost:5173';
const results = []; const errors = [];
const editions = [['en', 'English'], ['ceb', 'Bisaya'], ['fil', 'Tagalog']];
try {
  const context = await browser.newContext({ acceptDownloads: true, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/about`); await page.locator('#user-manual').scrollIntoViewIfNeeded();
  const placement = await page.locator('#how-it-works').evaluate((element) => element.nextElementSibling?.id);
  if (placement !== 'user-manual') throw new Error('Manual section is in the wrong position');
  for (const [code, name] of editions) {
    await page.selectOption('#manual-language', code);
    const event = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    const download = await event;
    const expected = `VMS_User_Manual_${name}.pdf`;
    if (download.suggestedFilename() !== expected) throw new Error('Incorrect download filename');
    const downloaded = await readFile(await download.path());
    const deployed = await readFile(new URL(`backend-api/public/manuals/${expected}`, root));
    if (!downloaded.equals(deployed)) throw new Error('Download differs from shipped complete PDF');
    await page.getByRole('button', { name: 'Send to My Email', exact: true }).click();
    const dialog = page.getByRole('dialog'); await dialog.waitFor();
    if (!(await dialog.innerText()).includes(code === 'ceb' ? 'Bisaya (Cebuano)' : code === 'fil' ? 'Tagalog (Filipino)' : 'English')) throw new Error('Wrong modal language');
    const before = await page.locator('body').evaluate((body) => body.style.overflow);
    if (before !== 'hidden') throw new Error('Background scrolling is unlocked');
    if (process.env.VMS_TEST_EMAIL) {
      await dialog.getByLabel('Email address').fill(process.env.VMS_TEST_EMAIL);
      await dialog.locator('label').filter({ hasText: /What is \d+ \+ \d+/ }).waitFor({ timeout: 15000 });
      const question = (await dialog.locator('label').nth(1).innerText()).match(/(\d+) \+ (\d+)/);
      await dialog.locator('input[inputmode=numeric]').fill(String(Number(question[1]) + Number(question[2])));
      await dialog.getByRole('button', { name: 'Send Manual', exact: true }).click();
      await dialog.locator('.manual-notice').waitFor({ timeout: 125000 });
      if (await dialog.locator('.manual-notice.error').count()) throw new Error(await dialog.locator('.manual-notice.error').innerText());
      if (!(await dialog.getByRole('status').innerText()).includes('accepted')) throw new Error('Live email was not accepted');
    }
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
    const focus = await page.evaluate(() => document.activeElement?.textContent);
    if (!focus.includes('Send to My Email')) throw new Error('Focus did not return to email trigger');
    results.push({ language: code, download: expected, bytes: deployed.length, sha256: createHash('sha256').update(deployed).digest('hex'), modal: 'correct language; Escape and focus restoration passed', liveEmail: process.env.VMS_TEST_EMAIL ? 'SMTP acceptance confirmed; inbox placement not asserted' : 'not requested in this run' });
    await writeFile(new URL('docs/manuals/browser-verification.json', root), JSON.stringify({ results, consoleExceptions: errors, inProgress: true }, null, 2));
  }
  for (const theme of ['light', 'dark']) for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme);
    await page.locator('#user-manual').scrollIntoViewIfNeeded();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw new Error(`Horizontal overflow: ${theme}/${width}`);
    await page.getByRole('button', { name: 'Send to My Email', exact: true }).click();
    const dialog = page.getByRole('dialog'); await dialog.waitFor();
    await dialog.locator('label').filter({ hasText: /What is \d+ \+ \d+/ }).waitFor({ timeout: 15000 });
    await page.keyboard.press('Shift+Tab');
    if (!await dialog.evaluate((element) => element.contains(document.activeElement))) throw new Error('Focus escaped the native dialog');
    await page.screenshot({ path: new URL(`docs/manuals/ui-${theme}-${width}.png`, root).pathname.replace(/^\/(\w:)/, '$1').replaceAll('%20', ' ') });
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Send to My Email', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.mouse.click(2, 2);
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    results.push({ theme, width, horizontalOverflow: false, keyboardFocus: 'contained', cancel: 'passed' });
  }
  await context.close();
  if (errors.length) throw new Error(errors.join('\n'));
  await writeFile(new URL('docs/manuals/browser-verification.json', root), JSON.stringify({ results, consoleExceptions: errors }, null, 2));
  console.log(JSON.stringify({ checks: results.length, consoleExceptions: errors, liveEmail: Boolean(process.env.VMS_TEST_EMAIL) }));
} finally { await browser.close(); }
