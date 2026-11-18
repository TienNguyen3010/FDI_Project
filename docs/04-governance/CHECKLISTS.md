> **v1.0 NOTE (2026-11-18):** This section is authoritative where UI descriptions conflict. Source: approved dashboard baseline. See `DESIGN_BASELINE.md`.

### Dashboard alignment (approved baseline)
P0 dashboard checklist: approved reference parity; sidebar green and grouped; KPI semantics; ticket donut reconciliation; SLA risk/breach disjoint; project baseline; scope filtering; timestamp; click-through; loading/error/empty; 390px responsive; 200% zoom.

---

# Operational Checklists
## Site survey
- [ ] Customer/site identity and authorized contacts verified
- [ ] Floor plan, room/rack, power/UPS and environmental constraints documented
- [ ] WAN/LAN, IP plan, VLAN, DHCP, DNS, QoS, firewall and SIP dependencies recorded
- [ ] Device quantities, models, mounting and cable routes confirmed
- [ ] Site risks, access window and evidence/photos captured
- [ ] Survey approved by PM/customer representative as applicable
## Installation
- [ ] Approved design and change window available
- [ ] Asset ID/serial/model matched to shipment
- [ ] Rack/U/room/coordinates or floor anchor recorded
- [ ] Cabling, labels, power, grounding and network ports verified
- [ ] Configuration baseline stored securely; no passwords in notes
- [ ] Test results, photos and engineer sign-off submitted
## VoIP acceptance
- [ ] Registration of phones/gateways verified
- [ ] Inbound/outbound/local/international routing per scope tested
- [ ] Audio both ways, DTMF, transfer, hold and voicemail tested
- [ ] SIP trunk failover and network recovery tested where contracted
- [ ] Recording/retention/access policy tested where contracted
- [ ] As-built topology, IP plan, serial list and handover accepted
## Preventive maintenance
- [ ] Contract coverage and maintenance window verified
- [ ] Health checks, logs, backup state and storage reviewed
- [ ] Firmware/software updates assessed via change process
- [ ] Issues/tickets and recommendations recorded
- [ ] Evidence and customer acknowledgement captured
## Release readiness
- [ ] PRD acceptance tests pass
- [ ] Cross-customer RBAC negative tests pass
- [ ] Restore drill passes; rollback tested
- [ ] Monitoring, alerting and on-call documented
- [ ] API compatibility and migration verified
- [ ] UAT sign-off and support handover complete

## Baseline assumptions and boundaries
- One operating company, multiple customers and sites; **not SaaS multi-tenant**.
- Customer portal is optional and isolated by customer scope; no direct device administration from portal.
- On-premises or private-cloud deployment; English identifiers, Vietnamese UI labels supported.
- P0 includes project delivery, assets, site, tickets, basic maintenance, reports, email and RBAC; advanced topology editor, telemetry and bidirectional Zalo are later phases.
- All dates persisted UTC with timezone-aware presentation; all important mutations audited.
- Architecture decisions require stakeholder sign-off before production.

---

# Structured checklist model
Each template item: `item_id`, `revision`, `required`, `answer_type`, `validation`, `evidence_required`, `role_required`, `condition`, `help_text`. Each execution answer: actor/time/value/evidence/review decision; preserve historical template revision.

**Survey:** customer/site contact; floor plan revision; network uplink; power/UPS; rack capacity; cable routes; IP/VLAN plan; VoIP call path; photos; risks. **Installation:** asset code+serial; MAC; site/location/rack U; firmware; config backup reference (no secret); labeling; cable/port; photos; tester; timestamp. **VoIP SAT:** inbound/outbound/local/international where allowed; extension registration; SIP trunk failover; call recording and retrieval; emergency routing where applicable; QoS/jitter/packet loss; CDR; user signoff. **Maintenance:** service window approval; pre-check backup; hardware inspection; logs/alarms; call test; change record; rollback readiness; before/after evidence; customer signoff.

**Reject completion** when mandatory item unanswered, evidence missing, reviewer is same actor where separation-of-duties required, or linked site/asset not authorized.

---
## Visual baseline alignment (2026-11-18)
UI release checklist: verify sidebar section order, active route, collapsed mode, overflow, 44px targets, WCAG contrast, scoped search, no stale values disguised as live, chart accessibility, responsive and error states.
