# Weddinvita company landing page

The Indonesian marketing surface lives at `/company`. The public domain's root redirects there; guest invitation links retain their existing routes. It extends the existing forest-green, warm-white and Manrope brand recorded in `frontend/DESIGN.md`. The implementation is isolated in `frontend/company.html`, `company.css` and `company.js`, with its own Vite build entry. Existing CMS design documentation and sidecars remain authoritative for CMS screens.

The hero uses an HTML/CSS infographic explaining access rather than a mock invitation. It traces a personal link to a registered browser, then branches into returning guests (allowed) and forwarded links opened in a new browser (blocked after the quota is filled). Its caption explicitly identifies it as an access-flow illustration, not the invitation design. The former invitation mockup, artwork background and example-opening JavaScript have been removed from this page. The separate interactive lock demo still runs entirely in the browser, illustrates an already filled quota of one browser, displays an access-limited result and returns keyboard focus when reset.

Invitation Lock limits registered browsers, not verified recipient identities. With restrictions enabled, new browsers are rejected after the configured quota is full. A forwarded link can still consume a free slot before the intended guest registers. A new browser consumes another slot; replacing a link in the dashboard revokes the previous link and sessions. Avoid claims that forwarding is universally prevented. WhatsApp delivery remains manual. Self-service signup and Midtrans Snap QRIS checkout are available for Rp199.000 with 12 months of access; existing administrator-managed accounts retain their previous access.

## Brand extension

The marketing CSS repeats the established primary `#183d32`, hover `#102f26`, paper `#fafaf7`, ink `#22261f`, muted `#5c6257`, divider `#dfe2d8`, soft green `#e7f0eb` and success `#315b3e`. It loads the same local Manrope regular, semibold (declared weights 500–600) and bold files. Supporting olive and brass details remain marketing accents; they do not redefine CMS semantic colors.

Marketing typography adds these roles from the actual CSS:

| Role | Size and treatment |
| --- | --- |
| Hero | `clamp(42px, 4.3vw, 66px)`, weight 500, line height 1.14, tracking `-.04em`; 48px below 1100px, `clamp(38px, 8.6vw, 58px)` below 760px, 68px from 1600px |
| Section heading | `clamp(29px, 3vw, 42px)`, weight 500, line height 1.25, tracking `-.035em`; 30px below 760px |
| Feature title | 17px, weight 600, tracking `-.02em`; feature-list titles become 16px below 760px |
| Introductory body | 16px, line height 1.9, maximum width 490px; 14px with line height 1.85 below 760px |
| Supporting copy | Generally 14px with line height 1.9; labels and helper text use 12px |

The page uses open sections and borders rather than a dashboard grid. The main container is capped at 1280px with 56px desktop side insets, reducing to 32px below 1100px and 20px below 760px. Paired content columns collapse below 760px. Primary buttons have an 8px radius and 52px minimum height; the access infographic and lock demonstration use 12px corners. Green action fills, explicit text statuses and visible focus maintain the incumbent visual vocabulary. The infographic is static; reduced-motion preferences disable smooth scrolling.

## Local development and verification

From the repository root, start the frontend:

```sh
npm run dev:frontend
```

Open the printed Vite origin followed by `/company`. The page needs no backend. Locally, `/company/dashboard` serves the existing admin entry; using the CMS requires its normal backend and account setup.

Build the frontend with:

```sh
npm run build --prefix frontend
```

Run the UI check against the actual Vite port, with Playwright resolvable from the user's installed environment and Google Chrome installed:

```sh
NODE_PATH=/absolute/path/to/node_modules COMPANY_URL=http://127.0.0.1:5173/company node tests/company-ui.cjs
```

Replace the example `NODE_PATH` and port with the local values. The script uses `require('playwright')` and Chromium's `chrome` channel; it does not add a project dependency. Its default URL uses port 5180 if `COMPANY_URL` is omitted.

The implementation review passed at 1440, 768, 390 and 320px, and the frontend production build passed. The UI check covers overflow, infographic content and absence of the old invitation preview, lock/reset behavior and focus return, FAQ expansion, section targets, local dashboard response and browser errors. It writes full-page screenshots to `.impeccable/review/desktop.png` and `.impeccable/review/mobile.png`. This is local browser evidence, not a live production, physical-device, screen-reader or complete accessibility-audit claim.

## Delivery and routing

Vite rewrites `/company` and `/company/` to `company.html` during development and builds the page as a separate entry. The frontend container's `frontend/Caddyfile` serves the built company document and redirects its dashboard link to `/admin` within that frontend service.

The host configuration in `deploy/Caddyfile` gives `{$COMPANY_DOMAIN:weddinvita.id}` its own company host. Its exact `/` redirects to `/company` (302); `/company`, `/company/`, `/company.html` and `/assets/*` go to the frontend. `/company/dashboard` redirects to `https://{$CMS_DOMAIN}/`; unrelated paths return 404. The invitation subdomain also serves `/company`, but retains its existing root and guest invitation routes. The CMS domain's root still serves the dashboard.

On 27 October 2026 the VPS host configuration was updated and reloaded, preserving existing domains and aliases. Backup: `/etc/caddy/Caddyfile.before-company-20261027`. Caddy validation passed and the existing dashboard and invitation health checks returned HTTP 200 afterward. The frontend image still needs a later deployment to include the company page; changing host routing alone does not deploy frontend source. Public access also requires DNS and a valid TLS certificate for `weddinvita.id`.
