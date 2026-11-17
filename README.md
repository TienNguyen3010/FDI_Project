# FDI_Project — requirements & release note
> Product: Website quản lý dự án, vận hành, sự cố & Site Report.
> Version: 1.0 · DRAFT

## What changed
- Chuyển repo từ SmartBuild (app-thuong) sang FDI_Project.
- Repo gốc: Next.js 16 + TypeScript + tailwind-4 + Turbopack.
- Thư mục mặc định: `app/`, `components/`, `lib/`, `public/`, `next.config.ts`, `tsconfig.json`, `package.json`.

## How to develop
- `npm run dev` -- run local dev server.
- `npm run build` -- production build.
- `npm run start` -- run production server.

## Notes
- Vercel: tự động detect Next.js, run `npm run build`, rồi `npm run start`.
- Bạn chỉ cần push code, không cần config đặc biệt.
