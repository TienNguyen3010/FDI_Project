# DESIGN_BASELINE_v1.3 — Approved visual direction, pending UX validation

## Source of truth
`design_reference_light_sidebar.png` is the visual reference supplied/approved by the user. This baseline changes presentation and navigation; it **does not** change backend domain semantics or authorize fabricated data. The sample screenshot displays January 2025, demo values and an example profile; these are **illustrative only**, never hardcoded production defaults.

## Desktop shell
- 1536px reference canvas; responsive at 1440, 1280, 1024, 768 and 390.
- Sidebar 280px expanded, 72px collapsed, fixed full viewport height; independent scroll when navigation overflows.
- White sidebar with subtly blue-tinted section panels, crisp 1px border, clear section heading, thin blue rule, navy icons, and selected item in strong blue with white icon/text.
- Topbar 60px: breadcrumb left, permission-scoped global search, notification bell, help, avatar. Profile bottom sidebar is sticky.
- Main canvas light cool gray-blue, cards white with soft border/shadow, 14px radius and consistent 8px spacing scale.
- Sidebar section ordering: Overview; Customers & Projects; Operations & Services; Documents & Reports; System. See `design/navigation.json`.

## Dashboard hierarchy
1. Title `Operations Dashboard` and context subtitle.
2. Time range + refresh control with `last_updated_at`; no invented auto-refresh.
3. Four KPI cards: Active Projects; Overall Progress; Open Tickets; SLA At Risk. Blue, green, orange, red semantic accents.
4. Two-column project progress (weighted, approved formula) and ticket status donut.
5. Priority incidents and seven-day ticket trend chart.
6. Quick actions: Create Ticket, Create Project, Add Asset, Schedule Maintenance, Quick Report; each permission-gated.
7. All cards support click-through to scoped, pre-filtered records and loading, empty, error, stale, forbidden states.

## Data semantics
- Active Projects: count authorized projects in approved active statuses.
- Overall Progress: aggregate weighted milestones; must specify denominator and exclude non-baselined projects from percent, reporting coverage.
- Open Tickets: scoped incidents/requests in nonterminal states, with explicit type filter.
- SLA At Risk: open SLA instances projected to breach based on approved calendar and threshold; distinguish already breached.
- Project progress: display project ID, name, percentage, `on_track/attention/delayed`, last refresh.
- Ticket donut: status buckets mutually exclusive and total reconciles to open tickets; P1 priority is separate from SLA status.
- Incident rows: priority, site, age, status; do not display real customer secrets to unauthorized roles.
- Ticket trend: counts by local date and explicit metric definition (created vs resolved), consistent date range.
- Delta badges only if prior comparison window exists; otherwise omit.

## Interactions and accessibility
- Sidebar keyboard accessible: tab, Enter/Space, aria-current, expanded state, focus ring, 44px targets.
- Search returns scoped results, empty/denied states; debounce and cancellation.
- Time filter persists in URL; updates every KPI and chart coherently.
- Card drilldown uses filter query params; preserve back navigation.
- Refresh updates server timestamp, shows loading and handles partial data failure.
- Status never conveyed by color alone. Charts have text equivalents and accessible tables.
- Mobile: sidebar becomes modal drawer, KPIs 2 columns or 1 column, charts stack, quick actions horizontally scroll or grid.

## Component inventory
AppShell, LightSidebar, SidebarSection, NavItem, SidebarBadge, Topbar, GlobalSearch, TimeRangeSelect, KPIGradientCard, ProjectProgressRow, StatusPill, TicketDonut, IncidentListRow, TicketTrendChart, QuickActionTile, NotificationMenu, UserMenu, LoadingSkeleton, EmptyState, ErrorState, PermissionDenied.

## Screen-level UX acceptance
UX-01 Dashboard; UX-02 Customer; UX-03 Project Portfolio; UX-04 Site/Infrastructure; UX-05 Asset; UX-06 Service Desk; UX-07 Maintenance; UX-08 Admin/RBAC. Shared shell and navigation apply to all. Only UX-01 is visually approved as a **direction**; detailed screens UX-02—08 remain design tasks, not automatically approved.

## Design QA
Visual parity against reference (sidebar light and grouped), contrast, keyboard, screen reader, responsive 390/768/1280/1536, scoped KPI reconciliation, permission denied states, long Vietnamese/English strings, 200% zoom, empty/error/loading/stale data.
