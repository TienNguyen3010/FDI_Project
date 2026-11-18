# UI Design Baseline v1.4 — APPROVED REFERENCE

**Source of truth:** `design_reference_approved_v1.4.png` (the latest optimized dashboard image approved by the user). This supersedes v1.3 visual guidance where inconsistent. This is a **design baseline, not proof of a running system**.

## Pixel-composition lock
- Preserve the reference desktop layout and relative placement. White left sidebar (~280px) with green logo and icons, pale-green Dashboard active item, green section headings, grouped navigation and bottom user profile.
- Header: breadcrumb left; scoped search, notifications, help, avatar right.
- Main title `Operations Dashboard`; subtitle; scope selector, month selector and refresh control.
- Four gradient cards in one desktop row: 24 Active Projects (blue), 86% Overall Progress (green), 12 Open Tickets (orange), 03 At-risk SLA (red). **These figures are illustrative only.** Do not hardcode them.
- Immediately below KPI row: slim last-updated / effective-scope information bar.
- Next row: Project Progress (left) and Ticket Status donut (right).
- Next row: Priority Incidents (left) and Ticket Trend 7 days (right).
- Bottom row: Quick Actions with 5 tiles, original icon colors: Create Ticket, Create Project, Add Device, Schedule Maintenance, Quick Report.
- Do not change arrangement, card order, layout proportions or KPI gradient families without new design approval.

## Semantic corrections already reflected in reference
- Ticket donut has three **mutually exclusive workflow buckets**: `in_progress`, `waiting`, `new`. SLA risk is never a donut bucket. Denominator = total open tickets in same authorized scope, period and type filter. Buckets must sum to the open-ticket total or expose an explicit `other` bucket.
- Red KPI `Sắp vi phạm SLA` counts only at-risk **open** SLA instances; already-breached SLA is a distinct supplementary count (e.g. `01 Đã vi phạm`), not part of the at-risk numerator.
- `86%` progress is a weighted aggregation of baselined deliverables, not a simple average of project percentages. If the required baseline/weight data is incomplete, show `Chưa đủ dữ liệu`, never a fabricated percentage.
- Project row shows name, project code, PM, deadline, actual percentage and status. Status is derived from approved baseline/forecast, **not percentage alone**.
- Priority incident row shows incident, site, engineer, priority, SLA remaining time and workflow status. Countdown is computed from authoritative server deadline; stale data must be indicated.
- Ticket trend explicitly labels metric (`Ticket tạo mới`) and time window (`7 ngày`) and uses same scope/date rules.
- Comparison deltas (+4, +6%, -3) are only displayed when an equivalent prior window exists and the formula is documented.

## Interactive contracts
- Scope selector changes all cards, lists and charts atomically; backend authorization always applies even if selector says `Toàn hệ thống`.
- Date range changes all period-dependent metrics; stock measures (e.g. open tickets) are computed **as of** period end and labelled accordingly.
- Refresh shows request state, source `as_of` timestamp and partial failure state.
- KPI and charts drill down to filtered, authorized lists. Click an incident opens scoped incident detail.
- Project progress `Theo dự án` / `Theo giai đoạn` toggle changes dataset while preserving panel placement.
- Ticket trend metric selector changes `created` / `resolved` / `open_end_of_day` with accurate axis and tooltip.
- Quick actions are permission-gated and must open actual forms/workflows; do not render inert controls.
- Empty/loading/error/403/stale states must preserve geometry and show understandable text.
- Responsive: same information hierarchy, sidebar drawer on small screens; at desktop 1536px reference remains unchanged.

## Accessibility and design tokens
- Green icons and selected navigation must have readable text contrast; 44px target size, visible keyboard focus, `aria-current=page`, chart accessible data table, no color-only status.
- Tokens: `design/tokens.json`; navigation source: `design/navigation.json`. Color approximations require screenshot visual QA, not claim of exact pixel sampling.
- Real date/time, names and counts in screenshot are demo values. No personal names or avatar are required production fixtures.

## Review state
**Approved:** layout and visual direction. **Not approved:** production metrics, backend readiness, responsive Figma screens, accessibility audit, and executable integration tests.
