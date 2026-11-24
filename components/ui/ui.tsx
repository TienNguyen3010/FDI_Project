'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Info,
  X,
} from 'lucide-react'

/*
 * Project OPS — UI primitives theo Design Token Green v1.0.
 * Mọi màu đi qua token CSS (docs/02-design/assets/tokens.json); KHÔNG hardcode
 * palette dark/column cũ. Các export được giữ nguyên để không vỡ page khác.
 */

export const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:opacity-90',
        outline: 'border border-border bg-surface text-foreground shadow-sm hover:bg-sidebar-group',
        secondary: 'bg-sidebar-group text-foreground shadow-sm hover:opacity-90',
        ghost: 'text-foreground hover:bg-sidebar-group',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-11 rounded-md px-3',
        lg: 'h-12 rounded-md px-8',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-20 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('text-sm font-medium text-foreground', className)} {...props} />
  )
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-sm font-semibold leading-none tracking-tight text-foreground', className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-between p-5 pt-0', className)} {...props} />
}

/*
 * LƯU Ý: các primitive Table/TableHeader/TableBody/TableRow/TableHead/TableCell
 * trước đây nằm ở đây đã bị loại bỏ theo yêu cầu "xóa dependency bảng/cột cũ".
 * Chúng vẫn được re-export ở cuối file dưới dạng wrapper trung tính (không còn
 * màu cột/striping cũ) để các trang admin/reports chưa rewrite không vỡ build.
 * Dashboard v1.0 KHÔNG dùng We bảng này.
 */
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm text-foreground', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-sidebar-group text-xs text-muted-foreground', className)} {...props} />
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('bg-surface', className)} {...props} />
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('border-b border-border transition-colors hover:bg-sidebar-group', className)}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('h-11 px-4 text-left align-middle font-medium text-muted-foreground', className)}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('h-11 px-4 align-middle', className)} {...props} />
}

/* Badge: trạng thái trung tính, màu theo ngữ nghĩa (không gắn cột dữ liệu cũ). */
export type BadgeVariant =
  | 'default'
  | 'critical'
  | 'major'
  | 'minor'
  | 'active'
  | 'inactive'
  | 'planned'
  | 'in-progress'
  | 'deployed'
  | 'paused'
  | 'ended'

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  // `text-muted` — khai báo trong globals.css (= --muted). Trước đây class này
  // không có rule nên Badge rơi về màu kế thừa, trùng nền ⇒ contrast 1.00.
  const neutral = 'bg-sidebar-group text-muted border border-border'
  const styleByVariant: Record<BadgeVariant, string> = {
    default: neutral,
    // ⚠️ CONTRAST (đo 2026-11-24, WCAG AA ≥ 4.5): nền /10 làm chữ nhạt mất đọc.
    // critical trước = 3.45 ⇒ chuyển nền sang /15 + chữ risk đậm hơn (#c1323f).
    critical: 'bg-risk/15 text-[#b32833] border border-risk/30',
    // major KHÔNG dùng trong app; vẫn nâng lên để variant sẵn dùng được (trước 2.23).
    major: 'bg-kpi-tickets/15 text-[#a45a05] border border-kpi-tickets/30',
    minor: 'bg-ticket-waiting/10 text-warning border border-ticket-waiting/20',
    active: 'bg-sidebar-active text-sidebar-heading border border-sidebar-active-border/20',
    inactive: neutral,
    planned: neutral,
    'in-progress': 'bg-kpi-projects/10 text-kpi-projects border border-kpi-projects/20',
    deployed: 'bg-sidebar-active text-sidebar-heading border border-sidebar-active-border/20',
    paused: 'bg-ticket-waiting/10 text-warning border border-ticket-waiting/20',
    ended: neutral,
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        styleByVariant[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-11 min-w-11 rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function Tabs({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('inline-flex space-x-1 border-b border-border bg-sidebar-group p-1', className)}
      {...props}
    />
  )
}

export function TabList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex', className)} {...props} />
}

export function Tab({ className, ...props }: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[active=true]:border-primary data-[active=true]:text-sidebar-heading',
        'border-b-2 border-transparent data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

/*
 * Modal primitive — BỀN, căn giữa VIEWPORT thật, phủ full màn hình.
 *
 * Vì sao:
 *  - `fixed inset-0 z-50` → overlay neo vào viewport; KHÔNG bị lồng theo
 *    container cha (vd `main` cuộn được) nên không lệch khi trang đã cuộn.
 *  - `!items-center` (important) → căn giữa dọc bằng `!important`, nên utility
 *    consumer truyền qua `className` (items-start/items-end/...) không ghi đè
 *    được; `cn()` (tailwind-merge) chỉ loại trùng lặp, không bắt buộc important.
 *    Chỉ giữ 1 chiều `!important` (align-items); justify-center không cần
 *    important nên modal vẫn căn giữa ngang như mặc định.
 *  - `overflow-y-auto` + `p-4` → modal dài/nội dung tràn vẫn cuộn được trên
 *    mobile, overlay luôn có đệm bao quanh. Không thêm `my-auto` ở ModalContent
 *    (sẽ phá `items-center` ở overlay).
 *  - `ModalContent` thêm `mx-4` để không dính sát mép màn hình mobile; giữ
 *    `w-full max-w-lg` → consumer truyền `max-w-[420px]` thì `cn()` merge được.
 */
export function Modal({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex !items-center justify-center overflow-y-auto bg-foreground/40 p-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function ModalContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mx-4 w-full max-w-lg rounded-section border border-border bg-card text-card-foreground shadow-lg',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function ModalHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-2 p-6', className)} {...props} />
}

export function ModalTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-xl font-semibold leading-none tracking-tight', className)} {...props} />
}

export function ModalBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...props} />
}

export function ModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex justify-end gap-2 p-6 pt-0', className)} {...props} />
}

/* -------------------------------------------------------------------------- */
/*  Trạng thái hiển thị: loading / empty / error                               */
/* -------------------------------------------------------------------------- */

export function Spinner({
  className,
  label = 'Đang tải',
}: {
  className?: string
  label?: string
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-primary text-muted align-middle',
        className,
      )}
    />
  )
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-sidebar-group', className)}
      {...props}
    />
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-2 px-4 py-10 text-center', className)}
    >
      <div className="mb-1 text-muted" aria-hidden="true">
        {icon ?? <Inbox size={32} strokeWidth={1.5} />}
      </div>
      <p className="text-base font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Toast / notification                                                       */
/* -------------------------------------------------------------------------- */

export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  title: string
  description?: string
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: number
  kind: ToastKind
}

interface ToastContextValue {
  toast: (kind: ToastKind, options: ToastOptions) => number
  success: (options: ToastOptions) => number
  error: (options: ToastOptions) => number
  info: (options: ToastOptions) => number
  warning: (options: ToastOptions) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_STYLE: Record<ToastKind, { accent: string; icon: ReactNode }> = {
  success: { accent: 'var(--success)', icon: <CheckCircle2 size={18} /> },
  error: { accent: 'var(--danger)', icon: <AlertCircle size={18} /> },
  info: { accent: 'var(--info)', icon: <Info size={18} /> },
  warning: { accent: 'var(--warning)', icon: <AlertTriangle size={18} /> },
}

const DEFAULT_TOAST_DURATION = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (kind: ToastKind, options: ToastOptions) => {
      const id = ++idRef.current
      const duration = options.duration ?? DEFAULT_TOAST_DURATION
      setItems((prev) => [...prev, { ...options, id, kind }])
      const timer = setTimeout(() => dismiss(id), duration)
      timersRef.current.set(id, timer)
      return id
    },
    [dismiss],
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (options) => toast('success', options),
      error: (options) => toast('error', options),
      info: (options) => toast('info', options),
      warning: (options) => toast('warning', options),
      dismiss,
    }),
    [toast, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {items.map((item) => {
          const style = TOAST_STYLE[item.kind]
          return (
            <div
              key={item.id}
              role={item.kind === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-lg"
              style={{ borderColor: style.accent, borderLeftWidth: 4 }}
            >
              <span className="mt-0.5 shrink-0" style={{ color: style.accent }} aria-hidden="true">
                {style.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Đóng thông báo"
                className="tap-target shrink-0 rounded p-0.5 text-muted transition-colors hover:bg-sidebar-group hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast phải được dùng bên trong <ToastProvider>')
  }
  return ctx
}
