# VMS multilingual manual center

The English, Cebuano and Filipino editions use one reviewed procedure structure in `scripts/manuals/content.mjs`. Every instructional paragraph has three translations; actual English UI labels remain unchanged. There are 23 chapters covering all three operational roles. Each chapter links to a real screenshot page. The shipped PDFs are A4, tagged, have page numbers, use the actual `vmsGear.js` logo, and include a clickable contents page.

## Sources and current workflow limits

The implementation was checked against `frontend-spa/src/views/Workspace.jsx`, `backend-api/config/permissions.php`, the ticket and fleet controllers, normal authenticated local browser sessions, and `VMS Docs/System-Capabilities.md`. Where the older reference disagrees, current permissions/UI/controllers take precedence:

- Standalone Request Custodian Inspection is disabled; Condition Monitoring remains.
- Maintenance Personnel have no standalone Issue Reports menu in the current single-role sidebar. The API ability is not presented as a reachable menu.
- Custodian proposal → Admin approval/assignment → repair → independent whole-ticket Custodian verification/closure → fresh readiness check.
- No self-service password reset or live GPS tracking is claimed.
- First-Admin approval/code email is distinct from later staff registration.

The translations were checked for equivalent chapter/step coverage and role/safety meaning. A native-speaker editorial review by the barangay is advisable before a new formal release, especially when system terminology changes.

## Rebuild

Use documentation tooling outside the runtime app: Node.js, Playwright with Chromium, and Python/PyMuPDF for PDF inspection. No frontend or Laravel production dependency was added. If Playwright is not locally resolvable, set `VMS_PLAYWRIGHT_MODULE` to the installed Playwright package. If necessary set `VMS_CHROMIUM_PATH` to the Chromium executable.

1. Run a **local demo** backend and frontend. Never point capture tooling at production or private tenant data.
2. Set `VMS_MANUAL_ACCOUNTS_JSON` to an object with `admin`, `custodian`, and `maintenance`, each containing the authorized demo `email` and `password`. Obtain these locally; do not commit credentials. The current screenshot procedure expects the existing seeded sample fleet/ticket IDs. It opens forms but does not submit fleet mutations.
3. Run `node scripts/manuals/capture.mjs`. Screenshots are organized by role-prefixed filenames and routes in `docs/manuals/screenshots/manifest.json`; shared task screens use descriptive names. Review them for private data before publishing.
4. Run `node scripts/manuals/generate.mjs`. This creates the three PDFs in `backend-api/public/manuals/` and regenerable HTML previews in `docs/manuals/`.
5. Run `python scripts/manuals/inspect-pdfs.py` with PyMuPDF installed. It opens every PDF, checks all pages and A4 size, detects clipped text, verifies role text/images/links, and renders sample pages for visual inspection.
6. Run `node scripts/manuals/verify-browser.mjs` against the local frontend. It checks downloaded file bytes, filenames, language mapping, modal focus/close, six theme/viewport combinations, and JavaScript exceptions. Set `VMS_TEST_EMAIL` only when authorized to send three actual test messages. SMTP acceptance is recorded; inbox placement is not asserted.
7. Run `php artisan test tests/Feature/UserManualTest.php` in `backend-api`, and frontend lint/build.

## Deployment and email

Deploy **both** the frontend build and backend, including all three files under `backend-api/public/manuals/`. Downloads use an allowlisted Laravel download route; PDFs are not regenerated on click. `config/manuals.php` is the canonical server filename/size/version catalog. Keep frontend edition labels and version in sync when releasing a new manual.

Reuse the existing environment-based mail configuration. Set an actual external mailer such as SMTP and configure its environment credentials privately. The default development `log` transport does not deliver mail and is rejected by the email endpoint. No credential changes are needed for a working configured SMTP service. Delivery is synchronous so the UI reports acceptance only after the configured mail service returns successfully. It does not guarantee inbox placement. A queue worker is not required.

Email is public and protected by encrypted, expiring arithmetic challenges, one-use nonces, three requests per IP per 15 minutes, three per recipient per hour, and a global 30/hour cap. Challenge/download limits use separate named buckets. The arithmetic challenge is basic friction rather than a bot-proof CAPTCHA; add a provider-backed CAPTCHA at deployment if abuse warrants it. Use a shared persistent cache in a multi-instance deployment so limits/nonces are shared. Recipient limiter keys are hashed; email failures log only exception class. Attachments are limited to 15 MB. Requests accept language codes only, never paths.

## Verification artifacts

- `screenshots/manifest.json`: actual capture routes, dimensions, and browser exceptions.
- `build-report.json`: editions and chapter/screenshot counts.
- `pdf-verification.json`: page-level PDF structure checks.
- `browser-verification.json`: downloads, UI behavior, responsive checks, SMTP acceptance when enabled.
- `smtp-verification.json`: the successful three-language live email run, with the tested PDF hashes and no recipient information.

Verification for this implementation: full backend suite **640 tests / 5,948 assertions** passed before the final additional expiry test; the final manual-specific suite **10 tests / 71 assertions** passed. The frontend component lint and production build passed. Browser checks passed at 1440, 768 and 390 pixels in light/dark mode with no JavaScript exceptions, including PDF byte comparisons, language mapping, Escape/Cancel/backdrop close and keyboard focus. Each final PDF has **48 A4 pages**, **23 screenshot pages**, and **46 internal links**; every page opened and text-bound checks found no clipping. Representative rendered pages were visually inspected. All three live SMTP submissions were accepted by the configured service; mailbox placement was not inspected.

The manuals contain only local demonstration records. No credentials are printed in the PDFs. Original screenshots are documentation assets, not production database snapshots.
