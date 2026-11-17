// Ma trận quyền dùng chung (tách khỏi route handler: Next 16 chỉ cho export method HTTP).
export const ROLE_MATRIX = [
  { feature: 'Dashboard', employee: 'Phần việc của mình', leader: 'Của team', manager: 'Của phòng', director: 'Toàn công ty' },
  { feature: 'Project', employee: 'Xem & cập nhật dự án được gán', leader: 'Tạo/Sửa dự án team, duyệt checklist', manager: 'Toàn bộ dự án phòng, đổi trạng thái', director: 'Xem tất cả, duyệt nghiệm thu' },
  { feature: 'Customer', employee: 'Xem', leader: 'Xem, sửa liên hệ', manager: 'Thêm/Sửa', director: 'Toàn quyền, hợp đồng & giá trị' },
  { feature: 'Device / Serial', employee: 'Nhập khi được gán', leader: 'Sửa / Duyệt', manager: 'Sửa / Xóa', director: 'Xem' },
  { feature: 'Incident', employee: 'Nhận & xử lý', leader: 'Giao việc, đóng', manager: 'Duyệt RCA, xem SLA', director: 'Xem báo cáo' },
  { feature: 'Maintenance', employee: 'Thực hiện', leader: 'Lập lịch', manager: 'Duyệt kế hoạch', director: 'Xem' },
  { feature: 'Work', employee: 'Của mình', leader: 'Giao cho team', manager: 'Giao cho Leader', director: 'Xem' },
  { feature: 'Site Report', employee: 'Tạo', leader: 'Duyệt', manager: 'Duyệt, xuất cho khách', director: 'Xem' },
  { feature: 'Admin', employee: '❌', leader: '❌', manager: 'Thêm user, team', director: 'Toàn quyền' },
] as const
