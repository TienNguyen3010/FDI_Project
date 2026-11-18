# UAT scenarios v1.2

## UAT-001 — REQ-001
Given a user with appropriate scope, verify the Customer/Site flow against `customers,sites` and the corresponding tables `customers,sites`. Repeat with a cross-customer identity and expect access denied; verify audit, idempotency and concurrency behavior where mutations occur.

## UAT-002 — REQ-002
Given a user with appropriate scope, verify the Project Detail flow against `projects,tasks` and the corresponding tables `projects,project_tasks,milestones,acceptance_records`. Repeat with a cross-customer identity and expect access denied; verify audit, idempotency and concurrency behavior where mutations occur.

## UAT-003 — REQ-003
Given a user with appropriate scope, verify the Asset Detail flow against `assets` and the corresponding tables `assets,asset_placements,asset_installations,asset_replacements`. Repeat with a cross-customer identity and expect access denied; verify audit, idempotency and concurrency behavior where mutations occur.

## UAT-004 — REQ-004
Given a user with appropriate scope, verify the Infrastructure flow against `diagrams` and the corresponding tables `diagrams,diagram_versions,diagram_nodes`. Repeat with a cross-customer identity and expect access denied; verify audit, idempotency and concurrency behavior where mutations occur.

## UAT-005 — REQ-005
Given a user with appropriate scope, verify the Service Desk flow against `tickets` and the corresponding tables `tickets,ticket_events,ticket_assignments,ticket_sla`. Repeat with a cross-customer identity and expect access denied; verify audit, idempotency and concurrency behavior where mutations occur.

## UAT-006 — REQ-006
Given a user with appropriate scope, verify the Maintenance flow against `maintenance/work-orders` and the corresponding tables `maintenance_plans,work_orders,checklist_answers`. Repeat with a cross-customer identity and expect access denied; verify audit, idempotency and concurrency behavior where mutations occur.

## UAT-007 — REQ-007
Given a user with appropriate scope, verify the Contract Detail flow against `tickets` and the corresponding tables `contracts,contract_coverage,sla_policies`. Repeat with a cross-customer identity and expect access denied; verify audit, idempotency and concurrency behavior where mutations occur.

## UAT-008 — REQ-008
Given a user with appropriate scope, verify the Dashboard flow against `reports` and the corresponding tables `projects,tickets,work_orders`. Repeat with a cross-customer identity and expect access denied; verify audit, idempotency and concurrency behavior where mutations occur.

## UAT-009 — REQ-009
Given a user with appropriate scope, verify the Notification Center flow against `tickets` and the corresponding tables `outbox_events,notification_deliveries`. Repeat with a cross-customer identity and expect access denied; verify audit, idempotency and concurrency behavior where mutations occur.

## UAT-010 — REQ-010
Given a user with appropriate scope, verify the Admin RBAC flow against `admin/users` and the corresponding tables `roles,permissions,role_permissions,access_grants,audit_events`. Repeat with a cross-customer identity and expect access denied; verify audit, idempotency and concurrency behavior where mutations occur.

**Gate:** These are scenario outlines, not executed tests. Product owner must add concrete fixtures, expected payloads and signatures.
