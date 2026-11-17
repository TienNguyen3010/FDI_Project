# 🎨 FDI_Project – UI/UX Specification

> 📁 **Vị trí tài liệu:** file này nằm trong `docs/` (di chuyển từ repo root ngày 2026-11-17).
> Các tham chiếu dạng `ten_file.md:line` trong nội dung bên dưới đều chỉ tới các file cùng thư mục `docs/`.


> Phiên bản 1.0 · Dành cho nhóm thiết kế, frontend, dev  
> Ngôn ngữ: Tiếng Việt / English · Không chứa code  
> Mục đích: Chuẩn hóa giao diện, component, font chữ, layout, và đồng bộ với toàn bộ dự án.

---

## 1. Tổng quan

| Tiêu chí | Mô tả |
|---|---|
| Tên sản phẩm | FDI_Project |
| Ngôn ngữ UI | Tiếng Việt (primary) |
| Màu chủ đạo | Dark / Light toggle, hiện tại chỉ tối |
| Giao diện | Responsive: desktop, laptop, tablet, mobile |
| Chiều sâu | 1–2 lớp chỉnh sửa dữ liệu |
| Quy mô | Toàn cục: Dashboard, Project, Customer, Site, Cảnh báo, Vận hành, Site Report, Quản trị |

---

## 2. Design System

### 2.1 Colors

| Khoá | Màu | Ý nghĩa |
|---|---|---|
| `--bg-primary` | `#0f172a` | Background chính (dark) |
| `--bg-secondary` | `#1e293b` | Sidebar / Panel |
| `--bg-card` | `#263244` | Card / panel |
| `--text-primary` | `#f8fafc` | Text chính |
| `--text-secondary` | `#94a3b8` | Text phụ |
| `--accent` | `#3b82f6` | Primary action |
| `--accent-hover` | `#2563eb` | Hover |
| `--danger` | `#ef4444` | Lỗi, xóa, cảnh báo |
| `--warning` | `#f59e0b` | Cảnh báo, sự cố, hạn đã cạn |
| `--success` | `#22c55e` | Hoàn thành, OK |
| `--info` | `#3b82f6` | Thông tin |
| `--border` | `#334155` | Border |
| `--bg-modal` | `#0f172a` | Modal overlay |

### 2.2 Typography

| Thẻ | Font | Size | Weight |
|---|---|---|---|
| Heading 1 | Inter | 24px | 700 |
| Heading 2 | Inter | 20px | 600 |
| Heading 3 | Inter | 18px | 600 |
| Body | Inter | 16px | 400 |
| Small | Inter | 14px | 400 |
| Caption | Inter | 12px | 400 |
| Code | Fira Code / JetBrains Mono | 13px | 400 |

### 2.3 Spacing

| Thẻ | Mã | Size |
|---|---|---|
| XS | 2 | 4px |
| S | 4 | 8px |
| M | 8 | 16px |
| L | 12 | 24px |
| XL | 16 | 32px |
| XXL | 24 | 48px |

### 2.4 Border Radius

| Loại | Mã | Size |
|---|---|---|
| Circle | `round-full` | 50% |
| Button | `round-btn` | 6px |
| Card | `round-card` | 8px |
| Input | `round-input` | 8px |
| Default | `round-default` | 4px |

### 2.5 Shadow

| Loại | Danh sách | Mô tả |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.1)` | Light |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.2)` | Default |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.3)` | Modal, popup |
| `shadow-xl` | `0 16px 48px rgba(0,0,0,0.4)` | Dropdown, hover |

---

## 3. Component Library

### 3.1 Buttons

| Loại | Màu | Mô tả |
|---|---|---|
| Primary | Blue (`#3b82f6`) | Đóng góp, submit |
| Secondary | Transparent | Nút phụ, secondary |
| Danger | Red (`#ef4444`) | Xóa, hủy, cấp |
| Ghost | Transparent | Xem, chỉnh sửa |
| Outline | Border | Lưu, print |

**Button states:**
- Default
- Hover
- Active/Pressed
- Disabled
- Loading

### 3.2 Inputs

- **Text input**: 1 line, placeholder, icon prefix/suffix
- **Textarea**: multiline, auto-grow, resize
- **Select**: dropdown, searchable, custom
- **Checkbox**: standard, indeterminate
- **Radio**: standard
- **Toggle**: switch, on/off
- **Range slider**: min, max, step

### 3.3 Badges

| Loại | Màu | Ý nghĩa |
|---|---|---|
| Active | Green | Active, OK |
| Warning | Yellow | Pending, chờ |
| Critical | Red | Lỗi, trễ, hết hạn |
| Info | Blue | Thông tin |
| Default | Gray | Mặc định |

### 3.4 Cards

- **Card**: chứa dữ liệu (progress, list, summary)
- **Card header**: title, action
- **Card footer**: button, summary
- **Card image**: thumbnail, gallery

### 3.5 Tables

- Sortable, filterable, searchable
- Pagination
- Row checkbox (multi-select)
- Row hover highlight
- Inline edit (optional)

### 3.6 Modals

- Create/edit form
- Confirm delete
- Detail view (full screen)
- Type: `modal-sm`, `modal-md`, `modal-lg`

---

## 4. Layout

### 4.1 Desktop

```
┌────────────┬──────────────────────────────┐
│ Sidebar    │ Main Content                 │
│ – Menu     │ – Header (page title)        │
│ – Role     │ – Content                    │
│ – Quick    │ – Table / Chart              │
│   Nav      │ – Footer Action              │
└────────────┴──────────────────────────────┘
```

### 4.2 Mobile

```
┌────────────┐
│ Header     │
│ Tên & role │
├────────────┤
│ Bottom nav │
│ Tabs       │
├────────────┤
│ Content    │
└────────────┘
```

---

## 5. User Flow

### 5.1 Login

```
Login → Validate → Redirect → Dashboard
```

### 5.2 Dashboard

```
Dashboard → Choose project → View project detail → Action
```

### 5.3 Project

```
Project list → Open → Detail (tabs: overview, progress, device, document)
  → Create report / Incident → Confirm → Success
```

### 5.4 Site Report

```
Site Report → Select project/site → Fields → Photo → Save draft → Submit
```

### 5.5 Alert

```
Alert received → Acknowledge → Assign → Resolve → Close
```

---

## 6. Responsive

| Device | Target | Notes |
|---|---|---|
| Mobile | < 768px | Bottom nav, minimal input |
| Tablet | 768–1024px | Sidebar becomes drawer |
| Desktop | > 1024px | Full sidebar + main layout |

---

## 7. Theme Tokens (CSS Variables)

### 7.1 Colors

```css
:root {
  /* Backgrounds */
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-card: #263244;
  --bg-modal: #0f172a;

  /* Text */
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;

  /* Brand */
  --accent: #3b82f6;
  --accent-hover: #2563eb;

  /* Status */
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --info: #3b82f6;

  /* Border */
  --border: #334155;
}
```

### 7.2 Typography

```css
:root {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
}
```

### 7.3 Spacing

```css
:root {
  --space-2: 4px;
  --space-4: 8px;
  --space-8: 16px;
  --space-12: 24px;
  --space-16: 32px;
  --space-24: 48px;
}
```

### 7.4 Border Radius

```css
:root {
  --radius-full: 50%;
  --radius-btn: 6px;
  --radius-card: 8px;
  --radius-input: 8px;
  --radius-default: 4px;
}
```

---

## 8. Testing UI/UX

- All pages on 3 devices
- Form validation
- Empty states
- Loading states
- Error states
- Accessibility (contrast, keyboard)
- Offline sync indicator
- Content localization (Vietnamese)
