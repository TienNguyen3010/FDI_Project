// FDI_Project — Supabase client (shared server/browser)
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'

// Không tạo client lúc import: `next build` chỉ collect page data, không cần credential.
// Client được tạo lazily ở lần truy cập đầu tiên (runtime), lúc đó mới validate env.
function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set'
    )
  }
  return { url, anonKey }
}

const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: { 'x-supabase-auth-mode': 'pg' },
  },
}

let client: SupabaseClient<Database> | null = null
function getClient(): SupabaseClient<Database> {
  if (!client) {
    const { url, anonKey } = getEnv()
    client = createClient<Database>(url, anonKey, options)
  }
  return client
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const value = (getClient() as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? value.bind(getClient()) : value
  },
}) as SupabaseClient<Database>
