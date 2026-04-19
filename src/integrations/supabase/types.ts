export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achieved_at: string
          category: string
          created_at: string
          description: string | null
          exercise_name: string | null
          id: string
          member_id: string
          rank: string
          title: string
        }
        Insert: {
          achieved_at?: string
          category: string
          created_at?: string
          description?: string | null
          exercise_name?: string | null
          id?: string
          member_id: string
          rank: string
          title: string
        }
        Update: {
          achieved_at?: string
          category?: string
          created_at?: string
          description?: string | null
          exercise_name?: string | null
          id?: string
          member_id?: string
          rank?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      body_measurements: {
        Row: {
          bicep_left_cm: number | null
          bicep_right_cm: number | null
          body_fat_pct: number | null
          calf_cm: number | null
          chest_cm: number | null
          created_at: string
          hips_cm: number | null
          id: string
          measurement_date: string
          member_id: string
          neck_cm: number | null
          notes: string | null
          shoulders_cm: number | null
          thigh_left_cm: number | null
          thigh_right_cm: number | null
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          bicep_left_cm?: number | null
          bicep_right_cm?: number | null
          body_fat_pct?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          hips_cm?: number | null
          id?: string
          measurement_date?: string
          member_id: string
          neck_cm?: number | null
          notes?: string | null
          shoulders_cm?: number | null
          thigh_left_cm?: number | null
          thigh_right_cm?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          bicep_left_cm?: number | null
          bicep_right_cm?: number | null
          body_fat_pct?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          hips_cm?: number | null
          id?: string
          measurement_date?: string
          member_id?: string
          neck_cm?: number | null
          notes?: string | null
          shoulders_cm?: number | null
          thigh_left_cm?: number | null
          thigh_right_cm?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_measurements_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          budget_type: string
          budgeted_amount: number
          category: string
          created_at: string
          currency: string
          gym_id: string | null
          id: string
          month: number
          notes: string | null
          updated_at: string
          year: number
        }
        Insert: {
          budget_type?: string
          budgeted_amount?: number
          category: string
          created_at?: string
          currency?: string
          gym_id?: string | null
          id?: string
          month: number
          notes?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          budget_type?: string
          budgeted_amount?: number
          category?: string
          created_at?: string
          currency?: string
          gym_id?: string | null
          id?: string
          month?: number
          notes?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          actual_amount: number
          created_at: string
          created_by: string
          currency: string
          difference: number | null
          expected_amount: number
          gym_id: string | null
          id: string
          notes: string | null
          register_date: string
          shift_label: string | null
          shift_number: number | null
        }
        Insert: {
          actual_amount?: number
          created_at?: string
          created_by: string
          currency?: string
          difference?: number | null
          expected_amount?: number
          gym_id?: string | null
          id?: string
          notes?: string | null
          register_date?: string
          shift_label?: string | null
          shift_number?: number | null
        }
        Update: {
          actual_amount?: number
          created_at?: string
          created_by?: string
          currency?: string
          difference?: number | null
          expected_amount?: number
          gym_id?: string | null
          id?: string
          notes?: string | null
          register_date?: string
          shift_label?: string | null
          shift_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          check_in_time: string
          check_out_time: string | null
          created_at: string
          gym_id: string | null
          id: string
          member_id: string
        }
        Insert: {
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
          gym_id?: string | null
          id?: string
          member_id: string
        }
        Update: {
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
          gym_id?: string | null
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      class_bookings: {
        Row: {
          booking_date: string
          class_schedule_id: string
          created_at: string
          id: string
          member_id: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          booking_date: string
          class_schedule_id: string
          created_at?: string
          id?: string
          member_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          booking_date?: string
          class_schedule_id?: string
          created_at?: string
          id?: string
          member_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_bookings_class_schedule_id_fkey"
            columns: ["class_schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedules: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          description: string | null
          gym_id: string | null
          id: string
          instructor: string
          is_active: boolean
          max_capacity: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gym_id?: string | null
          id?: string
          instructor: string
          is_active?: boolean
          max_capacity?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gym_id?: string | null
          id?: string
          instructor?: string
          is_active?: boolean
          max_capacity?: number
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaigns: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          gym_id: string | null
          id: string
          message: string
          name: string
          recipient_count: number
          segment_id: string | null
          sent_at: string | null
          sent_count: number
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          gym_id?: string | null
          id?: string
          message: string
          name: string
          recipient_count?: number
          segment_id?: string | null
          sent_at?: string | null
          sent_count?: number
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          gym_id?: string | null
          id?: string
          message?: string
          name?: string
          recipient_count?: number
          segment_id?: string | null
          sent_at?: string | null
          sent_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_campaigns_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_campaigns_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "crm_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_segments: {
        Row: {
          created_at: string
          created_by: string | null
          criteria: Json
          description: string | null
          gym_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          criteria?: Json
          description?: string | null
          gym_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          criteria?: Json
          description?: string | null
          gym_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_segments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_segments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_plans: {
        Row: {
          coach_id: string
          created_at: string
          day_label: string | null
          description: string | null
          end_date: string | null
          exercises: Json
          gym_id: string | null
          id: string
          is_active: boolean
          member_id: string
          split_type: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          day_label?: string | null
          description?: string | null
          end_date?: string | null
          exercises?: Json
          gym_id?: string | null
          id?: string
          is_active?: boolean
          member_id: string
          split_type?: string | null
          start_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          day_label?: string | null
          description?: string | null
          end_date?: string | null
          exercises?: Json
          gym_id?: string | null
          id?: string
          is_active?: boolean
          member_id?: string
          split_type?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_plans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string
          description: string
          expense_date: string
          gym_id: string | null
          id: string
          iva_amount: number | null
          notes: string | null
          payment_method: string
          receipt_url: string | null
          subtotal: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          currency?: string
          description: string
          expense_date?: string
          gym_id?: string | null
          id?: string
          iva_amount?: number | null
          notes?: string | null
          payment_method?: string
          receipt_url?: string | null
          subtotal?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          description?: string
          expense_date?: string
          gym_id?: string | null
          id?: string
          iva_amount?: number | null
          notes?: string | null
          payment_method?: string
          receipt_url?: string | null
          subtotal?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          category: string
          created_at: string
          currency: string
          depreciation_method: string
          gym_id: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          original_cost: number
          purchase_date: string
          salvage_value: number
          updated_at: string
          useful_life_years: number
        }
        Insert: {
          category?: string
          created_at?: string
          currency?: string
          depreciation_method?: string
          gym_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          original_cost: number
          purchase_date: string
          salvage_value?: number
          updated_at?: string
          useful_life_years?: number
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          depreciation_method?: string
          gym_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          original_cost?: number
          purchase_date?: string
          salvage_value?: number
          updated_at?: string
          useful_life_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_name: string
          gym_id: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_name: string
          gym_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_name?: string
          gym_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_features_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_features_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          due_date: string
          gym_id: string
          id: string
          issue_date: string
          notes: string | null
          paid_date: string | null
          status: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          due_date: string
          gym_id: string
          id?: string
          issue_date?: string
          notes?: string | null
          paid_date?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string
          gym_id?: string
          id?: string
          issue_date?: string
          notes?: string | null
          paid_date?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_invoices_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_invoices_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "gym_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_staff: {
        Row: {
          created_at: string
          gym_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gym_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gym_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_staff_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_staff_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_subscriptions: {
        Row: {
          created_at: string
          currency: string
          gym_id: string
          id: string
          monthly_amount: number
          next_payment_date: string | null
          notes: string | null
          plan_type: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          gym_id: string
          id?: string
          monthly_amount?: number
          next_payment_date?: string | null
          notes?: string | null
          plan_type?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          gym_id?: string
          id?: string
          monthly_amount?: number
          next_payment_date?: string | null
          notes?: string | null
          plan_type?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_subscriptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_subscriptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string | null
          created_at: string
          custom_domain: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string
          phone: string | null
          primary_color: string | null
          setup_completed: boolean
          slug: string
          subscription_status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          custom_domain?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id: string
          phone?: string | null
          primary_color?: string | null
          setup_completed?: boolean
          slug: string
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          custom_domain?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string
          phone?: string | null
          primary_color?: string | null
          setup_completed?: boolean
          slug?: string
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          category: string
          created_at: string
          gym_id: string | null
          id: string
          image_url: string | null
          min_stock: number
          name: string
          notes: string | null
          quantity: number
          supplier: string | null
          unit_cost: number
          updated_at: string
          video_url: string | null
          weight_kg: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          gym_id?: string | null
          id?: string
          image_url?: string | null
          min_stock?: number
          name: string
          notes?: string | null
          quantity?: number
          supplier?: string | null
          unit_cost?: number
          updated_at?: string
          video_url?: string | null
          weight_kg?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          gym_id?: string | null
          id?: string
          image_url?: string | null
          min_stock?: number
          name?: string
          notes?: string | null
          quantity?: number
          supplier?: string | null
          unit_cost?: number
          updated_at?: string
          video_url?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          lead_id: string
          note: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          lead_id: string
          note: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          lead_id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          converted_member_id: string | null
          created_at: string
          email: string | null
          first_name: string
          gym_id: string | null
          id: string
          last_contact_at: string | null
          last_name: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          converted_member_id?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          gym_id?: string | null
          id?: string
          last_contact_at?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          converted_member_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          gym_id?: string | null
          id?: string
          last_contact_at?: string | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_member_id_fkey"
            columns: ["converted_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_logs: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          fiber_g: number | null
          food_name: string
          id: string
          logged_by: string
          meal_date: string
          meal_type: string
          member_id: string
          notes: string | null
          portion_grams: number | null
          protein_g: number | null
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          food_name: string
          id?: string
          logged_by: string
          meal_date?: string
          meal_type?: string
          member_id: string
          notes?: string | null
          portion_grams?: number | null
          protein_g?: number | null
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          food_name?: string
          id?: string
          logged_by?: string
          meal_date?: string
          meal_type?: string
          member_id?: string
          notes?: string | null
          portion_grams?: number | null
          protein_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_onboarding: {
        Row: {
          available_days: number | null
          body_fat_pct: number | null
          completed: boolean | null
          created_at: string | null
          experience_level: string | null
          fitness_goals: string[] | null
          height_cm: number | null
          id: string
          injuries: string | null
          member_id: string
          preferred_training: string[] | null
          target_weight_kg: number | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          available_days?: number | null
          body_fat_pct?: number | null
          completed?: boolean | null
          created_at?: string | null
          experience_level?: string | null
          fitness_goals?: string[] | null
          height_cm?: number | null
          id?: string
          injuries?: string | null
          member_id: string
          preferred_training?: string[] | null
          target_weight_kg?: number | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          available_days?: number | null
          body_fat_pct?: number | null
          completed?: boolean | null
          created_at?: string | null
          experience_level?: string | null
          fitness_goals?: string[] | null
          height_cm?: number | null
          id?: string
          injuries?: string | null
          member_id?: string
          preferred_training?: string[] | null
          target_weight_kg?: number | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "member_onboarding_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          auth_user_id: string | null
          cedula: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string
          gym_id: string | null
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          cedula?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          gym_id?: string | null
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          cedula?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          gym_id?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_plans: {
        Row: {
          coach_id: string
          created_at: string
          daily_calories: number | null
          description: string | null
          end_date: string | null
          gym_id: string | null
          id: string
          is_active: boolean
          meals: Json
          member_id: string
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          daily_calories?: number | null
          description?: string | null
          end_date?: string | null
          gym_id?: string | null
          id?: string
          is_active?: boolean
          meals?: Json
          member_id: string
          start_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          daily_calories?: number | null
          description?: string | null
          end_date?: string | null
          gym_id?: string | null
          id?: string
          is_active?: boolean
          meals?: Json
          member_id?: string
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_plans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          gym_id: string | null
          id: string
          income_category: string | null
          iva_amount: number | null
          member_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          gym_id?: string | null
          id?: string
          income_category?: string | null
          iva_amount?: number | null
          member_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          gym_id?: string | null
          id?: string
          income_category?: string | null
          iva_amount?: number | null
          member_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          benefits: string[] | null
          color: string | null
          created_at: string
          currency: string
          description: string | null
          duration_days: number
          gym_id: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          benefits?: string[] | null
          color?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number
          gym_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          benefits?: string[] | null
          color?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number
          gym_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotion_targets: {
        Row: {
          created_at: string
          id: string
          member_id: string
          promotion_id: string
          seen: boolean
          seen_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          promotion_id: string
          seen?: boolean
          seen_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          promotion_id?: string
          seen?: boolean
          seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_targets_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_targets_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          created_at: string
          created_by: string
          display_type: string
          gym_id: string | null
          id: string
          image_url: string | null
          is_active: boolean
          message: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          display_type?: string
          gym_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          message: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_type?: string
          gym_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          message?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          category: string
          created_at: string
          currency: string
          gym_id: string | null
          id: string
          image_url: string | null
          is_active: boolean
          min_stock: number
          name: string
          price: number
          stock: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          currency?: string
          gym_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock?: number
          name: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          gym_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock?: number
          name?: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_products_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_sales: {
        Row: {
          created_at: string
          currency: string
          gym_id: string | null
          id: string
          member_id: string | null
          notes: string | null
          payment_method: string
          product_id: string
          quantity: number
          sale_date: string
          sold_by: string
          total_amount: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          currency?: string
          gym_id?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          payment_method?: string
          product_id: string
          quantity?: number
          sale_date?: string
          sold_by: string
          total_amount: number
          unit_price: number
        }
        Update: {
          created_at?: string
          currency?: string
          gym_id?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          payment_method?: string
          product_id?: string
          quantity?: number
          sale_date?: string
          sold_by?: string
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_sales_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_sales_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_sales_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          end_date: string
          gym_id: string | null
          id: string
          member_id: string
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          gym_id?: string | null
          id?: string
          member_id: string
          plan_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          gym_id?: string | null
          id?: string
          member_id?: string
          plan_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          created_at: string
          exercise_name: string
          gym_id: string | null
          id: string
          logged_by: string
          machine: string | null
          member_id: string
          muscle_group: string
          notes: string | null
          reps: number
          rpe: number | null
          sets: number
          weight_kg: number | null
          workout_date: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          gym_id?: string | null
          id?: string
          logged_by: string
          machine?: string | null
          member_id: string
          muscle_group: string
          notes?: string | null
          reps?: number
          rpe?: number | null
          sets?: number
          weight_kg?: number | null
          workout_date?: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          gym_id?: string | null
          id?: string
          logged_by?: string
          machine?: string | null
          member_id?: string
          muscle_group?: string
          notes?: string | null
          reps?: number
          rpe?: number | null
          sets?: number
          weight_kg?: number | null
          workout_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      gyms_public: {
        Row: {
          address: string | null
          custom_domain: string | null
          email: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          phone: string | null
          primary_color: string | null
          setup_completed: boolean | null
          slug: string | null
        }
        Insert: {
          address?: string | null
          custom_domain?: string | null
          email?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          primary_color?: string | null
          setup_completed?: boolean | null
          slug?: string | null
        }
        Update: {
          address?: string | null
          custom_domain?: string | null
          email?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          primary_color?: string | null
          setup_completed?: boolean | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_owned_gym_ids: { Args: { _user_id: string }; Returns: string[] }
      get_staff_gym_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_gym_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_can_access_gym: {
        Args: { _gym_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coach" | "member" | "receptionist" | "super_admin"
      booking_status: "booked" | "cancelled" | "attended"
      member_status: "active" | "inactive" | "suspended"
      payment_status: "paid" | "pending" | "overdue"
      subscription_status: "active" | "expired" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "coach", "member", "receptionist", "super_admin"],
      booking_status: ["booked", "cancelled", "attended"],
      member_status: ["active", "inactive", "suspended"],
      payment_status: ["paid", "pending", "overdue"],
      subscription_status: ["active", "expired", "cancelled"],
    },
  },
} as const
