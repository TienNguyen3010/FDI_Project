// FDI_Project — Supabase server client (for route handlers)
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'

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

// Lazy: chỉ validate env khi thật sự gọi (runtime), không lúc build.
export function createSupabaseServerClient(): SupabaseClient<Database> {
  const { url, anonKey } = getEnv()
  return createClient<Database>(url, anonKey, options)
}

export function getSupabaseClient(): SupabaseClient<Database> {
  return createSupabaseServerClient()
}
