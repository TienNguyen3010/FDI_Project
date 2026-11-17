# DD_DECISIONS_P0 — Quyết định Dev Director cho 8 mâu thuẫn P0

> Người chốt: **Dev Director** · Ngày: 2026-11-17 · Commit tham chiếu: `c599f51`
> Phạm vi: C-01, C-02, C-03, C-04, C-05, C-06, C-07, C-09, C-12 trong `CONTRADICTIONS_V2.md`.
>
> **Nguyên tắc chốt** (theo `README.md §3` evidence hierarchy):
> `runtime verification @ SHA > test log > code inspection @ SHA > spec > release-note assertion`.
> Khi spec v2 mâu thuẫn migration/code **đã chạy thật**, lấy migration/code làm nguồn truth và **sửa spec cho khớp**.
> Không tự động đổi schema đã apply; mọi thay đổi DB phải có migration mới + PO/Tech DRI ký.
>
> Artifact này là **lớp override** — 11 file v2 giữ nguyên làm baseline đã duyệt. Khi đọc v2, đọc kèm file này.

---

## Bảng quyết định

| ID | Chủ đề | Quyết định DD | Căn cứ evidence | Hành động code/spec | Trạng thái |
|---|---|---|---|---|---|
| **C-01** | Taxonomy vai trò (4 business vs 5 UI persona) | **Canonical = 4 business roles: Employee/Leader/Manager/Director.** 5 tên trong `ui_ux_spec §3` (Administrator, Project Manager, Operations Engineer, Site Reporter, Read-only Viewer) là **persona/alias UI**, KHÔNG phải role hệ thống. | `migrations/001:26` CHECK role 4 giá trị; `lib/types.ts` union 4; `lib/hooks/useProfile.ts` ROLES 4; `rbac_matrix §2`, `product §1`, `USER_GUIDE §4` đều 4. | Giữ code. Sửa `ui_ux_spec.md §3` thêm cột "Alias/persona → role canonical"; đóng D-01 của file đó. | ✅ Chốt (DD) |
| **C-02** | tech_spec dùng Admin/Manager/Leader/Engineer | **Đồng bộ về 4 tên canonical.** "Admin"/"Engineer" trong `tech_spec §5` đổi thành Director/Employee; "System administrator" là **privilege kỹ thuật riêng**, không phải business role. | Cùng C-01; `tech_spec.md §5` tự ghi "requires PO sign-off", mọi ô TBD → chưa có giá trị cần bảo vệ. | Sửa bảng `tech_spec.md §5` về 4 tên; giữ cột riêng "system_admin (technical)". | ✅ Chốt (DD) |
| **C-03** | Quyền Admin / `system_admin` | **Manager (hạn chế) + Director** được vào Admin, như đã chốt 2026-11-17. Ranh giới Manager: `user:read/update` + `role:read` trong **department/team mình**; KHÔNG được: nâng role mình, cấp Director, đổi role người khác department, xem audit toàn cục. Director = full Admin. `system_admin` tách bạch, **không suy từ hierarchy**, chỉ cấp explicit + audit. | `checklist.md §12` dòng chốt; `proxy.ts:133-142` guard `/admin` manager+director; `app/api/admin/roles/route.ts` kiểm tra role. RLS/API enforce là lớp cuối. | Đóng `rbac_matrix §10` blocker #3, `PRD_OWNERSHIP` DEC-02 theo hướng này. `RELEASE_NOTES` gate "admin escalation tests" vẫn giữ. | ✅ Chốt (DD) |
| **C-04** | Project–Site cardinality | **Giữ N:1** — `projects.site_id` FK → `sites`, `sites.customer_id` FK → `customers`. KHÔNG tạo `project_sites` trong phase này. Lý do: migration 001 đã apply DB thật, code/UI 7 module đã dùng N:1, đổi N:M đòi migration + data migration + UI/API/RLS retest — vượt phạm vi chốt nhanh. | `migrations/001:58` (`sites.customer_id`), `:77` (`projects.site_id FK ON DELETE SET NULL`); build/CRUD chạy thật tại `c599f51`. | Sửa `product.md §5` dòng 59 N:M → N:1; ghi DEC-03 = "deferred to v3, requires migration". Không đụng DB. | ✅ Chốt (DD) — **PO được quyền mở lại** nếu business bắt buộc N:M |
| **C-05** | Device serial uniqueness | **Giữ rule migration đã chạy**: `UNIQUE (project_id, serial)` + `UNIQUE (mac_address)` toàn cục. `normalized_serial` là **khái niệm đề xuất, chưa có cột** → ghi là backlog, KHÔNG đổi spec thành đã có. Một thiết bị di chuyển project → cân nhắc ở migration 006 sau khi có fixture test. | `migrations/001:122-123`; `product.md FR-03` và `tech_spec §4` chỉ là proposal. | Sửa `product.md FR-03` + `tech_spec §4` + AC `DEV-AC-01` cho khớp rule thực tế; DEC-04 ghi "normalized serial = backlog". | ✅ Chốt (DD) |
| **C-06** | Alert vs Incident | **Giữ MỘT entity `alerts`** trong phase hiện tại. `incidents` là **bảng đề xuất tương lai** (DEC-05 = deferred). `works.incident_id` tiếp tục trỏ `alerts(id)` — đúng code/migration. Timeline/SLA được render từ `alerts` qua `IncidentLifecycle`, không cần bảng riêng để chạy Bản 2. | `migrations/001:130` chỉ có `alerts`; `:191-193` `works.incident_id → alerts(id)`; `components/incident/IncidentLifecycle.tsx` đọc alert. | Sửa `product.md §5/§6 FR-05`, `tech_spec §2`, `USER_GUIDE §5`, `DESIGN_WIREFRAMES §9`: ghi "Incident = trạng thái xử lý của Alert, không phải entity riêng (v1)". | ✅ Chốt (DD) — mở lại khi PO duyệt tách entity + migration |
| **C-07** | SLA 15p/1h vs 4h/8h/24h | **Chốt 4h/8h/24h** cho Critical/Major/Minor (giá trị đang chạy), đo từ `created_at` đến `resolved_at` hoặc `now()`. Ghi rõ đây là **default nội bộ, không phải số hợp đồng**; nếu khách có SLA riêng → cấu hình/quyết định sau, không hardcode mới vào code lúc này. | `components/incident/IncidentLifecycle.tsx:38,108,274,286`; `migrations/005:28-32` (source, chưa execute); `product.md FR-05` tự ghi "illustrative only". | Sửa `product.md FR-05` thay 15p/1h bằng 4/8/24 + note "internal default"; migration 005 giữ nguyên khi execute. Cập nhật AC `ALT-AC-04`. | ✅ Chốt (DD) — **Ops Manager được quyền đổi theo hợp đồng** |
| **C-09** | `/api/v1` vs `/api/auth/*` | **Chốt `/api/v1` là contract chuẩn, hiện thực bằng alias/reverse-proxy ở tầng entry (proxy.ts rewrite), KHÔNG đổi thư mục route handlers.** Route nội bộ giữ `/api/auth/*`, `/api/reports/*`; public map `/api/v1/auth/*`, `/api/v1/reports/*`. Lý do: giữ nguyên code đã test, vẫn đúng api_spec/tech_spec/checklist. | `tech_spec §7`, `api_spec §1`, `checklist §12` đã chốt `/api/v1`; code `app/api/auth/*`, `fetch('/api/auth/session')`; EVIDENCE_REGISTER E-11 CONFLICT. | Implement rewrite trong `proxy.ts` cho `/api/v1/:path*` → `/api/:path*`; thêm test smoke kiểm tra alias. OpenAPI document sinh sau. | ✅ **Đã implement & verify** — `proxy.ts:89-93` rewrite; curl thật `/api/v1/auth` `/api/v1/auth/session` `/api/v1/admin/roles` → cùng 401/body với `/api/*`, **không redirect**; smoke test 22/22 |
| **C-12** | Project status enum | **Giữ enum migration: `planned / in_progress / deployed / paused / ended`** làm source of truth. Map PRD → migration: `READY_FOR_HANDOVER → deployed` (kèm checklist), `ON_HOLD → paused`, `CANCELLED → ended`. Không thêm giá trị mới vào DB lúc này. | `migrations/001:83` CHECK; `app/projects/page.tsx:19` select 5 giá trị đúng; build/UI chạy thật. | Sửa `product.md FR-02` đưa bảng map, ghi enum migration là canonical; AC `PRJ-AC-01` cập nhật. | ✅ Chốt (DD) |

---

## Tóm tắt cho PO / Tech Lead

- **8/8 P0 đã có quyết định DD.** Trong đó **7 cái chốt ngay** (C-01…C-07, C-12) bằng cách **sửa spec cho khớp code/DB đã chạy** — không đụng migration đã apply.
- **✅ C-09 đã xong**: `/api/v1` alias qua `proxy.ts` rewrite, verify curl thật + smoke test 22/22. **8/8 P0 giờ đã chốt cả về thiết kế lẫn implementation.**
- **3 cái PO được quyền mở lại kèm chi phí** (đã ghi trong bảng): C-04 (N:M → cần migration + retest), C-06 (tách Incident → cần bảng + FK migration), C-07 (SLA hợp đồng → cần cấu hình, không hardcode).
- Không có quyết định nào làm **mất dữ liệu** hoặc **force push**.

## Nguyên tắc khi cập nhật 11 file v2

1. Giữ nguyên văn phong "proposed"/thận trọng của v2 cho các mục **chưa Verified**.
2. Với 8 mục trên, thêm dòng: `> DD decision 2026-11-17: … (xem DD_DECISIONS_P0.md)` ngay tại section tương ứng — **không xóa** nội dung gốc, để traceability.
3. Cập nhật Decision log tương ứng: `D-01/D-02/D-03/D-04/D-05/D-06/D-08 ui_ux`, `DEC-02/03/04/05/06/10`, rồi đánh dấu `Closed by DD_DECISIONS_P0.md`.
4. Chạy lại `npm test` + `npx tsc --noEmit` + build sau khi sửa docs (docs không ảnh hưởng code, nhưng giữ discipline).

*Không ghi credential vào artifact. Mọi căn cứ là file:line trong repo tại `c599f51`.*
