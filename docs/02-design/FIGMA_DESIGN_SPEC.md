> **v1.4 OVERRIDE (2026-11-18):** This section supersedes earlier UI-specific descriptions when they conflict. See `DESIGN_BASELINE_v1.4.md`.

### v1.4 dashboard alignment
v1.4 design must match approved green sidebar screenshot. Existing Figma v1.2 screens do NOT yet match and must be updated separately. All design tokens in assets/tokens.json; no automatic claim of live Figma sync.

---

# Figma Design Handoff Specification
**This is a Figma-ready design blueprint, not a live Figma file.**
## File pages
00 Cover & Principles; 01 Foundations; 02 Components; 03 Navigation; 04 Dashboard; 05 Customers/Sites; 06 Projects/Gantt; 07 Infrastructure/Assets; 08 Tickets; 09 Maintenance; 10 Reports; 11 Admin/RBAC; 12 Engineer Mobile; 13 Prototypes & Handoff.
## Frames
Desktop 1440x900; laptop 1280x800; tablet 768x1024; mobile 390x844. 8px spacing scale; sidebar 248px expanded/72px collapsed; header 56px; content gutter 24px desktop/16px mobile.
## Tokens (proposal)
Primary #1D4ED8; Accent #0F766E; Canvas #F8FAFC; Surface #FFFFFF; Text #0F172A; Muted #64748B; Border #E2E8F0; Danger #B91C1C; Warning #B45309; Success #15803D. Contrast verify against WCAG AA; semantic tokens, not hardcoded component colors.
Typography: Inter or system sans, 12/14/16 body, 20/24/30 headings; 4/8/12/16/24/32 spacing. Radius 6/10/14. Icons Lucide consistent 16/20.
## Component library
AppShell, SidebarItem, Breadcrumb, SearchBox, FilterBar, KPI Card, StatusChip, DataTable, DetailDrawer, Timeline, SLAClock, AssigneePicker, ChecklistItem, EvidenceUploader, ApprovalPanel, QRScannerEntry, AssetInspector, DiagramNode, DiagramLink, RackUnit, DocumentVersionPicker, Toast, EmptyState, PermissionDenied.
## Variants and states
Default/hover/focus/selected/disabled/loading/error/empty; priority P1-P4; ticket lifecycle; asset lifecycle; SLA healthy/at-risk/breached; dark mode optional later.
## Prototype journeys
1) Director KPI -> at-risk project -> milestone evidence; 2) Engineer task -> scan asset -> install -> submit; 3) Support alert -> incident -> SLA -> resolution; 4) PM acceptance -> document version -> approve; 5) Customer portal -> scoped ticket status.
## Handoff checklist
Every frame names route, permission, query source, loading/empty/error states, validation, responsive behavior and accessibility. Annotate components with API endpoint and event behavior. Design review by PM, field engineer, support, security and developer.

## Baseline assumptions and boundaries
- One operating company, multiple customers and sites; **not SaaS multi-tenant**.
- Customer portal is optional and isolated by customer scope; no direct device administration from portal.
- On-premises or private-cloud deployment; English identifiers, Vietnamese UI labels supported.
- P0 includes project delivery, assets, site, tickets, basic maintenance, reports, email and RBAC; advanced topology editor, telemetry and bidirectional Zalo are later phases.
- All dates persisted UTC with timezone-aware presentation; all important mutations audited.
- Architecture decisions require stakeholder sign-off before production.


---

# v1.1 Figma handoff acceptance (not a native Figma file)
**Pages:** 00 Foundations, 01 Components, 02 Desktop Screens, 03 Mobile Screens, 04 Prototypes, 05 Handoff.
**Tokens:** spacing 4/8/12/16/24/32; radii 6/10/14; semantic colors primary, success, warning, danger, neutral; typography 12/14/16/20/24/32; contrast target WCAG AA. Avoid using color alone for ticket severity.
**Component variants:** Sidebar expanded/collapsed; DataTable loading/empty/error/selected; KPI default/stale; StatusBadge; FilterBar; Drawer; Timeline; AssetMarker; RackUnit; ApprovalPanel; SLAClock active/paused/breached; ChecklistItem; QRScanPrompt; NotificationToast.
**Prototype journeys:** Project→Site→Asset→Ticket; Survey→Install→Acceptance; Ticket→Assignment→Resolution; WorkOrder→Evidence→Approval; RBAC denied access. Annotate each frame with UX-ID, REQ-ID, endpoint and permission. Produce 1440px desktop and 390px mobile frames with Auto Layout and responsive constraints.
**Important:** No actual editable Figma file has been created in this package; this is the implementation handoff specification.


---
## v1.3 Visual baseline alignment (2026-11-18)
Visual direction v1.4 (green sidebar, approved) supersedes v1.3: white sidebar, grouped pale-blue sections, navy outline icons, blue selected nav, white content cards, colored KPI accents. See `DESIGN_BASELINE_v1.4.md` and `assets/tokens.json`. Prior Figma screens must be visually revised; do not claim they already match.


## v1.5 implementation evidence
See `../05-quality/INTEGRATION_STATUS_v1_5.md` for executable reference, verified tests and remaining production blockers. No production acceptance implied.
