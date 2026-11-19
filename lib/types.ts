// FDI_Project — Supabase Database types
// Generated from docs/03-contracts/database/001_core.sql (18 tables).
// Mapping: uuid/text -> string, timestamptz -> string, jsonb -> Json,
//          int/numeric -> number. Columns with a DEFAULT are optional in Insert;
//          nullable columns are `T | null`; all columns are optional in Update.

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
        Row: { id: string; email: string; role: string; team: string | null; active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; email: string; role?: string; team?: string | null; active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; email?: string; role?: string; team?: string | null; active?: boolean; created_at?: string; updated_at?: string }
        Relationships: []
      }
      user_grants: {
        Row: { user_id: string; customer_id: string; created_at: string }
        Insert: { user_id: string; customer_id: string; created_at?: string }
        Update: { user_id?: string; customer_id?: string; created_at?: string }
        Relationships: []
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
          tax_id: string | null
          headquarters_address: string | null
          primary_contact_name: string | null
          primary_contact_position: string | null
          notes: string | null
          consent_contact: boolean
          consent_contact_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          email?: string | null
          industry?: string | null
          contact_technical?: string | null
          contact_commercial?: string | null
          contact_emergency?: string | null
          tax_id?: string | null
          headquarters_address?: string | null
          primary_contact_name?: string | null
          primary_contact_position?: string | null
          notes?: string | null
          consent_contact?: boolean
          consent_contact_at?: string | null
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
          tax_id?: string | null
          headquarters_address?: string | null
          primary_contact_name?: string | null
          primary_contact_position?: string | null
          notes?: string | null
          consent_contact?: boolean
          consent_contact_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          id: string
          customer_id: string
          code: string
          name: string
          timezone: string
        }
        Insert: {
          id?: string
          customer_id: string
          code: string
          name: string
          timezone?: string
        }
        Update: {
          id?: string
          customer_id?: string
          code?: string
          name?: string
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sites_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
        ]
      }
      projects: {
        Row: {
          id: string
          customer_id: string
          code: string
          name: string
          status: 'draft' | 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled'
          version: number
        }
        Insert: {
          id?: string
          customer_id: string
          code: string
          name: string
          status?: 'draft' | 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled'
          version?: number
        }
        Update: {
          id?: string
          customer_id?: string
          code?: string
          name?: string
          status?: 'draft' | 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled'
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'projects_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
        ]
      }
      project_sites: {
        Row: {
          project_id: string
          site_id: string
          customer_id: string
        }
        Insert: {
          project_id: string
          site_id: string
          customer_id: string
        }
        Update: {
          project_id?: string
          site_id?: string
          customer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_sites_project_id_customer_id_fkey'
            columns: ['project_id', 'customer_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id', 'customer_id']
          },
          {
            foreignKeyName: 'project_sites_site_id_customer_id_fkey'
            columns: ['site_id', 'customer_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id', 'customer_id']
          },
        ]
      }
      locations: {
        Row: {
          id: string
          site_id: string
          parent_id: string | null
          kind: 'building' | 'floor' | 'room' | 'rack' | 'other'
          code: string
        }
        Insert: {
          id?: string
          site_id: string
          parent_id?: string | null
          kind: 'building' | 'floor' | 'room' | 'rack' | 'other'
          code: string
        }
        Update: {
          id?: string
          site_id?: string
          parent_id?: string | null
          kind?: 'building' | 'floor' | 'room' | 'rack' | 'other'
          code?: string
        }
        Relationships: [
          {
            foreignKeyName: 'locations_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'locations_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      assets: {
        Row: {
          id: string
          customer_id: string
          asset_code: string
          manufacturer: string
          model: string
          serial_number: string | null
          status: 'received' | 'in_stock' | 'assigned' | 'installed' | 'active' | 'repair' | 'replaced' | 'retired'
          version: number
        }
        Insert: {
          id?: string
          customer_id: string
          asset_code: string
          manufacturer: string
          model: string
          serial_number?: string | null
          status?: 'received' | 'in_stock' | 'assigned' | 'installed' | 'active' | 'repair' | 'replaced' | 'retired'
          version?: number
        }
        Update: {
          id?: string
          customer_id?: string
          asset_code?: string
          manufacturer?: string
          model?: string
          serial_number?: string | null
          status?: 'received' | 'in_stock' | 'assigned' | 'installed' | 'active' | 'repair' | 'replaced' | 'retired'
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'assets_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
        ]
      }
      asset_placements: {
        Row: {
          id: string
          asset_id: string
          location_id: string
          valid_from: string
          valid_to: string | null
          actor_id: string
          reason: string
        }
        Insert: {
          id?: string
          asset_id: string
          location_id: string
          valid_from?: string
          valid_to?: string | null
          actor_id: string
          reason: string
        }
        Update: {
          id?: string
          asset_id?: string
          location_id?: string
          valid_from?: string
          valid_to?: string | null
          actor_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: 'asset_placements_asset_id_fkey'
            columns: ['asset_id']
            isOneToOne: false
            referencedRelation: 'assets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'asset_placements_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      asset_replacements: {
        Row: {
          id: string
          old_asset_id: string
          new_asset_id: string
          work_order_ref: string | null
          actor_id: string
          occurred_at: string
        }
        Insert: {
          id?: string
          old_asset_id: string
          new_asset_id: string
          work_order_ref?: string | null
          actor_id: string
          occurred_at?: string
        }
        Update: {
          id?: string
          old_asset_id?: string
          new_asset_id?: string
          work_order_ref?: string | null
          actor_id?: string
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'asset_replacements_old_asset_id_fkey'
            columns: ['old_asset_id']
            isOneToOne: false
            referencedRelation: 'assets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'asset_replacements_new_asset_id_fkey'
            columns: ['new_asset_id']
            isOneToOne: false
            referencedRelation: 'assets'
            referencedColumns: ['id']
          },
        ]
      }
      services: {
        Row: {
          id: string
          customer_id: string
          code: string
          name: string
        }
        Insert: {
          id?: string
          customer_id: string
          code: string
          name: string
        }
        Update: {
          id?: string
          customer_id?: string
          code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'services_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
        ]
      }
      configuration_items: {
        Row: {
          id: string
          customer_id: string
          asset_id: string | null
          ci_type: string
          name: string
          status: string
        }
        Insert: {
          id?: string
          customer_id: string
          asset_id?: string | null
          ci_type: string
          name: string
          status?: string
        }
        Update: {
          id?: string
          customer_id?: string
          asset_id?: string | null
          ci_type?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'configuration_items_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'configuration_items_asset_id_fkey'
            columns: ['asset_id']
            isOneToOne: false
            referencedRelation: 'assets'
            referencedColumns: ['id']
          },
        ]
      }
      service_ci: {
        Row: {
          service_id: string
          ci_id: string
        }
        Insert: {
          service_id: string
          ci_id: string
        }
        Update: {
          service_id?: string
          ci_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'service_ci_service_id_fkey'
            columns: ['service_id']
            isOneToOne: false
            referencedRelation: 'services'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_ci_ci_id_fkey'
            columns: ['ci_id']
            isOneToOne: false
            referencedRelation: 'configuration_items'
            referencedColumns: ['id']
          },
        ]
      }
      ci_relations: {
        Row: {
          source_ci_id: string
          target_ci_id: string
          relation_type: string
        }
        Insert: {
          source_ci_id: string
          target_ci_id: string
          relation_type: string
        }
        Update: {
          source_ci_id?: string
          target_ci_id?: string
          relation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ci_relations_source_ci_id_fkey'
            columns: ['source_ci_id']
            isOneToOne: false
            referencedRelation: 'configuration_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ci_relations_target_ci_id_fkey'
            columns: ['target_ci_id']
            isOneToOne: false
            referencedRelation: 'configuration_items'
            referencedColumns: ['id']
          },
        ]
      }
      diagrams: {
        Row: {
          id: string
          site_id: string
          kind: 'floor' | 'rack' | 'topology'
          title: string
        }
        Insert: {
          id?: string
          site_id: string
          kind: 'floor' | 'rack' | 'topology'
          title: string
        }
        Update: {
          id?: string
          site_id?: string
          kind?: 'floor' | 'rack' | 'topology'
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'diagrams_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id']
          },
        ]
      }
      diagram_versions: {
        Row: {
          id: string
          diagram_id: string
          revision: number
          status: 'draft' | 'review' | 'approved' | 'superseded'
          created_at: string
        }
        Insert: {
          id?: string
          diagram_id: string
          revision: number
          status?: 'draft' | 'review' | 'approved' | 'superseded'
          created_at?: string
        }
        Update: {
          id?: string
          diagram_id?: string
          revision?: number
          status?: 'draft' | 'review' | 'approved' | 'superseded'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'diagram_versions_diagram_id_fkey'
            columns: ['diagram_id']
            isOneToOne: false
            referencedRelation: 'diagrams'
            referencedColumns: ['id']
          },
        ]
      }
      diagram_nodes: {
        Row: {
          id: string
          version_id: string
          asset_id: string | null
          ci_id: string | null
          x: number
          y: number
        }
        Insert: {
          id?: string
          version_id: string
          asset_id?: string | null
          ci_id?: string | null
          x: number
          y: number
        }
        Update: {
          id?: string
          version_id?: string
          asset_id?: string | null
          ci_id?: string | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: 'diagram_nodes_version_id_fkey'
            columns: ['version_id']
            isOneToOne: false
            referencedRelation: 'diagram_versions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'diagram_nodes_asset_id_fkey'
            columns: ['asset_id']
            isOneToOne: false
            referencedRelation: 'assets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'diagram_nodes_ci_id_fkey'
            columns: ['ci_id']
            isOneToOne: false
            referencedRelation: 'configuration_items'
            referencedColumns: ['id']
          },
        ]
      }
      tickets: {
        Row: {
          id: string
          customer_id: string
          site_id: string | null
          code: string
          type: 'incident' | 'service_request'
          priority: 'p1' | 'p2' | 'p3' | 'p4'
          status: 'new' | 'triaged' | 'assigned' | 'in_progress' | 'resolved' | 'closed'
          version: number
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          site_id?: string | null
          code: string
          type: 'incident' | 'service_request'
          priority: 'p1' | 'p2' | 'p3' | 'p4'
          status?: 'new' | 'triaged' | 'assigned' | 'in_progress' | 'resolved' | 'closed'
          version?: number
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          site_id?: string | null
          code?: string
          type?: 'incident' | 'service_request'
          priority?: 'p1' | 'p2' | 'p3' | 'p4'
          status?: 'new' | 'triaged' | 'assigned' | 'in_progress' | 'resolved' | 'closed'
          version?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tickets_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tickets_site_id_customer_id_fkey'
            columns: ['site_id', 'customer_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id', 'customer_id']
          },
        ]
      }
      ticket_events: {
        Row: {
          id: string
          ticket_id: string
          actor_id: string | null
          event_type: string
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          actor_id?: string | null
          event_type: string
          payload: Json
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          actor_id?: string | null
          event_type?: string
          payload?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey'
            columns: ['ticket_id']
            isOneToOne: false
            referencedRelation: 'tickets'
            referencedColumns: ['id']
          },
        ]
      }
      outbox_events: {
        Row: {
          id: string
          dedupe_key: string
          event_type: string
          aggregate_id: string
          payload: Json
          status: 'pending' | 'processing' | 'delivered' | 'dead'
          attempts: number
          available_at: string
          locked_at: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          dedupe_key: string
          event_type: string
          aggregate_id: string
          payload: Json
          status?: 'pending' | 'processing' | 'delivered' | 'dead'
          attempts?: number
          available_at?: string
          locked_at?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          dedupe_key?: string
          event_type?: string
          aggregate_id?: string
          payload?: Json
          status?: 'pending' | 'processing' | 'delivered' | 'dead'
          attempts?: number
          available_at?: string
          locked_at?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
