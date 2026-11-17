# FDI_Project — UI/UX Product Specification v2.0 (Proposed)

**Status:** Draft for product/engineering review  
**Audience:** Product Owner, UX/UI, Frontend, Backend, QA, DevOps  
**Source:** `ui_ux_spec.md` v1.0 (2026-11-17)  
**Language:** Vietnamese primary; English optional  
**Scope:** Dashboard, Project, Customer, Site, Alert, Operation, Site Report, Administration.

> This document preserves the v1 module scope and existing dark palette. Items marked **[PROPOSAL]** are recommendations requiring Product Owner approval, not confirmed business rules.

## 1. Product objectives and boundaries

### 1.1 Goals
- Consistent navigation and behavior across modules.
- Fast discovery of project/site status and operational issues.
- Traceable creation, review and resolution workflows.
- Usable desktop, tablet and mobile interfaces.
- Accessible and testable components with documented acceptance criteria.

### 1.2 Non-goals / decisions pending
- Native mobile application: not specified.
- Offline-first data editing: not confirmed; v1 only mentions an offline sync indicator.
- External customer portal, billing, inventory ownership: not specified.
- Approval hierarchy, alert SLA, and final role matrix: must be confirmed with business stakeholders.

## 2. Information architecture

| Module | Primary views | Key tasks | Decisions needed |
|---|---|---|---|
| Dashboard | Overview, filters, KPI panels | Identify at-risk projects/sites and open work | KPI formulas and freshness |
| Project | List, detail, overview, progress, devices, documents | Create/edit project, review progress, create incident/report | Lifecycle and ownership |
| Customer | List, detail | Maintain customer information, linked projects | Duplicate detection, field schema |
| Site | List, detail | Track site status and assigned project | Location and site identifier rules |
| Alert | Inbox, detail | Acknowledge, assign, resolve, close | Severity, escalation, SLA |
| Operation | Work queue, task detail | Coordinate operational tasks | Assignment and handover policy |
| Site Report | List, create/edit, review | Draft, attach photos, submit | Approval/revision workflow |
| Administration | Users, roles, settings | Manage access and reference data | Permission model |

**[PROPOSAL]** Use one consistent detail page shell: title + status + contextual actions + tabs + activity timeline. Keep primary actions visible; destructive actions require confirmation.

## 3. Personas and permissions

**[PROPOSAL — validate with Product Owner]** Initial roles: Administrator, Project Manager, Operations Engineer, Site Reporter, Read-only Viewer. Roles are illustrative, not existing confirmed roles.

Define a permission matrix per entity and action: `view`, `create`, `edit`, `submit`, `approve`, `assign`, `close`, `delete`, `export`, `administer`.

- Backend authorization is mandatory; hiding UI buttons is not security.
- All list/detail/API queries must respect tenant/project/site scope if multi-tenancy is introduced.
- UI must distinguish hidden action, disabled action, and forbidden action.
- Record actor, timestamp, entity, action, and changed fields for critical actions; specify retention separately.

**Release gate:** Product Owner signs off the role-action matrix before implementation of restricted workflows.

## 4. Design tokens

### 4.1 Existing dark palette retained

| Semantic token | Dark value | Usage |
|---|---|---|
| `color.surface.page` | `#0f172a` | Page background |
| `color.surface.panel` | `#1e293b` | Sidebar/panel |
| `color.surface.card` | `#263244` | Cards |
| `color.text.primary` | `#f8fafc` | Main text |
| `color.text.secondary` | `#94a3b8` | Secondary text |
| `color.action.primary` | `#3b82f6` | Main CTA |
| `color.action.primaryHover` | `#2563eb` | CTA hover |
| `color.feedback.error` | `#ef4444` | Error feedback |
| `color.feedback.warning` | `#f59e0b` | Warning |
| `color.feedback.success` | `#22c55e` | Success |
| `color.border.default` | `#334155` | Borders |

**[PROPOSAL]** Define separate light theme semantic values before advertising a functional theme toggle. Do not simply invert colors. Verify contrast for every text/background pairing; status cannot be conveyed by color alone.

### 4.2 Typography and spacing
- Font: Inter; fallback system sans. Monospace: JetBrains Mono/Fira Code.
- Existing typography scale: 12, 14, 16, 18, 20, 24 px. Use semantic styles `caption`, `body-sm`, `body`, `heading-sm`, `heading-md`, `heading-lg`.
- Existing spacing scale: 4, 8, 16, 24, 32, 48 px. Prefer semantic names rather than misleading numeric token suffixes.
- Existing radii: 4, 6, 8 px; full radius for pills/circles.
- Define focus ring, disabled opacity, overlay elevation, icon sizing, touch target, and motion tokens.
- **[PROPOSAL]** Minimum interactive target 44×44 CSS px where practical; exceptions documented.

## 5. Component contract

Every reusable component must specify: purpose, variants, props, events, accessibility, states, validation, responsive behavior, and test coverage.

| Component | Required states / behavior |
|---|---|
| Button | default, hover, focus-visible, pressed, disabled, loading; prevent duplicate submit |
| Input / Textarea | label, hint, required, invalid, read-only, disabled; inline error association |
| Select / Combobox | keyboard navigation, search, clear, empty results, async loading |
| Checkbox / Radio / Switch | checked/unchecked/indeterminate where relevant; accessible names |
| Badge | status text + optional icon; never color-only |
| Table | loading, empty, error, sorting, filtering, paging, selection, responsive overflow |
| Modal / Drawer | focus trap, Escape behavior, restore focus, unsaved-change guard |
| Toast / Banner | actionable errors, duration policy, screen-reader announcements |
| File upload | type/size checks, progress, retry, failure, remove, permission |
| Date/time | timezone policy, formatting, validation, accessible controls |

**[PROPOSAL]** Use a centralized component catalog (e.g., Storybook) with visual regression and interaction tests. Technology choice remains open.

## 6. Navigation and responsive behavior

- Mobile: under 768 px; tablet: 768–1024 px; desktop: above 1024 px (retain v1 thresholds; verify at boundary widths).
- Desktop: persistent sidebar, page header, breadcrumb where hierarchy exceeds one level, main content, contextual action area.
- Tablet: collapsible sidebar/drawer; tables support horizontal scroll or priority columns.
- Mobile: compact header and task-focused navigation. **[PROPOSAL]** Bottom navigation shows only the most frequent 3–5 destinations; other modules use an overflow menu. Do not assume every admin page belongs in bottom navigation.
- Do not place primary content below a bottom navigation element in document flow; nav should be visually anchored at screen bottom with appropriate safe-area spacing.
- Use explicit back behavior and preserve list filters when returning from detail.
- Test widths: 360, 390, 768, 1024, 1280, 1440 CSS px; zoom 200% and keyboard-only flows.

## 7. Module workflows and exception paths

### 7.1 Authentication
`Login → Validate → Authorized landing page`

Exceptions: invalid credentials, expired session, insufficient permission, rate limit, server error. Never expose whether a specific username exists. Specify SSO/MFA requirements separately.

### 7.2 Project
`Project list → Detail → Overview / Progress / Devices / Documents → Contextual action`

- List: search, filter by status/customer/owner (field availability to confirm), sort, paging.
- Detail: entity ID, status, owner, dates, linked sites, recent activity.
- Edit: field-level validation, unsaved changes confirmation, conflict handling.
- Incident/report creation: only show permitted actions; success includes destination link.

### 7.3 Site Report
`Select project/site → Complete fields → Attach photos → Save draft → Submit`

**[PROPOSAL]** State machine: `Draft → Submitted → Approved` or `Submitted → Changes requested → Draft`; transitions and approvers require confirmation.

- Saving draft and submitting are distinct actions.
- Required fields checked on submit; draft may allow partial data.
- Attachment upload must report progress, error and retry.
- If offline editing is approved, define local storage security, queueing, sync conflict policy and data loss warnings; otherwise display network-unavailable state without claiming offline sync.

### 7.4 Alerts
Original flow: `Received → Acknowledged → Assigned → Resolved → Closed`.

**[PROPOSAL]** Add optional `Reopened` and `Escalated` transitions only after business confirmation. Specify allowed actors, mandatory resolution notes, severity rules, SLA start/pause/stop and notification events.

### 7.5 Dashboard
- Define each KPI with owner, numerator/denominator, filters, time window, refresh cadence, timezone and drill-down destination.
- Every chart must have a clear title, units, date range and empty/error states.
- Do not display zero when data is unavailable; use an explicit unavailable state.

### 7.6 Customer, Site, Operation and Administration
Each module requires a detailed screen inventory, field dictionary, CRUD permissions, validation rules, empty/error states and acceptance criteria before development. These details are not supplied by v1 and must not be invented as finalized requirements.

## 8. Data interaction standards

- **[PROPOSAL]** Prefer server-side pagination/filtering/sorting for large datasets; agree API query conventions with Backend.
- Use stable identifiers for links and rows; avoid relying on array position.
- Persist applicable list state in URL (page, sort, filters), excluding sensitive data.
- Distinguish initial load, refresh, stale data, empty result, no permission, and server failure.
- Handle optimistic updates only where safe; otherwise confirm after server response.
- Display timestamps consistently; store canonical times in UTC and format in the user's configured timezone **[PROPOSAL]**.
- Specify concurrency handling for simultaneous edits (version conflict / ETag or equivalent).

## 9. Accessibility and localization

**[PROPOSAL]** Target WCAG 2.2 AA for core workflows.

- Full keyboard navigation; visible focus indicator; semantic labels and headings.
- Screen-reader announcement for form errors, alerts and async status changes.
- Contrast checks for body text, muted text, icons, badges and disabled controls where applicable.
- Do not rely on color alone to convey status.
- Vietnamese is the default language. Externalize strings, avoid hardcoded labels, support long text and consistent date/number formatting.
- English support is optional until confirmed; maintain translation keys if bilingual UI is planned.

## 10. Security, privacy and audit

- Enforce authorization on server for every protected operation.
- Avoid storing access tokens in unsafe browser storage; align with the approved authentication architecture.
- Mask or limit personal data in list views, exports and logs as required by policy.
- Confirm upload constraints, file scanning, signed URL access and retention with Security/Backend.
- Confirm audit events for assignment, approval, closure, deletion and permission changes.
- Session expiration must preserve unsaved work only when it can be done securely.

## 11. Nonfunctional targets — proposals, not commitments

| Area | Proposed acceptance target | Validation method |
|---|---|---|
| Accessibility | WCAG 2.2 AA core workflows | Automated + manual keyboard/screen reader |
| Responsiveness | No unintended horizontal page overflow at test widths | Browser/device matrix |
| Core Web Vitals | LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at p75 for applicable production pages | RUM / field metrics |
| Reliability | Recoverable API errors show retry and context | Integration tests |
| Localization | No hardcoded end-user strings in reusable components | Lint/review |
| Security | Forbidden actions blocked at API even if UI is manipulated | Permission integration tests |

Performance targets require agreement on environment, network and user population.

## 12. QA test matrix and sample acceptance criteria

### Global matrix
- Responsive: 360/390/768/1024/1280/1440 px.
- Browsers: current supported Chrome, Edge, Firefox, Safari (confirm versions).
- States: default, loading, empty, partial data, API error, forbidden, session expired.
- Inputs: valid, invalid, boundary, duplicate submission, interrupted network.
- Accessibility: keyboard, zoom, contrast, labels, focus restoration.

### Example acceptance criteria

**AC-01: Submit Site Report**
- Given a user with submit permission and a valid draft,
- When they select Submit,
- Then the UI prevents duplicate submission, shows progress, and displays a confirmed result only after the API succeeds.
- If the API fails, the report remains recoverable and the user sees an actionable error.

**AC-02: Restricted action**
- Given a user without permission to close an alert,
- When they open the alert detail,
- Then the close action is unavailable according to UX policy; direct API attempts are denied.

**AC-03: List filters**
- Given a filtered project list,
- When a user opens a project and navigates back,
- Then the prior filters, sort and page are restored.

**AC-04: Mobile navigation**
- Given a 390 px viewport,
- When the user opens any core module,
- Then primary navigation remains reachable and page content does not overlap it.

## 13. Delivery artifacts and engineering governance

Required artifacts before a module enters development:
1. Approved user stories and business rules.
2. Screen inventory and Figma designs including all UI states.
3. Component specifications and design tokens.
4. API contract and data dictionary.
5. Permission matrix and audit requirements.
6. Acceptance criteria and QA cases.

**Definition of Ready:** workflow approved, fields/permissions known, designs cover error/empty/loading, dependencies identified, API agreement recorded.

**Definition of Done:** implementation reviewed, automated tests pass, accessibility checked, permission enforcement verified, responsive QA completed, telemetry/error handling in place, Product Owner accepts.

## 14. Priority roadmap

| Priority | Workstream | Outcome |
|---|---|---|
| P0 | Confirm roles, workflows, entity states, data schema | Eliminate ambiguous business behavior |
| P0 | Auth/permissions, error handling, accessible core components | Safe and consistent foundation |
| P0 | Project, Site Report, Alert critical paths | End-to-end usable flows |
| P1 | Dashboard KPI definitions, tables, responsive detail views | Operational efficiency |
| P1 | Component catalog, visual regression, telemetry | Maintainability |
| P2 | Light theme, bilingual expansion, advanced offline support | Optional enhancements after validation |

## 15. Open questions / decision log

| ID | Question | Owner | Status |
|---|---|---|---|
| D-01 | Which roles exist, and which actions can each role perform? | Product Owner | Open |
| D-02 | What are final Project, Site Report and Alert states/transitions? | Product Owner / Operations | Open |
| D-03 | Is mobile offline editing truly required? | Product Owner | Open |
| D-04 | Is Light theme in the first release? | Product Owner / Design | Open |
| D-05 | What are dashboard KPI definitions and refresh intervals? | Product Owner / Data | Open |
| D-06 | Are there multi-tenant/customer-specific access boundaries? | Architecture / Security | Open |
| D-07 | Which frontend framework/component library is already used? | Frontend Lead | Open |
| D-08 | What are attachment size/type/retention rules? | Backend / Security | Open |
| D-09 | What are supported browsers, devices and release performance budgets? | Engineering / QA | Open |

---

**Change summary from v1:** Retains the original eight modules and baseline tokens; adds role/permission governance, component behavior contracts, exception flows, data handling, accessibility targets, QA acceptance criteria, release gates and decision tracking. Proposed business behavior is explicitly distinguished from confirmed requirements.
