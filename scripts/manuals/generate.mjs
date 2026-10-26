import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, browserOptions } from './browser.mjs';
import { languages, labels, sections } from './content.mjs';
import { GEAR_OUTLINE, GEAR_RING_RADIUS, GEAR_RING_WIDTH, GEAR_VIEWBOX } from '../../frontend-spa/src/assets/vmsGear.js';
const root = new URL('../../', import.meta.url);
const destination = new URL('backend-api/public/manuals/', root);
await mkdir(destination, { recursive: true });
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const logo = `<svg width="48" height="48" viewBox="${GEAR_VIEWBOX}" aria-label="VMS"><path d="${GEAR_OUTLINE}" fill="#2563eb"/><circle r="${GEAR_RING_RADIUS}" fill="none" stroke="#fff" stroke-width="${GEAR_RING_WIDTH}"/></svg>`;
const names = ['English', 'Bisaya', 'Tagalog'];
const manifest = JSON.parse(await readFile(new URL('docs/manuals/screenshots/manifest.json', root), 'utf8'));
const captured = new Set(manifest.screenshots.map(({ name }) => name));
const preferred = { requests: 'proposal-form', issues: 'issue-form', approval: 'proposal-review', completion: 'repair-form', workflow: 'verification-form', schedule: 'schedule-form', 'files-location': 'vehicle-profile' };
for (const section of sections) if (preferred[section.id] && captured.has(preferred[section.id])) section.image = preferred[section.id];
for (const section of sections) {
  if (!captured.has(section.image)) throw new Error(`Missing real screenshot: ${section.image}`);
  for (const value of [section.title, section.intro, ...section.steps, ...(section.note ? [section.note] : [])]) {
    if (value.length !== 3 || value.some((entry) => !entry?.trim())) throw new Error(`Incomplete translation: ${section.id}`);
  }
}
const css = `@page{size:A4;margin:18mm 17mm 20mm}*{box-sizing:border-box}body{margin:0;color:#0f172a;font:11pt/1.6 Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}a{color:#1d4ed8;text-decoration:none}.page{break-before:page;min-height:242mm;position:relative}.cover{break-before:auto;background:linear-gradient(145deg,#eff6ff,#fff);padding:14mm 10mm;min-height:247mm;border-top:4mm solid #1d4ed8;display:flex;flex-direction:column}.brand{display:flex;align-items:center;gap:12px;color:#1d4ed8;font-size:26pt;font-weight:bold}.cover h1{font-size:38pt;line-height:1.12;letter-spacing:-1.5px;margin:26mm 0 7mm}.cover .subtitle{font-size:17pt;color:#475569}.edition{display:inline-block;background:#1d4ed8;color:white;padding:3mm 5mm;border-radius:2mm;margin-top:6mm;font-weight:bold}.roles{margin-top:22mm;padding-top:8mm;border-top:1px solid #bfdbfe;color:#334155}.version{margin-top:auto;font-size:10pt;color:#64748b}.eyebrow{color:#1d4ed8;font-weight:bold;font-size:9pt;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:4mm}h2{font-size:25pt;line-height:1.2;letter-spacing:-.5px;margin:0 0 8mm}h3{font-size:12pt;color:#1d4ed8;margin:8mm 0 3mm}p{margin:0 0 5mm}.intro{color:#475569}ol{padding-left:7mm;margin:0}li{padding-left:2mm;margin-bottom:4mm}li::marker{color:#1d4ed8;font-weight:bold}.note{background:#eff6ff;border-left:1mm solid #1d4ed8;padding:4mm 5mm;margin-top:7mm;font-size:10pt;break-inside:avoid}.note strong{display:block;color:#1d4ed8;margin-bottom:1mm}.toc{display:grid;gap:2.3mm}.toc a{display:flex;justify-content:space-between;gap:6mm;border-bottom:1px solid #e2e8f0;padding-bottom:1.5mm;font-size:10pt}.toc span:last-child{color:#64748b}.figure-page{padding-top:3mm}.figure-page img{width:100%;height:auto;border:1px solid #dbeafe;border-radius:2mm;margin:6mm 0}.caption{font-size:9pt;color:#64748b;border-top:1px solid #e2e8f0;padding-top:4mm}.diagram{display:flex;gap:2mm;margin:6mm 0;font-size:8pt;line-height:1.35}.diagram div{flex:1;background:#eff6ff;padding:3mm;border-radius:2mm;color:#1e3a8a;border:1px solid #bfdbfe}.diagram b{display:block;color:#1d4ed8;margin-bottom:2mm}.screen-info{color:#475569;font-size:10pt}.page-number-hint{font-size:9pt;color:#64748b}`;
const browser = await chromium.launch({ ...browserOptions, headless: true });
const generated = [];
try {
  for (let index = 0; index < languages.length; index++) {
    const tr = (value) => esc(value[index]);
    const tableCss = 'table{border-collapse:collapse;width:100%;margin:5mm 0;font-size:10pt;line-height:1.6}th,td{padding:4mm;border:1px solid #dbeafe;text-align:left;vertical-align:top}th{background:#eff6ff;color:#1d4ed8}td:first-child{width:32%;font-weight:bold}tr{break-inside:avoid}';
    const html = `<!doctype html><html lang="${languages[index]}"><head><meta charset="utf-8"><title>${tr(labels.title)}</title><style>${css}${tableCss}</style></head><body>
      <section class="cover"><div class="brand">${logo}<span>vms</span></div><h1>${tr(labels.title)}</h1><p class="subtitle">${tr(labels.subtitle)}</p><div><span class="edition">${esc(labels.edition[index])}</span></div><p class="roles">${tr(labels.roles)}</p><p class="version">${tr(labels.version)}<br>Barangay Vehicle Management System</p></section>
      <section class="page"><p class="eyebrow">VMS • ${esc(labels.edition[index])}</p><h2>${tr(labels.contents)}</h2><div class="toc">${sections.map((section, n) => `<a href="#${section.id}"><span>${String(n + 1).padStart(2, '0')} &nbsp; ${tr(section.title)}</span><span>→</span></a>`).join('')}</div></section>
      ${await Promise.all(sections.map(async (section, n) => {
        const image = (await readFile(new URL(`docs/manuals/screenshots/${section.image}.png`, root))).toString('base64');
        const diagram = section.diagram ? `<div class="diagram">${[t('Propose', 'Isugyot', 'Ihain'), t('Review', 'Susihon', 'Suriin'), t('Repair', 'Ayohon', 'Kumpunihin'), t('Verify', 'Tinoon', 'Beripikahin'), t('Readiness', 'Pagkaandam', 'Kahandaan')].map((label, i) => `<div><b>${i + 1}. ${tr(label)}</b>${['Custodian', 'Administrator', 'Maintenance Personnel', 'Custodian', 'Custodian'][i]}</div>`).join('')}</div>` : '';
        const procedure = section.id === 'reference' ? `<table><thead><tr><th>${tr(t('Role', 'Papel', 'Tungkulin'))}</th><th>${tr(t('Quick reference', 'Dali nga reperensiya', 'Mabilis na sanggunian'))}</th></tr></thead><tbody>${section.steps.slice(0, 3).map((step, i) => `<tr><td>${['Administrator', 'Custodian', 'Maintenance Personnel'][i]}</td><td>${tr(step).split(': ').slice(1).join(': ')}</td></tr>`).join('')}</tbody></table><p>${tr(section.steps[3])}</p>` : `<h3>${tr(labels.steps)}</h3><ol>${section.steps.map((step) => `<li>${tr(step)}</li>`).join('')}</ol>`;
        return `<section class="page" id="${section.id}"><p class="eyebrow">VMS • ${String(n + 1).padStart(2, '0')}</p><h2>${tr(section.title)}</h2><p class="intro">${tr(section.intro)}</p>${diagram}${procedure}${section.note ? `<aside class="note"><strong>${tr(labels.note)}</strong>${tr(section.note)}</aside>` : ''}</section>
          <section class="page figure-page"><p class="eyebrow">VMS • ${String(n + 1).padStart(2, '0')}</p><h2>${tr(section.title)}</h2><p class="screen-info">${tr(labels.screenshot)}</p><img alt="${tr(section.title)}" src="data:image/png;base64,${image}"><p class="caption">${n + 1}. ${tr(section.title)} — ${tr(labels.screenshot)}. ${tr(t('English labels on the screen match the controls named in the procedure. Example records and totals may differ from your barangay.', 'Ang English nga ngalan sa screen mao ang mga kontrol nga gihisgotan sa mga lakang. Mahimong lahi ang sample record ug ihap sa inyong barangay.', 'Ang mga English na pangalan sa screen ay ang mga kontrol na binanggit sa mga hakbang. Maaaring iba ang sample record at bilang sa inyong barangay.'))}</p><a href="#${section.id}">${tr(labels.steps)} ↑</a></section>`;
      })).then((pages) => pages.join(''))}
      </body></html>`;
    const htmlPath = new URL(`docs/manuals/${languages[index]}.html`, root);
    await writeFile(htmlPath, html);
    const page = await browser.newPage(); await page.goto(htmlPath.href); await page.evaluate(() => document.fonts.ready);
    const file = `VMS_User_Manual_${names[index]}.pdf`;
    await page.pdf({ path: fileURLToPath(new URL(file, destination)), format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, tagged: true, outline: true,
      headerTemplate: '<div style="font:8px Arial;color:#64748b;padding:0 17mm;width:100%">VMS · Barangay Vehicle Management System</div>',
      footerTemplate: `<div style="font:8px Arial;color:#64748b;padding:0 17mm;width:100%;display:flex;justify-content:space-between"><span>${esc(labels.edition[index])} · v1.0</span><span class="pageNumber"></span></div>` });
    await page.screenshot({ path: fileURLToPath(new URL(`docs/manuals/preview-${languages[index]}.png`, root)), fullPage: false });
    generated.push({ language: languages[index], file, chapters: sections.length, screenshotReferences: sections.length });
    await page.close();
  }
  await writeFile(new URL('docs/manuals/build-report.json', root), JSON.stringify({ generated, screenshotCapture: manifest.capturedAt }, null, 2));
  console.log(JSON.stringify(generated));
} finally { await browser.close(); }

function t(...values) { return values; }
