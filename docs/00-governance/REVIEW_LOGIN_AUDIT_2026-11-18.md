# REVIEW — Audit hệ thống Auth/Login (read-only)

- Ngày: 2026-11-18 · HEAD `26023fd` · Next.js 16.4.6 / React 19
- Mục đích: chuẩn bị thiết kế màn hình đăng nhập RIÊNG. Không sửa code, không commit.
- Evidence hierarchy: **runtime > test > code > spec**. Runtime đã verify trực tiếp `https://fdi-project.vercel.app/login` (xem §1).
- Phạm vi đọc: `app/layout.tsx`, `app/login/page.tsx`, `app/globals.css`, `components/ClientBody.tsx`, `lib/auth/authorize.ts`, `lib/supabase/index.ts`, `lib/supabase/server.ts`, `app/api/auth/{route,me,session}/route.ts`, `proxy.ts`, `lib/hooks/useProfile.ts`, `docs/02-design/ui_ux_spec.md`, `docs/01-product/USER_GUIDE.md`, `docs/04-security/rbac_matrix.md`, migrations `001/002/003`, `app/api/admin/roles/route.ts`, `app/admin/page.tsx`, `components/crud/CrudPage.tsx`.

---

## 1. Sidebar/ClientBody mount ở đâu? Vì sao lộ trên /login? Route group?

**Kết luận: `ClientBody` được mount trong ROOT layout → bọc MỌI route, kể cả `/login`. Chưa có route group `(auth)` / `(workspace)` nào. Đây là nguyên nhân sidebar lộ.**

- `app/layout.tsx:6` import `ClientBody`; `app/layout.tsx:24-28` `Shell()` render `<ClientBody initialCollapsed={...}>{children}</ClientBody>`; `app/layout.tsx:36-38` `<Shell>{children}</Shell>` trong `<body>`. Root layout áp dụng cho toàn bộ app (không có layout con nào override).
- `components/ClientBody.tsx:186-190` luôn render `<div className="flex h-screen...">` + `<aside>` sidebar desktop (`ClientBody.tsx:190-230`), header (`ClientBody.tsx:234`), drawer mobile (`ClientBody.tsx:284-340`), bottom nav (`ClientBody.tsx:343-377`). **Không có điều kiện `pathname.startsWith('/login')` để ẩn** — `pathname` chỉ dùng để active-state/tiêu đề (`ClientBody.tsx:57,144,164-169`).
- RBAC mềm: `allItems:36-45` (7 mục + Quản trị scope manager/director), lọc theo `role` tại `ClientBody.tsx:105`. Role đọc từ `users.role` qua `supabase.auth.getUser()` (`ClientBody.tsx:64-103`), mặc định `'employee'` (`ClientBody.tsx:61`). Trên `/login` (chưa auth) vẫn hiện 7 mục employee — khớp ảnh production.
- **Route group: KHÔNG có.** `search_files app/**/*.tsx` chỉ thấy `app/layout.tsx` (duy nhất), không có `app/(auth)/`, `app/(workspace)/`. Cấu trúc phẳng: `app/login/page.tsx`, `app/dashboard/page.tsx`, … cùng chung root layout.
- **Runtime evidence (production):** snapshot `https://fdi-project.vercel.app/login` trả về `complementary > navigation` với đủ link `Dashboard / Khách hàng / Dự án / Thiết bị / Cảnh báo / Bảo trì / Báo cáo`, `banner` có nút `Thu gọn thanh điều hướng` + `Đăng xuất`, `heading "login"` (pageTitle fallback `pathname.split('/').pop()` tại `ClientBody.tsx:168-169`). → Lỗi RBAC/UX đúng như mô tả, đã tái hiện được.

---

## 2. Form login: API, redirect, nút "Quay về Dashboard", "Quên mật khẩu"

- **Form:** `app/login/page.tsx` (`'use client'`, zod + react-hook-form, schema `:15-20`).
- **Luồng submit** `app/login/page.tsx:52-88`:
  1. `getSupabaseClient()` (từ `@/lib/supabase/server`, `app/login/page.tsx:8`) → `supabase.auth.signInWithPassword({email,password})` (`:57-61`). **Gọi trực tiếp Supabase Auth (GoTrue) từ browser bằng ANON key** — KHÔNG qua route handler đăng nhập.
  2. `supabase.auth.getSession()` lấy `access_token` (`:66`).
  3. `POST /api/auth/session` gửi token (`:69-73`) → route `app/api/auth/session/route.ts:25-46` verify `getUser(token)` rồi set cookie `sb-access-token` **HttpOnly, SameSite=lax, Secure=production, maxAge 3600** (`session/route.ts:38-44`).
  4. `router.replace(callbackUrl)` (`:78`). `callbackUrl` mặc định `'/dashboard'` (`:28`), đọc từ `searchParams.callbackUrl` (`:46-50`) do `proxy.ts:137-139` gắn khi redirect protected route.
- **Có nút "Quay về Dashboard": CÓ** — `app/login/page.tsx:133-139`, `onClick={() => router.push('/dashboard')}`, icon `ArrowLeft` import `:13`. Nút này đẩy user chưa đăng nhập tới protected route → `proxy.ts:135-139` đẩy lại `/login?callbackUrl=/dashboard` → vòng lặp UX. **Nên bỏ khi tách màn hình login riêng.**
- **"Quên mật khẩu?": KHÔNG hoạt động.** Chỉ là `<a href="#">` (`app/login/page.tsx:209-211`) — click không gọi `resetPasswordForEmail`, không có route `/forgot-password` / `/auth/reset` / `/auth/callback` nào (`search_files app/**/*forgot*`, `*reset*` → 0; `app/auth/` không tồn tại). `docs/01-product/USER_GUIDE.md:9` cũng chủ động "Do not assume … password recovery flow without testing".
- Liên quan: `app/api/auth/route.ts:5-20` và `app/api/auth/me/route.ts:5-20` là 2 GET trùng logic (đọc cookie `sb-access-token` → `getSession()` → trả `session.user`), **không verify lại token bằng cookie** (dùng `getSession()` client có persistSession). `proxy.ts:155-164` coi `/login`, `/auth/callback` là public và redirect đã-auth về `/dashboard`.

---

## 3. Tạo user Supabase Auth chuẩn cho project

**Hiện trạng: repo CHƯA CÓ helper/API tạo user Auth nào.** Search toàn repo (`admin users`, `createUser`, `inviteUserByEmail`, `auth.admin`, `signUp`, `SERVICE_ROLE_KEY`, `/auth/v1/users`) → chỉ ra comment/GRANT, không có code gọi Admin API:
- `app/api/admin/roles/route.ts:9` — comment: *"Không có SUPABASE_SERVICE_ROLE_KEY trong dự án; audit được ghi bằng client anon"*.
- `docs/00-governance/EVIDENCE_REGISTER.md:49` (E-17) xác nhận **VERIFIED: không có service-role key**; `lib/hooks/useProfile.ts` là soft RBAC.
- `migrations/003_seed.sql:12-19` seed 4 user demo với `password_hash = 'SEED_ONLY_NOT_A_REAL_HASH'` (giả), comment `:13`: *"Trong production phải thay bằng Supabase Auth (auth.users) + bảng profile"*.
- `migrations/001_initial_schema.sql:20-33` — `public.users(id UUID PK default gen_random_uuid(), email UNIQUE NOT NULL, password_hash TEXT NOT NULL, role CHECK 4 giá trị, team, active, created_at, updated_at)`; comment `:33` khuyến nghị chuyển sang Supabase Auth.
- `app/api/admin/roles/route.ts:158-159,174-176` **từ chối tạo user mới** qua import: *"Chỉ update user ĐÃ TỒN TẠI. Không tạo user mới vì bảng users yêu cầu password_hash NOT NULL — tạo mới phải qua màn hình Quản trị (có đặt mật khẩu)"*.
- `app/admin/page.tsx:6-25` + `components/crud/CrudPage.tsx:164-170` — màn hình Quản trị insert thẳng `users` qua client anon (`db.from('users').insert(payload)`) → **chỉ tạo được profile row, KHÔNG tạo được auth identity trong `auth.users`**. Nên user tạo qua đây KHÔNG đăng nhập được bằng mật khẩu.
- RLS `migrations/002_rls_policies.sql:286-288`: `fdi_users_insert` `WITH CHECK (public.fdi_is_manager_plus())` → insert profile cần JWT manager/director.

**Role source-of-truth:** `lib/auth/authorize.ts:4,64-75` — JWT `app_metadata.role` chỉ là gợi ý/fallback; **`public.users.role` là nguồn chân thực** (ưu tiên `profile.role`, fallback `app_metadata.role ?? app_metadata.app_role`, cuối `'employee'`). `proxy.ts:142-152` edge RBAC cho `/admin` lại đọc **thẳng `app_metadata.role` từ JWT** → có thể stale (khớp cảnh báo `rbac_matrix.md:91`, `:148`). `docs/04-security/rbac_matrix.md:20-24` định nghĩa 4 business role canonical: **Employee / Leader / Manager / Director**.

**Khuyến nghị (chưa thực thi — cần quyết định DD + env tạm):**
- Dùng **Supabase Auth Admin API** (`supabase.auth.admin.createUser(...)` hoặc `POST {URL}/auth/v1/users` với `service_role` key) từ **server-only**, gán `app_metadata: { role: 'director' }` để edge RBAC (`proxy.ts:147`) thấy quyền ngay.
- **Bắt buộc insert thêm 1 row `public.users`** với cùng `id` với `auth.users.id` (FK/RLS helper `fdi_current_user_id()` dùng `auth.uid()`, `002_rls_policies.sql:15-26`); `password_hash` điền placeholder không phải mật khẩu thật (cột NOT NULL chỉ để tương thích contract, `001:23,33`). Nếu thiếu row này: `authorize()` (`authorize.ts:65-75`) và `useProfile()` (`useProfile.ts:36-49`) rơi về `'employee'`, `getUser()` vẫn đăng nhập được nhưng mất quyền.
- **KHÔNG lưu credential/key vào repo hay file.** Dùng env tạm (`SUPABASE_SERVICE_ROLE_KEY` chỉ trong phiên tạo user, không commit, không đưa browser — `rbac_matrix.md:16`), xoay vòng ngay nếu từng lộ key/mật khẩu. Hiện repo không có service-role → cần cấp thủ công có kiểm soát hoặc tạo user từ Supabase Dashboard (Auth → Users) rồi insert profile row qua SQL Editor.
- `docs/01-product/USER_GUIDE.md:6` nhắc không chia sẻ tài khoản/mật khẩu — giữ nguyên.

---

## 4. Design tokens hiện có (không vi phạm design guide)

Nguồn: `app/globals.css:3-45` (CSS vars) khớp `docs/02-design/ui_ux_spec.md §4.1:60-72`:
| Token CSS | Giá trị | Semantic spec |
|---|---|---|
| `--bg-primary` | `#0f172a` | `color.surface.page` (`globals.css:5`, spec:62) |
| `--bg-secondary` | `#1e293b` | panel/sidebar (`globals.css:6`, spec:63) |
| `--bg-card` | `#263244` | card (`globals.css:7`, spec:64) |
| `--bg-modal` | `#0f172a` | (`globals.css:8`) |
| `--text-primary` | `#f8fafc` | (`:11`, spec:65) |
| `--text-secondary` | `#94a3b8` | (`:12`, spec:66) |
| `--accent` / `--accent-hover` | `#3b82f6` / `#2563eb` | action.primary / hover (`:15-16`, spec:67-68) |
| `--success/warning/danger/info` | `#22c55e/#f59e0b/#ef4444/#3b82f6` | (`:19-22`, spec:69-71) |
| `--border` | `#334155` | (`:25`, spec:72) |
| spacing 4/8/12/16/20/24/32/48 (`--space-1..8`), radius 4/8/12, duration 150/300ms | `:27-45` | spec:79-81 |

- Font: `Inter` qua `next/font/google` (`app/layout.tsx:2,8-11`, biến `--font-inter`), `html` dùng `var(--font-inter)` (`globals.css:51-54`), `color-scheme: dark` (`:53`). Spec `§4.2:77-78` Inter + fallback system sans, scale 12/14/16/18/20/24px.
- Focus ring: `globals.css:64-68` `outline 2px var(--accent)`. Reduced-motion: `:70-79`.
- **Cảnh báo design guide:** form login hiện dùng `bg-slate-50/60`, `bg-white`, `text-slate-900/700/500`, `bg-blue-600` (`app/login/page.tsx:92,94,130,140-141,144,160-167,193`) — ** Hard-code Tailwind slate/blue, KHÔNG dùng token** và là light theme trên nền `color-scheme: dark`. spec `§4.1:74` đánh dấu light theme là **[PROPOSAL] chưa được duyệt** ("Define separate light theme semantic values before advertising a functional theme toggle. Do not invert colors."). → Màn hình login riêng PHẢI dùng `var(--bg-*)`, `var(--accent)`, `var(--text-*)`; nếu muốn split-screen sáng/tối thì định nghĩa token light riêng được duyệt, không tự invert.
- **Không dùng màu callback cho `'Quên mật khẩu?'`** dạng link `href="#"` (đang vi phạm nguyên tắc "UI must distinguish hidden/disabled/forbidden" spec:51 nếu giữ nguyên).

---

## 5. Khuyến nghị cấu trúc route (CHỌN — chưa áp dụng)

```
app/
  layout.tsx                      # GIỮ NGUYÊN: html/body/font/globals.css + <Shell> ... NHƯNG chuyển ClientBody ra khỏi đây
  (workspace)/
    layout.tsx                    # MỚI: chỉ bọc <ClientBody> (sidebar/header/drawer/bottom nav)
    dashboard/page.tsx            # GIỮ URL /dashboard
    customers|projects|devices|alerts|maintenance|reports|admin/...  # dời nguyên, không đổi URL
  (auth)/
    layout.tsx                    # MỚI: layout tối giản, KHÔNG ClientBody
    login/page.tsx                # DỜI từ app/login/page.tsx → vẫn /login
```

- Giữ nguyên URL công khai `/login` (route group không ảnh hưởng URL) → không đụng `proxy.ts:126-164` (protected list, public `['/login','/auth/callback']`, redirect `callbackUrl`). Không đụng `(workspace)` logic RBAC trong `ClientBody`.
- `app/layout.tsx` chỉ còn `<html>/<body>/font/Suspense` + `children`; bỏ `ClientBody` import (`:6`) và `Shell()` (`:24-28`). Lưu ý `cookies()`/`sidebar_mode` (`layout.tsx:25-27`) đi cùng `ClientBody` sang `(workspace)/layout.tsx`, vẫn bọc `<Suspense>` theo comment Next.js 16 `:22-23`.
- `(auth)/layout.tsx` render đúng nền `var(--bg-primary)` + font; KHÔNG sidebar/header/bottom-nav → sidebar hết lộ (fix triệt để thay vì `if (pathname === '/login') return null` trong ClientBody — cách đó vẫn giữ shell/RBAC chạy vô ích và dễ tái lỗi).
- Trong `(auth)/login/page.tsx`: bỏ nút "Quay về Dashboard" (`page.tsx:133-139`); thay link "Quên mật khẩu?" (`page.tsx:209-211`) bằng flow thật (`supabase.auth.resetPasswordForEmail` + route `/auth/callback`/reset — hiện chưa có, cần thiết kế riêng, `USER_GUIDE.md:9` cho phép chưa có nhưng phải test). Dùng token CSS vars §4 thay slate/blue hard-code. Giữ luồng `signInWithPassword → POST /api/auth/session → router.replace(callbackUrl)` (đã chạy) trừ khi chuyển sang server action/cookie-only.
- Docs cập nhật SONG SONG (rule 2026-11-18): `ui_ux_spec.md` (mô tả login layout + xóa PROPOSAL light theme hoặc duyệt), `USER_GUIDE.md:9` (xác nhận recovery flow), `rbac_matrix.md` (đồng bộ edge role source giữa `proxy.ts:147` và `authorize.ts:71-75`).

---

### Tóm tắt nhanh
1. Sidebar lộ vì `ClientBody` mount ở root layout (`app/layout.tsx:6,24-28,36-38`), không có điều kiện ẩn (`ClientBody.tsx:186-377`); chưa có route group. Runtime đã tái hiện.
2. Login gọi trực tiếp `signInWithPassword` (`login/page.tsx:57-61`) → `POST /api/auth/session` (`:69-73`) → `router.replace(callbackUrl)` mặc định `/dashboard` (`:28,78`). Có nút "Quay về Dashboard" (`:133-139`, gây loop); "Quên mật khẩu?" là `href="#"` (`:210`) — chết.
3. Không có helper tạo user Auth; không có service-role (`admin/roles/route.ts:9`, E-17). Role chân thực = `public.users.role` (`authorize.ts:71-75`), JWT `app_metadata.role` chỉ fallback + edge `/admin` (`proxy.ts:147`). Phải insert profile row sau khi tạo auth user; dùng env tạm, xoay vòng nếu lộ.
4. Tokens: bg `#0f172a/#1e293b/#263244`, accent `#3b82f6`, text `#f8fafc/#94a3b8`, Inter, border `#334155` (`globals.css:3-45` ≡ spec §4.1). Login hiện hard-code slate/blue (light) → vi phạm `[PROPOSAL]` light theme.
5. Chọn `app/(auth)/{layout,login/page}.tsx` + `app/(workspace)/layout.tsx`, giữ `/login`, không đụng `proxy.ts` hay logic `(workspace)`; cập nhật docs song song.
