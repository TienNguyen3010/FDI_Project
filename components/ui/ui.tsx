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
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Info,
  X,
} from 'lucide-react'

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
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
        "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
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
        "flex min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  )
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between p-6 pt-0", className)} {...props} />
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-muted/50 text-sm", className)} {...props} />
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("bg-primary/5", className)} {...props} />
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b transition-colors hover:bg-muted/50", className)}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("h-12 px-4 text-left align-middle font-medium text-muted-foreground", className)}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("h-12 px-4 align-middle", className)}
      {...props}
    />
  )
}

export type BadgeVariant =
  | "default"
  | "critical"
  | "major"
  | "minor"
  | "active"
  | "inactive"
  | "planned"
  | "in-progress"
  | "deployed"
  | "paused"
  | "ended"

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  // Nhiều variant dùng chung style -> gom lại để tránh duplicate key trong object literal.
  const neutral = "bg-gray-500/10 text-gray-400 border border-gray-500/20"
  const styleByVariant: Record<BadgeVariant, string> = {
    default: neutral,
    critical: "bg-red-500/10 text-red-400 border border-red-500/20",
    major: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    minor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    inactive: neutral,
    planned: neutral,
    "in-progress": "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    deployed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    paused: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    ended: neutral,
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        styleByVariant[variant],
        className
      )}
      {...props}
    />
  )
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export function Tabs({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("inline-flex space-x-1 border-b border-border bg-muted/50 p-1", className)}
      {...props}
    />
  )
}

export function TabList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex", className)} {...props} />
}

export function Tab({ className, ...props }: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "border-b-2 border-transparent data-[active=true]:border-primary data-[active=true]:text-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export function Modal({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-center justify-center bg-background/80", className)}
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
        "w-full max-w-lg rounded-lg border border-border bg-card text-card-foreground shadow-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function ModalHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-2 p-6", className)} {...props} />
}

export function ModalTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-xl font-semibold leading-none tracking-tight", className)} {...props} />
}

export function ModalBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />
}

export function ModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex justify-end gap-2 p-6 pt-0", className)} {...props} />
}

/* -------------------------------------------------------------------------- */
/*  Trạng thái hiển thị: loading / empty — checklist §7 #7, #9                */
/* -------------------------------------------------------------------------- */

/** Spinner — chỉ báo đang tải, màu theo token --accent. */
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
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-[var(--accent)] text-[var(--text-secondary)] align-middle',
        className
      )}
    />
  )
}

/** Skeleton — khối xương nhấp nháy trong lúc tải dữ liệu. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-[var(--bg-secondary)]', className)}
      {...props}
    />
  )
}

/** EmptyState — icon + tiêu đề + mô tả + nút hành động tuỳ chọn. */
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
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-4 py-10 text-center',
        className
      )}
    >
      <div className="mb-1 text-[var(--text-secondary)]" aria-hidden="true">
        {icon ?? <Inbox size={32} strokeWidth={1.5} />}
      </div>
      <p className="text-base font-medium text-[var(--text-primary)]">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-[var(--text-secondary)]">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Toast / notification — checklist §1 #15, §7 #8                           */
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

/** Bọc ứng dụng để cung cấp vùng hiển thị toast (góc phải trên). */
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
    [dismiss]
  )

  // Dọn hết timer khi provider unmount để tránh setState sau khi huỷ.
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
    [toast, dismiss]
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
              className="pointer-events-auto flex items-start gap-3 rounded-lg border bg-[var(--bg-card)] p-3 text-[var(--text-primary)] shadow-lg"
              style={{ borderColor: style.accent, borderLeftWidth: 4 }}
            >
              <span className="mt-0.5 shrink-0" style={{ color: style.accent }} aria-hidden="true">
                {style.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 break-words text-xs text-[var(--text-secondary)]">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Đóng thông báo"
                className="shrink-0 rounded p-0.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
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

/** Hook dùng trong component con của ToastProvider. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast phải được dùng bên trong <ToastProvider>')
  }
  return ctx
}
