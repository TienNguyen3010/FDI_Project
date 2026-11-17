# SPEC_REALITY_CHECK — FDI_Project: tài liệu thiết kế vs code thật

> Reviewer: subagent (read-only) · Ngày: 2026-11-17 · Target: `/opt/data/FDI_Project`
> Phạm vi: `product.md`, `roadmap.md`, `rbac_matrix.md`, `api_spec.md`, `ui_ux_spec.md`, `checklist.md`, `tech_spec.md`, `database_schema.sql`, `project_structure.md` ↔ code trong `app/`, `components/`, `lib/`, `middleware.ts`, `package.json`.
> **Không sửa file source, không commit.** Không đụng `migrations/` (đang do subagent khác tạo).
> Ký hiệu: ✅ = có & đúng · ❌ = sai/thiếu · ⏳ = chưa thể xác minh (thiếu `.env`/DB/migration).

---

## Tổng quan

Code hiện tại mới là **khung xương (scaffold) chạy được**: build xanh (`checklist.md:248-249`), có Login thật bằng Supabase Auth, middleware chặn route theo session, sidebar RBAC mềm ở mức "ẩn menu Quản trị", Dashboard có 6 query Supabase cho 4 card KPI, và đã định nghĩa đủ 12 bảng trong `lib/types.ts`. Khoảng cách với spec rất lớn: **Bản 1 (MVP) mới làm được ~1/6**: Customer/Project/Device/Quản trị/Site Report chỉ có thư mục rỗng + link sidebar, mọi route API thiết kế trong `api_spec.md` (trừ 3 route auth đọc session) đều chưa tồn tại; Dashboard còn 4 khu vực dữ liệu cứng và 3 nút dead; RBAC UI chỉ đúng một phần (Admin phải cho Manager xem theo `rbac_matrix.md:40` nhưng code chỉ cho Director), không có scope team/project, không có RLS/audit log/rate-limit. Bản 2 (Incident/Maintenance/Work/Notification) và Bản 3 (Dashboard điều hành, Site Report PDF, tổng hợp báo cáo) **chưa có implementation nào** ngoài vài card Dashboard cứng. Ngoài ra các tài liệu tự mâu thuẫn nhau ở 3 điểm lớn (base URL API, quyền Dashboard của Director, enum status), cần chốt trước khi code tiếp.

---

## Bảng đối chiếu Bản 1

| Yêu cầu (nguồn) | Trạng thái code | Bằng chứng (file:line) | Hành động |
|---|---|---|---|
| Login bằng email/password, redirect Dashboard (`product.md:276-286`; `roadmap.md:24`; `ui_ux_spec.md:181-185`) | ✅ | `app/login/page.tsx:15-18` (zod validate), `:57-61` (`signInWithPassword`), `:66-70` (getSession → cookie → redirect) | Giữ. Nhưng sửa 2 điểm ở bảng "Điểm cần làm rõ" |
| 4 role Employee/Leader/Manager/Director (`product.md:17`, `:264`; `rbac_matrix.md:10`; `roadmap.md:24`) | ✅ | `lib/types.ts:18,28,38` (union role); `lib/hooks/useProfile.ts:6-8,10-12`; `components/ClientBody.tsx:21` | Giữ |
| RBAC mềm: ẩn menu theo role (`rbac_matrix.md:65`; `checklist.md:95`) | ❌ | `components/ClientBody.tsx:33-40` — 7/8 menu `scope:'all'`; chỉ `/admin` là `scope:'director'` (`:40`); filter tại `:96-98` | Sửa: Manager phải thấy Admin (`rbac_matrix.md:40`); Director chỉ "Xem" thiết bị, Employee không thấy toàn bộ thiết bị |
| Scope dữ liệu theo team/project/department (`product.md:383-389`; `rbac_matrix.md:12,21-24`; `roadmap.md:24`) | ❌ | Không có `.eq('project_id'…)`/`.eq('team'…)` nào trong `app/dashboard/page.tsx:67-74`, `components/ClientBody.tsx:58-74`, `lib/hooks/useProfile.ts:34-40` | Implement filter scope; đây là phần "scope" của Bản 1 |
| Audit log mọi thay đổi (`product.md:123,389`; `rbac_matrix.md:13,71`; `roadmap.md:24`) | ❌ | Chỉ có type: `lib/types.ts:432-467`; grep `audit_log` trong `app/ components/ lib/ middleware.ts` → **0 write** | Thêm trigger/RPC ghi audit khi có migration; nối UI lịch sử |
| RLS / RBAC cứng (`rbac_matrix.md:59-60`; `checklist.md:92`; `product.md:690`) | ⏳ | `migrations/` rỗng (kiểm tra bằng `os.walk`); grep `CREATE POLICY`/`row level` trong source → 0; `lib/hooks/useProfile.ts:24` chỉ comment "RBAC cứng nằm ở RLS/middleware" | Chờ subagent migration; sau đó verify policy theo `auth.uid()` |
| Middleware bảo vệ route (`checklist.md:91`; `roadmap.md:24`) | ✅ (auth) / ❌ (role) | `middleware.ts:78-97` chặn 8 route khi không có token, `:50-66` verify với Supabase `/auth/v1/user`, `:7-26` cache 5 phút; **không có role check** | Giữ auth; bổ sung guard role cho `/admin` |
| Customer — hồ sơ, site, liên hệ (`roadmap.md:25`; `product.md:93-100`) | ❌ | `app/customers/` **rỗng**; link tồn tại ở `components/ClientBody.tsx:34`; type có sẵn `lib/types.ts:46-84` (customers) `:85-117` (sites) | Build theo `api_spec.md:78-93` |
| Project — milestone, progress, status (`roadmap.md:26`; `product.md:78-91`) | ❌ | `app/projects/` **rỗng**; link `components/ClientBody.tsx:35`; type `lib/types.ts:118-170` | Build list + detail tabs; chú ý rule chuyển "deployed" khi đủ checklist (`product.md:91`) |
| Device — serial, rack, bảo hành (`roadmap.md:27`; `product.md:142-159`) | ❌ | `app/devices/` **rỗng**; link `components/ClientBody.tsx:36`; type `lib/types.ts:171-221` | Build theo `api_spec.md:101-106`; serial unique trong project |
| Quản trị — gán role, cấu hình (`roadmap.md:28`; `product.md:118-124`) | ❌ | `app/admin/` **rỗng**; link `components/ClientBody.tsx:40` (chỉ Director thấy — **sai**, see RBAC row); type `lib/types.ts:468-505` (config) | Thêm route + sửa scope cho Manager |
| Site Report cơ bản — tạo report, photo (`roadmap.md:29`; `product.md:111-116`) | ❌ | `app/reports/` **rỗng**; link `components/ClientBody.tsx:39`; type `lib/types.ts:360-398` | Build create + upload ảnh (giới hạn 5MB/ảnh `product.md:311`) |
| Dashboard KPI đúng spec (`roadmap.md:52`; `product.md:50-66,338-346`; `checklist.md:17-18`) | ❌ | `app/dashboard/page.tsx:67-74` query thật (customers/projects/devices/alerts/reports), `:77-85` map — **nhưng**: `:83` `maintenanceToday: 0` cứng; `:82` gán `highPriority` từ biến tên `maintenance` nhưng thực chất là query alerts acknowledged; `:100-129` chỉ 4/7 KPI; subtitle "Critical & Major" (`:127`) nhưng query `:71` chỉ lấy `critical` | Thay 6 query bằng RPC tổng hợp; lấy đủ Major + SLA + bảo trì hôm nay |
| Dashboard — sự cố mới nhất / lịch bảo trì / dự án gần đây / thống kê nhanh (`product.md:60-61,344-346`) | ❌ | Hardcode: `app/dashboard/page.tsx:175-194` (2 sự cố giả "VN Telecom"/"Tech Corp"), `:216-231` (2 lịch bảo trì giả), `:249-254` (4 dự án giả có progress), `:279-314` (-2%, +5, 98%, 3) | Thay bằng query thật theo scope role |
| Dashboard — filter phòng ban/mức độ/trạng thái (`product.md:63-66`) | ❌ | `app/dashboard/page.tsx:138-141` `<Button>` không `onClick` (dead button) | Nối filter + state |
| Không có dead button / orphan tab (`product.md:514-515`; `checklist.md:21`) | ❌ | `app/dashboard/page.tsx:197-199` "Xem tất cả sự cố", `:234-236` "Xem tất cả bảo trì" — `<Button variant="link">` không `href`/`onClick`; `app/login/page.tsx:201` `href="#"` (Quên mật khẩu) | Đổi thành `<Link>` tới route thật hoặc disable có tooltip |
| API `/api/v1/*` — login/refresh/logout + JWT có `role`,`scope` (`api_spec.md:11,22-35,245`) | ❌ | Chỉ có `app/api/auth/route.ts:5-19`, `app/api/auth/me/route.ts:6-20`, `app/api/auth/session/route.ts:6-21` — **3 file cùng logic GET trả session**, không có POST login, không refresh, không logout; grep `refresh|logout` trong `app/api/` → 0; `app/login/page.tsx:68` tự ghi cookie `sb-access-token` | Chốt 1 route canonical; xoá 2 route trùng; quyết định `/api/v1` vs `/api` (xem "Điểm cần làm rõ") |
| API resources: dashboard/projects/customers/sites/devices/alerts/maintenance/works/reports/documents/audit/config (`api_spec.md:46-196`; `tech_spec.md:87-104`) | ❌ | `app/api/` chỉ có 3 file auth ở trên; `app/api/customers/`, `app/api/projects/`, `app/api/devices/`, `app/api/maintenance/`, `app/api/alerts/`, `app/api/reports/` — **đều rỗng**; không có `sites/works/documents/audit-logs/config` | Theo checklist §5/§6; ưu tiên dashboard + project + customer trước |
| Rate limit 100 req/phút + header `X-RateLimit-*` (`api_spec.md:231-234`; `checklist.md:145`) | ❌ | grep `rate` trong `app/ components/ lib/ middleware.ts` → 0 | Thêm middleware/rate-limit trước khi public |
| Design tokens (màu, font Inter, spacing, radius) (`ui_ux_spec.md:28-52,228-291`; `product.md:491-500`) | ✅ | `app/globals.css:3-26` đúng 12 token màu; `:32-35` font Inter; `app/layout.tsx:8-11,34` load Inter + `lang="vi"` | Giữ. Thiếu `--space-*`/`--radius-*` dạng biến (`ui_ux_spec.md:270-293`) — bổ sung nếu cần |
| Component library Button/Input/Card/Table/Badge/Select/Tabs/Modal (`ui_ux_spec.md:86-146`; `checklist.md:156`) | ✅ | `components/ui/ui.tsx:6-45` Button (6 variant), `:47-67` Input/Label, `:69-108` Card, `:110-154` Table, `:156-199` Badge (critical/major/minor/deployed…), `:201-211` Select, `:213-238` Tabs, `:240-287` Modal | Giữ; thiếu Checkbox/Radio/Toggle/Range (`ui_ux_spec.md:110-113`) |
| Layout desktop sidebar + main, responsive (`ui_ux_spec.md:149-175,214-220`; `checklist.md:157-159`) | ✅ (partial) | `components/ClientBody.tsx:100-153` sidebar, `:155-196` header+main, `:104-106` collapse; `app/layout.tsx:36-38` Suspense quanh `cookies()` | Cần thêm mobile bottom-nav (`ui_ux_spec.md:163-175,218`) — chưa có |
| Dark mode toggle (`ui_ux_spec.md:15,224-252`) | ❌ | `app/globals.css:34` `color-scheme: dark` cố định; `:3-26` chỉ 1 bộ token; không có toggle | Đưa vào backlog (spec tự ghi "hiện tại chỉ tối") |
| DB schema 12 bảng (`product.md:699`; `database_schema.sql:13-24`) | ✅ (type) / ⏳ (DB thật) | `lib/types.ts:13,46,85,118,171,222,270,312,360,399,432,468` — đủ 12 bảng; nhưng `migrations/` rỗng và không có `.env` (chỉ `.env.example`) | Chờ migration + `.env` rồi query thật để verify |
| Build/type-check xanh (`checklist.md:248-249`) | ✅ | `checklist.md:248-249` ghi kết quả thật `tsc exit 0`, `npm run build` ✓; code ăn khớp: `lib/supabase/index.ts:5-16` lazy env, `app/layout.tsx:36-38` Suspense | Giữ. Cảnh báo `middleware` deprecated → đổi `proxy` theo `checklist.md:249,257` |

### Bản 2 / Bản 3 (trích để đối chiếu nhanh — ngoài phạm vi bảng Bản 1)

| Bản | Yêu cầu (nguồn) | Trạng thái code | Bằng chứng |
|---|---|---|---|
| 2 | Incident: nhận/xử lý/đóng + SLA, ma trận mức độ, gộp trùng, escalation (`roadmap.md:39,44`; `product.md:72-76`) | ❌ | `app/api/alerts/` rỗng; `lib/types.ts:222-269` chỉ có type; dashboard gọi `alerts` nhưng chỉ đếm `critical` (`app/dashboard/page.tsx:71`) |
| 2 | Maintenance lịch/checklist/kết quả (`roadmap.md:40`; `product.md:107`) | ❌ | `app/maintenance/`, `app/api/maintenance/` rỗng; `lib/types.ts:270-311`; dashboard có 2 card giả (`:216-231`) |
| 2 | Work giao việc/ưu tiên (`roadmap.md:41`; `product.md:108`) | ❌ | Không có `app/works/` lẫn `app/api/works/`; `lib/types.ts:312-359` |
| 2 | Notification soạn email/Zalo/group, **không tự gửi** (`roadmap.md:42`; `product.md:109`) | ❌ | Không có file/component nào; `checklist.md:121` |
| 3 | Dashboard điều hành KPI tổng hợp (`roadmap.md:52`; `product.md:50-66`) | ❌ | Xem 2 row Dashboard ở bảng Bản 1 — mới scaffold + hardcode |
| 3 | Site Report PDF + tổng hợp tuần/tháng (`roadmap.md:53-54`; `product.md:115-116`) | ❌ | `app/reports/` rỗng; `api_spec.md:163` `/reports/:id/pdf` chưa có; grep `pdf` trong source → 0 |

---

## Điểm sạch

- **Auth nền tảng đúng**: đăng nhập thật qua Supabase `signInWithPassword` (`app/login/page.tsx:57-61`), cookie `sb-access-token` (`:68`), middleware verify chữ ký qua `/auth/v1/user` + cache 5 phút (`middleware.ts:50-75`) — không tự implement JWT giả.
- **Chống build-break tốt**: Supabase client tạo lazy (`lib/supabase/index.ts:5-16,29-43`) nên `npm run build` không cần credential; `cookies()` nằm trong `<Suspense>` (`app/layout.tsx:22-28,36-38`). Khớp verification log `checklist.md:248-249`.
- **Type DB đầy đủ 12 bảng** đúng danh sách `product.md:699` (`lib/types.ts:13-505`), có wrapper `public.Tables` + `Relationships` (`:10-12`).
- **Token design khớp spec**: 12 màu trong `app/globals.css:5-25` trùng từng giá trị `ui_ux_spec.md:231-252`; font Inter `app/layout.tsx:8-11`; Badge đã có đủ `critical/major/minor/planned/in-progress/deployed` (`components/ui/ui.tsx:156-188`).
- **Sidebar/collapse/logout hoạt động**: `components/ClientBody.tsx:100-153`, `:159-165`, `:181-191`; `useProfile` có fallback role `employee` an toàn khi chưa có DB (`lib/hooks/useProfile.ts:42,50-52`).
- **Dashboard có nền query thật** (4 card) thay vì hardcode hoàn toàn: `app/dashboard/page.tsx:67-85`.

---

## Điểm cần làm rõ

1. **Base URL API mâu thuẫn 3 chiều**: `api_spec.md:11` = `/api/v1`, `tech_spec.md:87-104` = `/api/...` (không v1), code = `/api/auth/*` (`app/api/auth/route.ts:5`). Cần chốt một chuẩn trước khi tạo module route, nếu không `api_spec.md` sẽ không đồng bộ với mọi route mới.
2. **Quyền Dashboard của Director mâu thuẫn**: `database_schema.sql:158` ghi Director Dashboard = **✗**, trong khi `rbac_matrix.md:32` và `product.md:373` đều ghi **"Toàn công ty"**. Code hiện cho Director vào Dashboard (`middleware.ts:83-86`, `components/ClientBody.tsx:33`) → theo 2 tài liệu số đông là đúng, nhưng cần sửa `database_schema.sql:158`.
3. **Quyền Admin của Manager mâu thuẫn**: `rbac_matrix.md:40` = "Thêm user, team"; `product.md:381` = "Thêm user team mình"; code `components/ClientBody.tsx:40` chỉ `scope:'director'` → Manager bị ẩn. Phải chọn: cho Manager vào Admin với quyền hạn chế, hay sửa spec.
4. **Enum status alerts không khớp**: `product.md:170` = `NEW/ACKNOWLEDGED/IN_PROGRESS/RESOLVED/CLOSED`; `database_schema.sql:169` = `new/acknowledged/in_progress/resolved/closed`; nhưng dashboard query `.eq('status','open')` (`app/dashboard/page.tsx:71`) — giá trị **`open` không có trong spec nào**. Ngoài ra subtitle "Critical & Major" (`:127`) nhưng query chỉ lấy `critical`. Cần chốt enum + sửa query.
5. **Enum device status hoa/thường**: `product.md:157` = `ACTIVE/INACTIVE/EXPIRED`; `database_schema.sql:85` = thường; code query `'active'` (`app/dashboard/page.tsx:70`) — code đang theo SQL doc, PRD cần update.
6. **3 route auth trùng logic**: `app/api/auth/route.ts:5-19`, `app/api/auth/me/route.ts:6-20`, `app/api/auth/session/route.ts:6-21` cùng trả `{ user: session.user }`. `api_spec.md:22-24` lại đòi POST `/auth/login`, `/auth/refresh`, `/auth/logout`. Cần map lại danh mục route.
7. **Dashboard dùng date cứng**: `app/dashboard/page.tsx:73` `.eq('created_at','2026-11-17')` — sẽ trả 0 khi chạy ngày khác thay vì "hôm nay". Phải đổi thành `gte(now()-1 day)`/RPC.
8. **`password_hash` trong bảng `users`** (`lib/types.ts:17`; `database_schema.sql:46`) nhưng auth do Supabase Auth quản lý; `rbac_matrix.md:70` cấm lưu password/plain. Cần làm rõ: bỏ cột hay chỉ lưu hash tham chiếu; tránh duplicate nguồn truth.
9. **Checklist chưa resolve trạng thái**: phần lớn dòng trong `checklist.md:17-36,88-103,…` vẫn là chữ `✅ / ❌ / ⏳` (placeholder), chỉ `checklist.md:133-137,248-249` có giá trị thật. Đừng đọc nhầm là đã xác minh.
10. **Thiếu `.env`**: chỉ có `.env.example` (5 dòng, kiểm tra bằng `ls`), đúng ghi chú `checklist.md:256` → mọi mục liên quan DB/RLS/audit vẫn ⏳ dù type đã có.
11. **Cấu trúc thư mục lệch spec**: `project_structure.md:29-56` mô tả `backend/` + `frontend/` tách biệt; thực tế là monorepo Next.js `app/` (`README.md:7-8`). Cần cập nhật doc cho khớp thực tế.
12. **Deprecated middleware**: `checklist.md:249,257` đã cảnh báo `middleware.ts` (Next 16) cần đổi sang `proxy` — chưa làm, nhưng không block build hiện tại.

---

## Đề xuất thứ tự làm tiếp (theo `checklist.md`)

> Nguyên tắc: chốt mâu thuẫn spec (mục 1–5 ở trên) **trước** khi viết route; chạy `tsc`/`build` sau mỗi bước như `checklist.md:248-249`.

1. **Bước 0 — Chốt spec (ngoài checklist, nhưng bắt buộc)**: sửa 5 mâu thuẫn §"Điểm cần làm rõ" (base URL, Dashboard Director, Admin Manager, enum status). Cập nhật `api_spec.md`, `database_schema.sql:158`, `product.md:170` cho đồng bộ.
2. **Checklist §3 Database #1–2, #15** (`checklist.md:66-67,80`): đợi subagent migration xong → tạo `.env` từ `.env.example` → query thật 12 bảng; bật RLS (#5 §4 tại `checklist.md:92`). Chưa làm code UI khi DB chưa verify.
3. **Checklist §4 RBAC #1–2, #5, #8, #9** (`checklist.md:88-96`): implement scope team/project và audit log; sửa `components/ClientBody.tsx:33-41`; guard role trong `middleware.ts:83-97`.
4. **Checklist §6 #5 + §11 #7-8** (`checklist.md:137,234-235`): gom 3 route auth trùng thành 1 canonical; thêm refresh/logout theo `api_spec.md:22-24`; rate-limit + header `X-RateLimit-*`.
5. **Checklist §1 #1-2, #5** (`checklist.md:17-18,21`) — **Bản 3-RBAC nhưng đang block Bản 1**: thay 4 khu vực hardcode và filter dead button trong `app/dashboard/page.tsx:138-141,175-194,216-239,249-254,279-314` bằng RPC tổng hợp theo scope.
6. **Checklist §6 #2 + api_spec §§4-7** (`checklist.md:134`; `api_spec.md:61-106`): build `projects` → `customers` → `devices` theo thứ tự dependency `product.md:131-140` (customer → site → project → device). Đây là phần còn lại của Bản 1 (`roadmap.md:22-31`).
7. **Bản 1 còn lại**: `admin` (gán role/cấu hình), `reports` cơ bản + upload ảnh — `roadmap.md:28-29`, `product.md:111-124`.
8. **Checklist §5 Vận hành + api_spec §§8-10** (`checklist.md:111-125`; `api_spec.md:110-148`): sang Bản 2 — alerts/SLA, maintenance, works, notification (soạn không tự gửi).
9. **Bản 3** (`roadmap.md:48-56`): Site Report PDF + tổng hợp tuần/tháng; chỉ sau khi Bản 1/2 có data thật.
10. **Checklist §8/§10 dọn dẹp** (`checklist.md:176-187,209-220`): review, test, migrate middleware→proxy, commit/tag — làm cuối cùng, không làm sớm.

---

*Review read-only: không sửa file source nào khác, không commit, không đụng `migrations/`. Mọi ✅/❌ ở trên đều có `file:line`; mục không có bằng chứng trực tiếp (thư mục rỗng, `.env`, DB thật) để ⏳ hoặc ghi rõ "(rỗng — kiểm tra bằng `os.walk`)".*
