# ⚙️ FDI Project Management – Tech Specification

> Phiên bản 1.0 · Dành cho group devops & backend  
> Ngôn ngữ: Tiếng Việt / English · Không chứa code thực thi

---

## 1. Overview

| Tiêu chí | Mô tả |
|---|---|
| Tên dự án | FDI Project Management |
| Sản phẩm | Website quản lý dự án, sự cố, vận hành, site report |
| Lĩnh vực | CNTT, VoIP, Viễn thông, Network Infrastructure |
| Người dùng | Internal team, admin, manager, leader, engineer |
| Mô hình phát hành | SaaS / Subscription |
| Nền tảng | Web (desktop + mobile) |
| Ngôn ngữ | Tiếng Việt (primary) |

---

## 2. Architecture (High Level)

```
[Web Client] → [API Gateway / App Server] → [PostgreSQL] → [Object Storage]
       ↑                                      |
[Mobile Client] ──────────────────────────────┤
       ↑                                      |
[External Webhook / Monitoring] ──────────────┘
```

### 2.1 Components

| Component | Technology |
|---|---|
| Frontend | React / Next.js / Vue |
| Backend | Node.js / Python / Go |
| Database | PostgreSQL / Supabase |
| Object Storage | AWS S3 / Supabase Storage |
| Auth | JWT, refresh token, RBAC |
| CI/CD | GitHub Actions |
| Monitoring | Sentry, Firebase Analytics, log |
| Notification | Email, Zalo, Group, Telegram (on-demand) |

---

## 3. Environment

| Env | Purpose |
|---|---|
| Development | Local dev |
| Staging | Pre-release, QA |
| Production | Live |
| Backup | Daily, restore test |

---

## 4. Security

| Item | Policy |
|---|---|
| Auth | JWT, role check, refresh token |
| RBAC | Hard: role, soft: UI/filter |
| Data | Encrypt sensitive fields, exclude NDA data |
| Storage | Limit file size, validate type |
| Rate limit | Per user per hour |
| Audit | Logs all actions |

---

## 5. Database

| Item | Spec |
|---|---|
| Engine | PostgreSQL |
| Migration | Schema + seed |
| Backup | Daily |
| Restore | Tested |
| Index | project, serial, status, date |

---

## 6. API Design

| Method | Path | Description |
|---|---|---|
| GET | /api/dashboard/summary | Dashboard KPI |
| GET | /api/projects | List projects |
| GET | /api/projects/:id | Project detail |
| POST | /api/projects | Create project |
| PATCH | /api/projects/:id | Update project |
| GET | /api/devices | List devices |
| POST | /api/devices | Create device |
| GET | /api/alerts | List alerts |
| POST | /api/alerts | Create alert |
| GET | /api/maintenance | List maintenance |
| POST | /api/maintenance | Create maintenance |
| GET | /api/works | List works |
| POST | /api/works | Create work |
| GET | /api/reports | List reports |
| POST | /api/reports | Create report |
| GET | /api/documents | List documents |
| POST | /api/documents | Upload document |
| GET | /api/audit-logs | Audit log |

---

## 7. Validation & Constraints

| Field | Rule |
|---|---|
| serial | Unique within project |
| device | Has project_id, site_id |
| alert | Has severity, priority, status |
| work | Has assignee, due_date, project |
| report | Has project, photo, progress |
| audit | Has user, action, resource |

---

## 8. Deployment

| Step | Action |
|---|---|
| Build | CI/CD pipeline |
| Test | Unit, integration, e2e |
| Stage | Deploy to staging |
| Prod | Deploy to production |
| Monitor | Sentry, logs, alerts |

---

## 9. Maintenance

| Task | Frequency |
|---|---|
| Backup | Daily |
| Restore test | Weekly |
| Patch dependencies | As needed |
| Security review | Monthly |
| Log rotation | Daily/Cleanup weekly |

---

## 10. Monitoring & Alerting

| Metric | Alert |
|---|---|
| API error rate | High > 5% |
| DB connection | > 80% |
| Storage usage | > 80% |
| Latency | > 2s |
| Downstream sync | Fail 3x |

---

## 11. Notes

- This spec is for architecture overview, not for direct implementation
- Use best practices: version control, testing, CI/CD, monitoring

---
