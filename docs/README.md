# 📚 FDI_Project — Tài liệu

> Tất cả tài liệu thiết kế, checklist và báo cáo rà soát được gom tại đây (2026-11-17).
> Mỗi file có header nhắc rằng các tham chiếu `ten_file.md:line` trong nội dung đều trỏ tới file cùng thư mục `docs/`.

## Sản phẩm & yêu cầu
| Tài liệu | Nội dung |
|---|---|
| [product.md](product.md) | PRD — yêu cầu nghiệp vụ, tính năng, acceptance criteria |
| [roadmap.md](roadmap.md) | Lộ trình Bản 1 / 2 / 3 |
| [ui_ux_spec.md](ui_ux_spec.md) | Thiết kế giao diện, design tokens, component |
| [rbac_matrix.md](rbac_matrix.md) | Ma trận 4 role Employee/Leader/Manager/Director |

## Kỹ thuật
| Tài liệu | Nội dung |
|---|---|
| [tech_spec.md](tech_spec.md) | Kiến trúc, công nghệ, môi trường, bảo mật |
| [api_spec.md](api_spec.md) | Đặc tả REST API (`/api/v1`), error format, rate limit |
| [project_structure.md](project_structure.md) | Cấu trúc thư mục (lưu ý: mô tả cũ backend/frontend, thực tế monorepo Next.js) |

## Kiểm soát & theo dõi
| Tài liệu | Nội dung |
|---|---|
| [checklist.md](checklist.md) | **Checklist tiến độ chính** — trạng thái ✅/❌/⏳ + Nhật ký xác minh (§12) |
| [SPEC_REALITY_CHECK.md](SPEC_REALITY_CHECK.md) | Rà soát tài liệu vs code thật (có `file:line`) |

## Thiết kế & vận hành
| Tài liệu | Nội dung |
|---|---|
| [DESIGN_WIREFRAMES.md](DESIGN_WIREFRAMES.md) | User flow 4 role + wireframe desktop/mobile + component map (thay Figma) |
| [BACKUP_RESTORE.md](BACKUP_RESTORE.md) | Quy trình pg_dump/pg_restore + verify (§3 #7, §5 #14) |
| [PRD_OWNERSHIP.md](PRD_OWNERSHIP.md) | Owner, requirement, acceptance criteria, test plan cho mọi module (§9) |
| [RELEASE_NOTES.md](RELEASE_NOTES.md) | Release note v1.0 + pre-release/hotfix (§8 #9) |
| [USER_GUIDE.md](USER_GUIDE.md) | Hướng dẫn sử dụng theo 4 role |

> Schema CSDL nằm ở [`database_schema.sql`](../database_schema.sql) (root).
> Hướng dẫn migration nằm ở [`migrations/README.md`](../migrations/README.md).
