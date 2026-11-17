// FDI_Project — types (DB schema)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
  users: {
    Row: {
      id: string
      email: string
      password_hash: string
      role: 'employee' | 'leader' | 'manager' | 'director'
      team: string | null
      active: boolean
      created_at: string
      updated_at: string
    }
    Insert: {
      id: string
      email: string
      password_hash: string
      role: 'employee' | 'leader' | 'manager' | 'director'
      team?: string | null
      active?: boolean
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      email?: string
      password_hash?: string
      role?: 'employee' | 'leader' | 'manager' | 'director'
      team?: string | null
      active?: boolean
      created_at?: string
      updated_at?: string
    }
    Relationships: [],
  }
  customers: {
    Row: {
      id: string
      name: string
      phone: string | null
      email: string | null
      industry: string | null
      contact_technical: string | null
      contact_commercial: string | null
      contact_emergency: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id: string
      name: string
      phone?: string | null
      email?: string | null
      industry?: string | null
      contact_technical?: string | null
      contact_commercial?: string | null
      contact_emergency?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      name?: string
      phone?: string | null
      email?: string | null
      industry?: string | null
      contact_technical?: string | null
      contact_commercial?: string | null
      contact_emergency?: string | null
      created_at?: string
      updated_at?: string
    }
    Relationships: [],
  }
  sites: {
    Row: {
      id: string
      name: string
      customer_id: string
      address: string | null
      contact: string | null
      working_hours: Json | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id: string
      name: string
      customer_id: string
      address?: string | null
      contact?: string | null
      working_hours?: Json | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      name?: string
      customer_id?: string
      address?: string | null
      contact?: string | null
      working_hours?: Json | null
      created_at?: string
      updated_at?: string
    }
    Relationships: [],
  }
  projects: {
    Row: {
      id: string
      customer_id: string
      site_id: string | null
      name: string
      status:
        | 'planned'
        | 'in_progress'
        | 'deployed'
        | 'paused'
        | 'ended'
      start_date: string | null
      end_date: string | null
      progress: number
      pm_id: string | null
      color: string | null
      checklist: Json | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id: string
      customer_id: string
      site_id?: string | null
      name: string
      status?: 'planned' | 'in_progress' | 'deployed' | 'paused' | 'ended'
      start_date?: string | null
      end_date?: string | null
      progress?: number
      pm_id?: string | null
      color?: string | null
      checklist?: Json | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      customer_id?: string
      site_id?: string | null
      name?: string
      status?: 'planned' | 'in_progress' | 'deployed' | 'paused' | 'ended'
      start_date?: string | null
      end_date?: string | null
      progress?: number
      pm_id?: string | null
      color?: string | null
      checklist?: Json | null
      created_at?: string
      updated_at?: string
    }
    Relationships: [],
  }
  devices: {
    Row: {
      id: string
      project_id: string
      site_id: string | null
      serial: string
      type: string
      model: string | null
      mac_address: string | null
      rack_id: string | null
      location: string | null
      warranty_from: string | null
      warranty_to: string | null
      status: 'active' | 'inactive' | 'expired'
      created_at: string
      updated_at: string
    }
    Insert: {
      id: string
      project_id: string
      site_id?: string | null
      serial: string
      type: string
      model?: string | null
      mac_address?: string | null
      rack_id?: string | null
      location?: string | null
      warranty_from?: string | null
      warranty_to?: string | null
      status?: 'active' | 'inactive' | 'expired'
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      project_id?: string
      site_id?: string | null
      serial?: string
      type?: string
      model?: string | null
      mac_address?: string | null
      rack_id?: string | null
      location?: string | null
      warranty_from?: string | null
      warranty_to?: string | null
      status?: 'active' | 'inactive' | 'expired'
      created_at?: string
      updated_at?: string
    }
    Relationships: [],
  }
  alerts: {
    Row: {
      id: string
      device_id: string | null
      site_id: string | null
      project_id: string
      severity: 'critical' | 'major' | 'minor'
      status: string
      priority: 'low' | 'medium' | 'high' | 'critical'
      owner_id: string | null
      description: string
      source: string | null
      created_at: string
      updated_at: string
      resolved_at: string | null
    }
    Insert: {
      id: string
      device_id?: string | null
      site_id?: string | null
      project_id: string
      severity: 'critical' | 'major' | 'minor'
      status: string
      priority: 'low' | 'medium' | 'high' | 'critical'
      owner_id?: string | null
      description: string
      source?: string | null
      created_at?: string
      updated_at?: string
      resolved_at?: string | null
    }
    Update: {
      id?: string
      device_id?: string | null
      site_id?: string | null
      project_id?: string
      severity?: 'critical' | 'major' | 'minor'
      status?: string
      priority?: 'low' | 'medium' | 'high' | 'critical'
      owner_id?: string | null
      description?: string
      source?: string | null
      created_at?: string
      updated_at?: string
      resolved_at?: string | null
    }
    Relationships: [],
  }
  maintenances: {
    Row: {
      id: string
      device_id: string | null
      project_id: string
      type: 'regular' | 'emergency'
      schedule: Json | null
      due_date: string | null
      status: string
      checklist: Json | null
      result: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id: string
      device_id?: string | null
      project_id: string
      type?: 'regular' | 'emergency'
      schedule?: Json | null
      due_date?: string | null
      status?: string
      checklist?: Json | null
      result?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      device_id?: string | null
      project_id?: string
      type?: 'regular' | 'emergency'
      schedule?: Json | null
      due_date?: string | null
      status?: string
      checklist?: Json | null
      result?: string | null
      created_at?: string
      updated_at?: string
    }
    Relationships: [],
  }
  works: {
    Row: {
      id: string
      project_id: string
      incident_id: string | null
      assignee_id: string | null
      creator_id: string | null
      type: string
      title: string
      description: string | null
      status: string
      priority: string
      due_date: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id: string
      project_id: string
      incident_id?: string | null
      assignee_id?: string | null
      creator_id?: string | null
      type: string
      title: string
      description?: string | null
      status?: string
      priority?: string
      due_date?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      project_id?: string
      incident_id?: string | null
      assignee_id?: string | null
      creator_id?: string | null
      type?: string
      title?: string
      description?: string | null
      status?: string
      priority?: string
      due_date?: string | null
      created_at?: string
      updated_at?: string
    }
    Relationships: [],
  }
  reports: {
    Row: {
      id: string
      project_id: string
      user_id: string
      type: 'survey' | 'deployment' | 'maintenance'
      content: string | null
      progress: Json | null
      photos: Json | null
      signature: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id: string
      project_id: string
      user_id: string
      type?: 'survey' | 'deployment' | 'maintenance'
      content?: string | null
      progress?: Json | null
      photos?: Json | null
      signature?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      project_id?: string
      user_id?: string
      type?: 'survey' | 'deployment' | 'maintenance'
      content?: string | null
      progress?: Json | null
      photos?: Json | null
      signature?: string | null
      created_at?: string
      updated_at?: string
    }
    Relationships: [],
  }
  documents: {
    Row: {
      id: string
      project_id: string
      name: string
      file_url: string
      type: string
      version: number
      created_at: string
      updated_at: string
    }
    Insert: {
      id: string
      project_id: string
      name: string
      file_url: string
      type: string
      version?: number
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      project_id?: string
      name?: string
      file_url?: string
      type?: string
      version?: number
      created_at?: string
      updated_at?: string
    }
    Relationships: [],
  }
  audit_logs: {
    Row: {
      id: string
      user_id: string
      action: string
      resource_type: string
      resource_id: string | null
      ip: string | null
      user_agent: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id: string
      user_id: string
      action: string
      resource_type: string
      resource_id?: string | null
      ip?: string | null
      user_agent?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      user_id?: string
      action?: string
      resource_type?: string
      resource_id?: string | null
      ip?: string | null
      user_agent?: string | null
      created_at?: string
      updated_at?: string
    }
    Relationships: [],
  }
  config: {
    Row: {
      id: string
      name: string
      type: string
      value: Json
      color: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id: string
      name: string
      type: string
      value: Json
      color?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      name?: string
      type?: string
      value?: Json
      color?: string | null
      created_at?: string
      updated_at?: string
    }
    Relationships: [],
  }

    },
    Views: Record<string, never>,
    Functions: Record<string, never>,
    Enums: Record<string, never>,
    CompositeTypes: Record<string, never>,
  }
}
