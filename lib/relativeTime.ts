/** Thời gian tương đối (chênh), vd "3 ngày trước". null khi không parse được.
 *  Dùng chung cho bảng + detail panel khách hàng. */
export function relativeTimeLabel(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const diffMs = Date.now() - date.getTime()
  const abs = Math.abs(diffMs)
  const minutes = Math.round(abs / 60000)
  const hours = Math.round(abs / 3600000)
  const days = Math.round(abs / 86400000)
  const months = Math.round(abs / (86400000 * 30))
  const years = Math.round(abs / (86400000 * 365))
  const span =
    minutes < 1 ? 'vừa xong'
      : minutes < 60 ? `${minutes} phút`
        : hours < 24 ? `${hours} giờ`
          : days < 30 ? `${days} ngày`
            : months < 12 ? `${months} tháng`
              : `${years} năm`
  return diffMs >= 0 ? `${span} trước` : `sau ${span}`
}
