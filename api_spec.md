# 🔌 FDI_Project – API Specification

> Phiên bản 1.0 · Dành cho nhóm backend  
> Ngôn ngữ: Tiếng Việt / English · Không chứa code thực thi

---

## 1. Base URL

```
https://<domain>/api/v1
```

---

## 2. Authentication

### 2.1 Login

| Method | Path | Description |
|---|---|---|
| POST | /auth/login | Login & return JWT |
| POST | /auth/refresh | Refresh token |
| POST | /auth/logout | Logout |

### 2.2 Token Format

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in": 3600,
  "role": "manager",
  "scope": ["project:read", "project:write", "device:edit"]
}
```

### 2.3 Authorization Header

```
Authorization: Bearer <access_token>
```

---

## 3. Dashboard

| Method | Path | Description |
|---|---|---|
| GET | /dashboard/summary | Dashboard KPI (toàn cục) |
| GET | /dashboard/incidents | Open incidents |
| GET | /dashboard/maintenance | Maintenance today |
| GET | /dashboard/customer-health | Khách hàng & SLA |

---

## 4. Project

| Method | Path | Description |
|---|---|---|
| GET | /projects | List projects (filter: department, status, date) |
| GET | /projects/:id | Project detail |
| POST | /projects | Create project |
| PATCH | /projects/:id | Update project |
| DELETE | /projects/:id | Delete project |
| GET | /projects/:id/timeline | Milestone timeline |
| GET | /projects/:id/devices | Project devices |
| GET | /projects/:id/reports | Project reports |
| PATCH | /projects/:id/status | Change status |
| GET | /projects/:id/documents | Project documents |

---

## 5. Customer

| Method | Path | Description |
|---|---|---|
| GET | /customers | List customers (all, filter: type) |
| POST | /customers | Create customer |
| GET | /customers/:id | Customer detail |
| PATCH | /customers/:id | Update customer |
| GET | /customers/:id/sites | Customer sites |

---

## 6. Site

| Method | Path | Description |
|---|---|---|
| GET | /sites | List sites (all, filter: customer_id) |
| POST | /sites | Create site |
| GET | /sites/:id | Site detail |
| PATCH | /sites/:id | Update site |

---

## 7. Device

| Method | Path | Description |
|---|---|---|
| GET | /devices | List devices (filter: project_id, site_id, status) |
| GET | /devices/:id | Device detail |
| POST | /devices | Create device |
| PATCH | /devices/:id | Update device |
| GET | /devices/:id/reports | Device reports |
| PATCH | /devices/:id/status | Status |

---

## 8. Alert / Incident

| Method | Path | Description |
|---|---|---|
| GET | /alerts | List alerts (filter: severity, status, project_id) |
| POST | /alerts | Create alert |
| GET | /alerts/:id | Alert detail |
| PATCH | /alerts/:id | Update alert |
| GET | /alerts/:id/works | Alerts works |
| POST | /alerts/:id/acknowledge | Acknowledge |
| POST | /alerts/:id/resolve | Resolve |
| GET | /alerts/matrix | Alert matrix |
| PATCH | /alerts/:id/close | Close |

---

## 9. Maintenance

| Method | Path | Description |
|---|---|---|
| GET | /maintenance | List maintenance (filter: device_id, type, due_date) |
| POST | /maintenance | Create maintenance |
| GET | /maintenance/:id | Maintenance detail |
| PATCH | /maintenance/:id | Update maintenance |
| GET | /maintenance/:id/checklist | Checklist |
| POST | /maintenance/:id/complete | Complete |

---

## 10. Work

| Method | Path | Description |
|---|---|---|
| GET | /works | List works (filter: assignee_id, project_id, status) |
| POST | /works | Create work |
| GET | /works/:id | Work detail |
| PATCH | /works/:id | Update work |
| GET | /works/:id/history | Work history |
| PATCH | /works/:id/assign | Assign |

---

## 11. Report (Site Report)

| Method | Path | Description |
|---|---|---|
| GET | /reports | List reports (filter: project_id, user_id, date) |
| POST | /reports | Create report |
| GET | /reports/:id | Report detail |
| PATCH | /reports/:id | Update report |
| DELETE | /reports/:id | Delete report |
| GET | /reports/:id/photos | Report photos |
| POST | /reports/:id/photos | Upload photo |
| GET | /reports/:id/pdf | Export PDF |

---

## 12. Document

| Method | Path | Description |
|---|---|---|
| GET | /documents | List documents (filter: project_id, type) |
| POST | /documents | Create document |
| GET | /documents/:id | Document detail |
| PATCH | /documents/:id | Update document |
| GET | /documents/:id/file | Download file |
| GET | /documents/:id/preview | Preview |

---

## 13. Audit Log

| Method | Path | Description |
|---|---|---|
| GET | /audit-logs | List audit logs (filter: user_id, resource_type, resource_id, date) |
| GET | /audit-logs/:id | Log detail |

---

## 14. Config / Category

| Method | Path | Description |
|---|---|---|
| GET | /config | Global config (role, category, permission) |
| GET | /config/types | Config types |
| GET | /config/:id | Config detail |
| PATCH | /config/:id | Update config |

---

## 15. Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": {
      "field": "email",
      "reason": "Must be valid email"
    },
    "timestamp": "2026-11-17T12:00:00Z"
  }
}
```

### Error Codes

| Code | Meaning |
|---|---|
| VALIDATION_ERROR | Invalid input |
| UNAUTHORIZED | Missing/invalid token |
| FORBIDDEN | Insufficient role |
| NOT_FOUND | Resource not found |
| CONFLICT | Duplicate / conflict |
| RATE_LIMITED | Too many requests |
| STORAGE_ERROR | Upload failed |
| SYNC_ERROR | Offline sync failed |

---

## 16. Rate Limit

- 100 requests per minute per user
- Rate limit header: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## 17. Notes

- Pagination: `?page=1&limit=20`
- Sort: `?sort=created_at:desc`
- Filter: `?status=active&project_id=123`
- All timestamps in ISO 8601 (GMT+7)
- All timestamps in UTC internally, converted to GMT+7 in frontend
- Roles require scope in token

---
