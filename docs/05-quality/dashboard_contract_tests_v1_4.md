# Dashboard Contract & Security Test Matrix v1.4

| ID | Setup | Assertion |
|---|---|---|
| CT-01 | 6 in progress, 3 waiting, 3 new | Donut total=12, Open Tickets=12 |
| CT-02 | Ticket in progress and SLA at risk | Appears once in in_progress bucket and once in separate SLA risk metric |
| CT-03 | SLA deadline already passed | Counted as breached, NOT at risk |
| CT-04 | Project 80% done but baseline expected 95% | Health computed from baseline, not automatically on-track |
| CT-05 | Project missing baseline weights | Progress null with data_quality=insufficient_baseline |
| CT-06 | User assigned to Customer A only | Dashboard and drilldowns reveal zero data about Customer B |
| CT-07 | User requests `scope=all` without all permission | Deny or intersect to effective grants; no global totals |
| CT-08 | Date range changed | All widgets use coherent as_of and period semantics |
| CT-09 | Missing prior comparison window | Delta null/hidden, never +0% placeholder |
| CT-10 | User lacks project.create | Quick action hidden/disabled and POST project returns 403 |
| CT-11 | Endpoint stale | Display source as_of, stale label and retry behavior |
| CT-12 | Mobile 390px and 200% zoom | No clipped controls; sidebar drawer and readable charts |

These are **test specifications, not executed test results**.
