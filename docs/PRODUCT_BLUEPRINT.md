## Project Blueprint — AI‑Powered Pharmacy Inventory & Billing System (Supabase + PWA)

Status: v1.0 (light theme, Tailwind, Inter). This is our durable source of truth for scope, design, and delivery. Keep it updated as we progress.

---

## 1) Product goals and guardrails
- Primary outcomes
  - Reduce expired stock and stockouts; improve billing speed; simplify audits.
- Non‑goals (for MVP)
  - Full ERP/accounting, complex purchase contracts, multi‑company consolidations.
- Guiding principles
  - Offline-first for sales; batch‑level inventory; explainable AI; auditability; privacy by design.

---

## 2) Core decisions (locked for MVP)
- Frontend: Next.js (App Router) + TypeScript; PWA with Tailwind CSS.
- Data fetching/state: TanStack Query for server cache; minimal local state only.
- Font: Inter (400/500/600/700, tabular-nums). Fallback: system-ui, Segoe UI, Roboto.
- Theme: Light only for MVP; dark later.
- Backend: Supabase (Postgres, Auth, RLS, Storage, Realtime, Edge Functions, scheduled jobs).
- Charts: Recharts for MVP (simple, responsive; swappable later).
- Icons: Heroicons (Tailwind-friendly, outline/solid sets).
- Repo: single repo with apps/web, supabase, docs.
- Analytics: Rule‑based first; then simple ML (moving average, EOQ, Prophet optional) as a separate job/service.
- Payments: Start manual reconciliation; add M‑Pesa STK + webhook in Phase 2.
- Messaging: Start with email; add WhatsApp/SMS later.

---

## 3) Visual language (UI kit)
- Layout
  - 12‑column responsive grid; container max‑width 1140–1200px.
  - Split screen: left auth card (~40%), right preview/content (~60%).
- Background (signature look)
  - Soft corner radial glows on a pale base:
    - Radial glow TL: lavender (#9763FF, 35% → transparent 60%).
    - Radial glow BR: pink‑violet (#C142FF, 30% → transparent 55%).
    - Base: very‑light gradient (#FBF7FF → #F4F6FF).
- Cards
  - Radius: 12px (cards), 16px (outer frame container).
  - Border: 1px solid #E9EEF5; background: subtle top‑to‑bottom tint (#FAFBFF → #FFFFFF).
  - Shadow: small (0 1px 2px rgba(16,24,40,.06)); hover lift +2px (150–200ms ease).
- Color tokens (Tailwind theme extensions)
  - Primary: blue.600 #3E63F2; blue.700 #3356E6; gradient: #4F6DFF → #3B5BFE.
  - Accent: purple.500 #9B6BFF; magenta.500 #C142FF (sparingly).
  - Neutral text: slate.900 #0F172A; slate.700 #334155; slate.500 #64748B.
  - Surfaces: gray.50 #F8FAFC; gray.100 #F1F5F9; gray.200 #E2E8F0; gray.300 #CBD5E1.
  - Feedback: success #16A34A; warning #F59E0B; danger #EF4444; info #0EA5E9.
- Typography
  - Inter; sizes: 12, 14, 16, 18, 24, 28, 32; line‑heights 1.3–1.6.

---

## 3.1) Wireframe notes (low‑fi, no code)
- Sign‑in split page
  - Left: auth card (logo, email, password, Sign In, forgot link); social buttons optional.
  - Right: dashboard preview area with 2 small metric cards on top and one large line chart card below.
- Dashboard
  - Top row: 2–3 mini KPI cards; 1 small bar chart; 1 top‑selling list card.
  - Second row: 1 large revenue vs expense chart card; expiry/low‑stock alert list.
- POS
  - Left: product search/scan and results; Right: cart with line items, totals, payment action row.
  - Sticky footer actions (Save/Charge/Print). Clear keyboard shortcuts (Enter to add, +/- qty).


  - Heading weight 600/700; body 400/500; numeric UI uses tabular‑nums.
- Spacing scale (px)
  - 4, 8, 12, 16, 24, 32, 40, 48, 64.
- Focus & accessibility
  - Focus ring 2px #9DB2FF outside shadow; color contrast ≥ 4.5:1 for text.

---

## 4) Component library (to build)
- Foundations
  - AppShell (gradient background + white framed container + grid).
  - Card, CardHeader, CardBody, CardFooter.
  - Button: primary/secondary/ghost/destructive; sizes sm/md/lg.
  - Form: Input, PasswordInput (with show toggle), Select, Checkbox, Radio, Textarea.
  - Toast/Inline Alert, Modal/Drawer, Tabs, Tooltip.
  - Data: Badge, Pill, ProgressBar, Avatar.
  - Charts (wrapper around a library) for mini bars and line charts.
- Patterns
  - Toolbar with actions/search/filters.
  - Table with sticky header, pagination, CSV export.
  - Empty states and skeleton loaders.

Acceptance criteria
- Consistent spacing and radii; keyboard accessible; screen reader labels; responsive down to 360px.

---

## 5) Screens & flows (MVP)
- Auth
  - Sign In (email/password) + magic link optional; Forgot Password.
  - Sign Up (owner) + invite users (cashier/pharmacist).
- Dashboard
  - KPI minis + small bar chart + line chart; top selling list; expiry/low‑stock alerts.
- POS / Billing
  - Search/scan SKU; cart with line items; quantity and price edits (role‑gated); select payment type; print receipt.
- Inventory
  - Products list (SKU, name, form, unit); Batches (batch_no, expiry_date, qty_available, supplier, cost).
  - Stock movements (purchase, sale, adjustment) and manual corrections (role‑gated, audited).
- Suppliers
  - Supplier directory; basic PO creation (PDF/email) in Phase 2.
- Reports
  - Daily sales; stock on hand; low stock; expiry list; export CSV/PDF.
- Settings
  - Pharmacy profile, tax, thresholds, printers, integrations (M‑Pesa/WhatsApp placeholders).

Screen routing (suggested)
- /auth/sign-in, /auth/forgot
- /dashboard
- /pos
- /inventory/products, /inventory/batches, /inventory/movements
- /suppliers
- /reports
- /settings

---

## 6) Data model (high-level)
- users (Supabase Auth) + profiles (id, pharmacy_id, role, name, phone)
- pharmacies (id, name, address, timezone)
- products (id, pharmacy_id, sku, generic_name, brand, form, unit, barcode, sell_price, tax_code, active)
- batches (id, product_id, batch_no, expiry_date, qty_received, qty_available, supplier_id, cost_price)
- suppliers (id, pharmacy_id, name, contact, lead_time_days, min_order)
- sales (id, invoice_no, date, cashier_id, payment_type, total, pharmacy_id, status)
- sale_items (id, sale_id, product_id, batch_id, qty, unit_price, discount)
- payments (id, sale_id, method, amount, txn_ref, status)
- purchases (id, po_no, date, supplier_id, status, totals)
- purchase_items (id, purchase_id, product_id, batch_no, expiry_date, qty, cost_price)
- stock_movements (id, pharmacy_id, type, ref_id, product_id, batch_id, qty, reason, created_by, created_at)
- alerts (id, pharmacy_id, type, entity_id, severity, message, status, created_at)
- audit_logs (id, pharmacy_id, user_id, action, entity, entity_id, details, created_at)
- settings (pharmacy_id, key, value)
- analytics_cache (id, pharmacy_id, product_id, batch_id?, metric, value, meta, as_of)
- tills (id, pharmacy_id, opened_by, opened_at, closed_at, float)
- returns (id, sale_item_id, qty, reason, processed_by, processed_at)
- stock_counts (id, pharmacy_id, started_at, completed_at, counted_by, notes)

Relational notes
- Enforce FK constraints; quantities derived from stock_movements; batches FEFO for allocation.

---

## 7) Security & RBAC (Supabase RLS plan)
- Roles: owner_admin, pharmacist_manager, cashier, supplier_view (future), auditor_view.
- RLS strategy
  - All tables scoped by pharmacy_id from JWT claims.
  - Read permissions according to role; write limited to necessary tables/actions.
  - Security definer functions for sensitive mutations (price change, stock adjustments, batch allocation).
- Auditability
  - Append‑only audit_logs; capture user_id, action, previous→new values where relevant.
- PII/Compliance (Kenya DPA)
  - Collect minimal personal data; enable account deletion/export; breach response playbook.

---

## 8) Offline‑first & sync strategy (sales only in MVP)
- Local data: IndexedDB store for queued sales (cart items, payment, timestamp, device_id, temporary_id).
- Sync contract
  - On reconnection, client pushes queued sales; server allocates batches FEFO atomically and returns mapping.
  - Conflicts: if insufficient stock, server returns partial/failed items; client surfaces resolution UI (adjust quantity/refund/hold).
- Idempotency
  - Temporary IDs with deterministic composite key (device_id + local_counter + timestamp) to avoid duplicates.
- Read caches
  - Cache product catalog (read‑only) for offline lookup; invalidate on app start and periodically.

---

## 9) AI & analytics (Phase 2+)
- Expiry‑risk alerts
  - Inputs: batch expiry_date, qty_available, trailing sales velocity.
  - Logic: days‑to‑sell vs days‑to‑expiry; flag if predicted leftover > 0; prioritize by value.
- Reorder suggestions
  - Inputs: historical sales per SKU, supplier lead time, safety stock.
  - Output: reorder point and recommended qty (EOQ‑style with min_order).
- Anomaly detection (Phase 3)
  - Outlier patterns: voids, discounts, shrinkage; isolation forest + rules.
- Ops
  - Nightly jobs write outputs to analytics_cache and alerts; dashboard reads cached values.

---

## 10) Integrations
- Payments (M‑Pesa)
  - Phase 1: manual entry and reconciliation by txn_ref.
  - Phase 2: Daraja STK Push + webhook → update payments.status; link to sale.
- Messaging
  - Phase 1: email POs; Phase 2: WhatsApp Business API templates (supplier opt‑in).
- Printing & Scanning
  - Receipts: browser print with 58/80mm CSS; camera or USB barcode scanner (keyboard wedge).

---

## 11) Testing & QA
- Unit tests: inventory allocation (FEFO), stock_movements consistency, pricing/discount rules.
- Integration: sale lifecycle (cart → payment → allocate → receipt → audit log).
- E2E: sign in, POS happy path, offline sale then sync, export reports.
- Analytics: backtests with MAE/RMSE; threshold sanity checks.
- Performance: low‑end devices, large catalogs (≥10k SKUs), many batches per product.

---

## 12) CI/CD & monitoring
- CI
  - Lint, typecheck, unit/integration tests on PR; preview deploy for frontend.
- CD
  - Frontend to Vercel/Netlify; backend functions/jobs via Supabase CLI or serverless platform.
- Monitoring
  - Sentry (frontend); Supabase logs/alerts; job success metrics; uptime pings.
- Backups
  - Nightly DB backups to S3/Supabase storage, 30–90 day retention; periodic restore drills.

---

## 13) Definition of Done (by area)
- UI component: responsive, accessible, documented examples.
- Screen: UX reviewed, empty/error/loading states, analytics events, tests included.
- Backend feature: RLS policies, audit logs, migration tested, rollback plan.
- Offline flow: simulated offline test, conflict cases handled.
- Docs: README update + this blueprint updated; release notes.

---

## 14) Project to‑do boards (checklists)

### A) Design tokens & UI kit
- [ ] Finalize color tokens and gradients
- [ ] Confirm typography (Inter + tabular nums usage)
- [ ] Define spacing, radii, shadows in Tailwind theme
- [ ] Card, Button, Input, Select, Checkbox, Radio, Textarea
- [ ] Toast/Alert, Modal, Tabs, Tooltip
- [ ] Chart wrappers and mini‑stat patterns

### B) Screens (MVP)
- [ ] Auth: Sign In, Forgot Password; Owner Sign Up; Invite flow
- [ ] Dashboard: KPI minis, small bar card, line chart card, top‑selling list
- [ ] POS: search/scan, cart, edit qty/price (role), payments, receipt
- [ ] Inventory: Products table; Batch table; Stock movements; Adjustments
- [ ] Suppliers: list + details (no portal)
- [ ] Reports: daily sales, stock on hand, low stock, expiry list; CSV/PDF export
- [ ] Settings: pharmacy profile, tax, thresholds, printers, integrations

### C) Supabase setup
- [ ] Create project and environments (dev/staging/prod)
- [ ] Configure Auth providers and email templates
- [ ] Create schema and FKs (tables listed above)
- [ ] Seed minimal reference data (tax, demo products)
- [ ] Define RLS policies per role and table
- [ ] Security definer functions for sensitive ops
- [ ] Triggers: maintain qty_available from stock_movements
- [ ] Audit log function and policies
- [ ] Schedules: nightly backup/export; analytics jobs

### D) Offline & sync
- [ ] IndexedDB store and outbox queue design
- [ ] Idempotency keys and retry strategy
- [ ] Server allocation endpoint (FEFO) contract
- [ ] Conflict resolution UI and error taxonomy
- [ ] Sync progress UI and telemetry

### E) Analytics
- [ ] Define expiry‑risk heuristic and thresholds
- [ ] Define reorder point/safety stock policy
- [ ] Backtest procedure and reporting
- [ ] Write results to analytics_cache and alerts

### F) Integrations
- [ ] Email (POs, alerts)
- [ ] M‑Pesa sandbox spike (Phase 2)
- [ ] WhatsApp Business API feasibility and template prep (Phase 2)
- [ ] Print templates 58/80mm

### 15.1) Week 0–2 implementation plan (no coding yet)
- Week 0 (Kickoff)
  - Lock stack: Next.js + TS + Tailwind, Recharts, Heroicons, Supabase. [Done]
  - Confirm repo shape (apps/web, supabase, docs) and environments (dev/stage/prod).
  - Finalize UI inspiration and sign-off on light theme only for MVP. [Done]
- Week 1 (Design + Data)
  - Finalize design tokens (colors, radii, shadows, spacing, typography usage) in this doc; provide example screenshots later.
  - Low‑fi wireframes: Sign‑in, Dashboard, POS — annotate interactions/keyboard shortcuts.
  - Draft Supabase schema (DDL plan) and RLS policy outline in docs/supabase/SCHEMA_PLAN.md (doc only).
  - Define offline sync contract and error taxonomy; list conflict scenarios.
  - Print/scanning spec: receipt sizes, printers to support, barcode scanner behaviors.
- Week 2 (Scaffolding plan + Pilot prep)
  - Define scaffolding commands and Tailwind config plan (no execution yet).
  - Testing plan: unit/integration/E2E matrix; choose test libs.
  - Pilot outreach checklist; gather device/printer details; agree success metrics.
  - Review & sign-off gate to start coding.


### G) QA & Ops
- [ ] Testing matrix (browsers/devices)
- [ ] CI pipelines for lint/test/build
- [ ] Monitoring & alerting
- [ ] Backup/restore drill
- [ ] Pilot runbook (install, training, support)

---

## 15) Milestones & gates
- Milestone 1 (Weeks 0–2): tokens + wireframes + schema draft + repo plan
  - Gate: reviewed UI kit and data model; 1–3 pilot pharmacies confirmed; repo structure agreed.
- Milestone 2 (Weeks 3–10): MVP build
  - Gate: POS offline sale → sync works end‑to‑end; core reports; print receipts.
- Milestone 3 (Weeks 11–14): Pilot + hardening
  - Gate: pilot metrics captured; critical bugs < P1 threshold.
- Milestone 4 (Weeks 15–22): AI + ordering + payments
  - Gate: expiry/reorder running nightly; STK push in sandbox; PO emails.

---

## 16) Risks & mitigations
- Offline/stock conflicts → Restrict offline edits to sales; FEFO allocation server‑side; clear conflict UI.
- Printer compatibility → CSS templates + fallback PDF; optional local bridge later.
- Payment complexity → Manual first; automate later with webhooks.
- AI trust → Show reason codes; allow human override; track accuracy.
- Data migration → CSV import templates; guided onboarding.

---

## 17) Open questions (to resolve before coding)
- Exact tax rules per county? Standard VAT vs exemptions.
- Do we need prescription capture in MVP?
- Barcode sources: will we generate internal SKUs for missing barcodes?
- Minimum device profile for cashier stations?
- Pilot pharmacy constraints (existing printers/scanners, internet reliability)?

---

## 18) Working agreements
- Keep scope creep out of MVP; additions require updating this document.
- Every PR updates relevant docs and checklists.
- Accessibility is non‑negotiable; test with keyboard‑only flows.

---

## 19) How to evolve this blueprint
- Use the checklists above as our running plan.
- Add decisions and rationale in change log below.

Change log
- v1.1 — Stack decisions finalized (Next.js + TS + Tailwind, Recharts, Heroicons, repo layout). Added Week 0–2 plan and wireframe scope.
- v1.0 — Initial blueprint (Tailwind + Inter + light theme, UI inspired by split layout with glowing gradient, card grid).

