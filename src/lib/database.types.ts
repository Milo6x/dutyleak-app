export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      duty_rates_view: {
        Row: {
          id: string
          duty_percentage: number
          vat_percentage: number
          country_code: string
          origin_country_code: string | null
          trade_agreement: string | null
          preferential_rate: number | null
          additional_fees: Json | null
          rule_source: string
          confidence_score: number
          effective_date: string
          expiry_date: string | null
          notes: string | null
          hs6: string
          hs8: string
          classification_description: string
          country_name: string
          country_tax_rate: number | null
          tax_type: string | null
          tax_name: string | null
        }
        Insert: {
          id?: string
          duty_percentage: number
          vat_percentage: number
          country_code: string
          origin_country_code?: string | null
          trade_agreement?: string | null
          preferential_rate?: number | null
          additional_fees?: Json | null
          rule_source: string
          confidence_score: number
          effective_date: string
          expiry_date?: string | null
          notes?: string | null
          hs6: string
          hs8: string
          classification_description: string
          country_name: string
          country_tax_rate?: number | null
          tax_type?: string | null
          tax_name?: string | null
        }
        Update: {
          id?: string
          duty_percentage?: number
          vat_percentage?: number
          country_code?: string
          origin_country_code?: string | null
          trade_agreement?: string | null
          preferential_rate?: number | null
          additional_fees?: Json | null
          rule_source?: string
          confidence_score?: number
          effective_date?: string
          expiry_date?: string | null
          notes?: string | null
          hs6?: string
          hs8?: string
          classification_description?: string
          country_name?: string
          country_tax_rate?: number | null
          tax_type?: string | null
          tax_name?: string | null
        }
        Relationships: []
      }
      trade_agreements: {
        Row: {
          id: string
          code: string
          name: string
          countries: string[]
          hs_code_benefits: Json
          requirements: string[]
          effective_date: string
          expiry_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          countries: string[]
          hs_code_benefits?: Json
          requirements?: string[]
          effective_date: string
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          countries?: string[]
          hs_code_benefits?: Json
          requirements?: string[]
          effective_date?: string
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          workspace_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id?: string | null
          action: string
          resource_type?: string | null
          resource_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string | null
          action?: string
          resource_type?: string | null
          resource_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      import_history: {
        Row: {
          id: string
          type: string
          status: string
          filename: string | null
          total_rows: number | null
          processed_rows: number | null
          successful_imports: number | null
          failed_imports: number | null
          total_records: number | null
          processed_records: number | null
          workspace_id: string
          metadata: Json | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          type: string
          status: string
          filename?: string | null
          total_rows?: number | null
          processed_rows?: number | null
          successful_imports?: number | null
          failed_imports?: number | null
          total_records?: number | null
          processed_records?: number | null
          workspace_id: string
          metadata?: Json | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          type?: string
          status?: string
          filename?: string | null
          total_rows?: number | null
          processed_rows?: number | null
          successful_imports?: number | null
          failed_imports?: number | null
          total_records?: number | null
          processed_records?: number | null
          workspace_id?: string
          metadata?: Json | null
          created_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          id: string
          user_id: string
          notification_type: string
          channel: string
          status: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notification_type: string
          channel: string
          status: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notification_type?: string
          channel?: string
          status?: string
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      scenario_products: {
        Row: {
          id: string
          scenario_id: string
          product_id: string
          workspace_id: string
          created_at: string
        }
        Insert: {
          id?: string
          scenario_id: string
          product_id: string
          workspace_id: string
          created_at?: string
        }
        Update: {
          id?: string
          scenario_id?: string
          product_id?: string
          workspace_id?: string
          created_at?: string
        }
        Relationships: []
      }
      enhanced_scenarios: {
        Row: {
          id: string
          name: string
          description: string
          workspace_id: string
          scenario_ids: string[]
          results: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          workspace_id: string
          scenario_ids: string[]
          results?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          workspace_id?: string
          scenario_ids?: string[]
          results?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      scenario_comparisons: {
        Row: {
          id: string
          name: string
          scenario_ids: string[]
          workspace_id: string
          results: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          scenario_ids: string[]
          workspace_id: string
          results?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          scenario_ids?: string[]
          workspace_id?: string
          results?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          id: string
          user_id: string | null
          service_name: string
          api_key: string
          is_active: boolean | null
          test_status: string | null
          last_tested: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          service_name: string
          api_key: string
          is_active?: boolean | null
          test_status?: string | null
          last_tested?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          service_name?: string
          api_key?: string
          is_active?: boolean | null
          test_status?: string | null
          last_tested?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      classifications: {
        Row: {
          classification_code: string | null
          confidence_score: number | null
          created_at: string
          description: string | null
          hs6: string | null
          hs8: string | null
          id: string
          is_active: boolean | null
          product_id: string
          ruling_reference: string | null
          source: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          classification_code?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          hs6?: string | null
          hs8?: string | null
          id?: string
          is_active?: boolean | null
          product_id: string
          ruling_reference?: string | null
          source?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          classification_code?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          hs6?: string | null
          hs8?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string
          ruling_reference?: string | null
          source?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      duty_scenarios: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          parameters: Json
          potential_savings: number | null
          status: string
          total_products: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          name: string
          parameters?: Json
          potential_savings?: number | null
          status?: string
          total_products?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          parameters?: Json
          potential_savings?: number | null
          status?: string
          total_products?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duty_scenarios_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      duty_rates: {
        Row: {
          classification_id: string
          country_code: string | null
          created_at: string
          duty_percentage: number
          effective_date: string | null
          id: string
          updated_at: string
          vat_percentage: number | null
        }
        Insert: {
          classification_id: string
          country_code?: string | null
          created_at?: string
          duty_percentage: number
          effective_date?: string | null
          id?: string
          updated_at?: string
          vat_percentage?: number | null
        }
        Update: {
          classification_id?: string
          country_code?: string | null
          created_at?: string
          duty_percentage?: number
          effective_date?: string | null
          id?: string
          updated_at?: string
          vat_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "duty_rates_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "classifications"
            referencedColumns: ["id"]
          },
        ]
      }
      duty_calculations: {
        Row: {
          classification_id: string
          created_at: string
          destination_country: string
          duty_amount: number
          duty_percentage: number
          fba_fee_amount: number
          id: string
          insurance_cost: number
          product_id: string
          product_value: number
          shipping_cost: number
          total_landed_cost: number
          updated_at: string
          vat_amount: number
          vat_percentage: number
          workspace_id: string
        }
        Insert: {
          classification_id: string
          created_at?: string
          destination_country: string
          duty_amount: number
          duty_percentage: number
          fba_fee_amount: number
          id?: string
          insurance_cost: number
          product_id: string
          product_value: number
          shipping_cost: number
          total_landed_cost: number
          updated_at?: string
          vat_amount: number
          vat_percentage: number
          workspace_id: string
        }
        Update: {
          classification_id?: string
          created_at?: string
          destination_country?: string
          duty_amount?: number
          duty_percentage?: number
          fba_fee_amount?: number
          id?: string
          insurance_cost?: number
          product_id?: string
          product_value?: number
          shipping_cost?: number
          total_landed_cost?: number
          updated_at?: string
          vat_amount?: number
          vat_percentage?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duty_calculations_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_calculations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duty_calculations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      job_logs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          level: string
          message: string
          metadata: Json
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          level?: string
          message: string
          metadata?: Json
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          level?: string
          message?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "job_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_related_entities: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          job_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          job_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_related_entities_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          parameters: Json
          progress: number
          started_at: string | null
          status: string
          type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          parameters?: Json
          progress?: number
          started_at?: string | null
          status?: string
          type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          parameters?: Json
          progress?: number
          started_at?: string | null
          status?: string
          type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active_classification_id: string | null
          asin: string | null
          category: string | null
          cost: number | null
          created_at: string
          description: string | null
          dimensions_height: number | null
          dimensions_length: number | null
          dimensions_width: number | null
          fba_fee_estimate_usd: number | null
          id: string
          image_url: string | null
          metadata: Json | null
          subcategory: string | null
          title: string
          updated_at: string
          weight: number | null
          workspace_id: string
        }
        Insert: {
          active_classification_id?: string | null
          asin?: string | null
          category?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          dimensions_height?: number | null
          dimensions_length?: number | null
          dimensions_width?: number | null
          fba_fee_estimate_usd?: number | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          subcategory?: string | null
          title: string
          updated_at?: string
          weight?: number | null
          workspace_id: string
        }
        Update: {
          active_classification_id?: string | null
          asin?: string | null
          category?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          dimensions_height?: number | null
          dimensions_length?: number | null
          dimensions_width?: number | null
          fba_fee_estimate_usd?: number | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          subcategory?: string | null
          title?: string
          updated_at?: string
          weight?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_active_classification_id_fkey"
            columns: ["active_classification_id"]
            isOneToOne: false
            referencedRelation: "classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      review_queue: {
        Row: {
          classification_id: string
          confidence_score: number | null
          created_at: string
          id: string
          product_id: string
          reason: string | null
          reviewed_at: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          classification_id: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          product_id: string
          reason?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          classification_id?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          product_id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_queue_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_queue_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      savings: {
        Row: {
          created_at: string
          id: string
          new_classification_id: string
          old_classification_id: string | null
          product_id: string
          updated_at: string
          workspace_id: string
          yearly_saving: number
        }
        Insert: {
          created_at?: string
          id?: string
          new_classification_id: string
          old_classification_id?: string | null
          product_id: string
          updated_at?: string
          workspace_id: string
          yearly_saving: number
        }
        Update: {
          created_at?: string
          id?: string
          new_classification_id?: string
          old_classification_id?: string | null
          product_id?: string
          updated_at?: string
          workspace_id?: string
          yearly_saving?: number
        }
        Relationships: [
          {
            foreignKeyName: "savings_new_classification_id_fkey"
            columns: ["new_classification_id"]
            isOneToOne: false
            referencedRelation: "classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_old_classification_id_fkey"
            columns: ["old_classification_id"]
            isOneToOne: false
            referencedRelation: "classifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_ledger: {
        Row: {
          baseline_duty_rate: number
          calculation_id: string
          created_at: string
          id: string
          optimized_duty_rate: number
          product_id: string
          savings_amount: number
          savings_percentage: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          baseline_duty_rate: number
          calculation_id: string
          created_at?: string
          id?: string
          optimized_duty_rate: number
          product_id: string
          savings_amount: number
          savings_percentage: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          baseline_duty_rate?: number
          calculation_id?: string
          created_at?: string
          id?: string
          optimized_duty_rate?: number
          product_id?: string
          savings_amount?: number
          savings_percentage?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_ledger_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_ledger_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_users: {
        Row: {
          created_at: string
          role: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_users_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          plan: string
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          id: string
          user_id: string
          email_enabled: boolean
          push_enabled: boolean
          sound_enabled: boolean
          review_assignments: boolean
          review_completions: boolean
          review_overdue: boolean
          system_alerts: boolean
          workload_warnings: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_enabled?: boolean
          push_enabled?: boolean
          sound_enabled?: boolean
          review_assignments?: boolean
          review_completions?: boolean
          review_overdue?: boolean
          system_alerts?: boolean
          workload_warnings?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_enabled?: boolean
          push_enabled?: boolean
          sound_enabled?: boolean
          review_assignments?: boolean
          review_completions?: boolean
          review_overdue?: boolean
          system_alerts?: boolean
          workload_warnings?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      trade_agreements: {
        Row: {
          id: string
          code: string
          name: string
          countries: string[]
          hs_code_benefits: Json
          requirements: string[]
          effective_date: string
          expiry_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          countries: string[]
          hs_code_benefits?: Json
          requirements?: string[]
          effective_date: string
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          countries?: string[]
          hs_code_benefits?: Json
          requirements?: string[]
          effective_date?: string
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          workspace_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id?: string | null
          action: string
          resource_type?: string | null
          resource_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string | null
          action?: string
          resource_type?: string | null
          resource_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      import_history: {
        Row: {
          id: string
          type: string
          status: string
          filename: string | null
          total_rows: number | null
          processed_rows: number | null
          successful_imports: number | null
          failed_imports: number | null
          total_records: number | null
          processed_records: number | null
          workspace_id: string
          metadata: Json | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          type: string
          status: string
          filename?: string | null
          total_rows?: number | null
          processed_rows?: number | null
          successful_imports?: number | null
          failed_imports?: number | null
          total_records?: number | null
          processed_records?: number | null
          workspace_id: string
          metadata?: Json | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          type?: string
          status?: string
          filename?: string | null
          total_rows?: number | null
          processed_rows?: number | null
          successful_imports?: number | null
          failed_imports?: number | null
          total_records?: number | null
          processed_records?: number | null
          workspace_id?: string
          metadata?: Json | null
          created_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          id: string
          user_id: string
          notification_type: string
          channel: string
          status: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notification_type: string
          channel: string
          status: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notification_type?: string
          channel?: string
          status?: string
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      scenario_products: {
        Row: {
          id: string
          scenario_id: string
          product_id: string
          workspace_id: string
          created_at: string
        }
        Insert: {
          id?: string
          scenario_id: string
          product_id: string
          workspace_id: string
          created_at?: string
        }
        Update: {
          id?: string
          scenario_id?: string
          product_id?: string
          workspace_id?: string
          created_at?: string
        }
        Relationships: []
      }
      enhanced_scenarios: {
        Row: {
          id: string
          name: string
          description: string
          workspace_id: string
          scenario_ids: string[]
          results: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          workspace_id: string
          scenario_ids: string[]
          results?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          workspace_id?: string
          scenario_ids?: string[]
          results?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      scenario_comparisons: {
        Row: {
          id: string
          name: string
          scenario_ids: string[]
          workspace_id: string
          results: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          scenario_ids: string[]
          workspace_id: string
          results?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          scenario_ids?: string[]
          workspace_id?: string
          results?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      duty_rates_view: {
        Row: {
          id: string
          duty_percentage: number
          vat_percentage: number
          country_code: string
          origin_country_code: string | null
          trade_agreement: string | null
          preferential_rate: number | null
          additional_fees: Json | null
          rule_source: string
          confidence_score: number
          effective_date: string
          expiry_date: string | null
          notes: string | null
          hs6: string
          hs8: string
          classification_description: string
          country_name: string
          country_tax_rate: number | null
          tax_type: string | null
          tax_name: string | null
        }
        Insert: {
          id?: string
          duty_percentage: number
          vat_percentage: number
          country_code: string
          origin_country_code?: string | null
          trade_agreement?: string | null
          preferential_rate?: number | null
          additional_fees?: Json | null
          rule_source: string
          confidence_score: number
          effective_date: string
          expiry_date?: string | null
          notes?: string | null
          hs6: string
          hs8: string
          classification_description: string
          country_name: string
          country_tax_rate?: number | null
          tax_type?: string | null
          tax_name?: string | null
        }
        Update: {
          id?: string
          duty_percentage?: number
          vat_percentage?: number
          country_code?: string
          origin_country_code?: string | null
          trade_agreement?: string | null
          preferential_rate?: number | null
          additional_fees?: Json | null
          rule_source?: string
          confidence_score?: number
          effective_date?: string
          expiry_date?: string | null
          notes?: string | null
          hs6?: string
          hs8?: string
          classification_description?: string
          country_name?: string
          country_tax_rate?: number | null
          tax_type?: string | null
          tax_name?: string | null
        }
        Relationships: []
      }
      trade_agreements: {
        Row: {
          id: string
          code: string
          name: string
          countries: string[]
          hs_code_benefits: Json
          requirements: string[]
          effective_date: string
          expiry_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          countries: string[]
          hs_code_benefits?: Json
          requirements?: string[]
          effective_date: string
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          countries?: string[]
          hs_code_benefits?: Json
          requirements?: string[]
          effective_date?: string
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          workspace_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id?: string | null
          action: string
          resource_type?: string | null
          resource_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          workspace_id?: string | null
          action?: string
          resource_type?: string | null
          resource_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      import_history: {
        Row: {
          id: string
          type: string
          status: string
          filename: string | null
          total_rows: number | null
          processed_rows: number | null
          successful_imports: number | null
          failed_imports: number | null
          total_records: number | null
          processed_records: number | null
          workspace_id: string
          metadata: Json | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          type: string
          status: string
          filename?: string | null
          total_rows?: number | null
          processed_rows?: number | null
          successful_imports?: number | null
          failed_imports?: number | null
          total_records?: number | null
          processed_records?: number | null
          workspace_id: string
          metadata?: Json | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          type?: string
          status?: string
          filename?: string | null
          total_rows?: number | null
          processed_rows?: number | null
          successful_imports?: number | null
          failed_imports?: number | null
          total_records?: number | null
          processed_records?: number | null
          workspace_id?: string
          metadata?: Json | null
          created_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          id: string
          user_id: string
          notification_type: string
          channel: string
          status: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notification_type: string
          channel: string
          status: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notification_type?: string
          channel?: string
          status?: string
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      scenario_products: {
        Row: {
          id: string
          scenario_id: string
          product_id: string
          workspace_id: string
          created_at: string
        }
        Insert: {
          id?: string
          scenario_id: string
          product_id: string
          workspace_id: string
          created_at?: string
        }
        Update: {
          id?: string
          scenario_id?: string
          product_id?: string
          workspace_id?: string
          created_at?: string
        }
        Relationships: []
      }
      enhanced_scenarios: {
        Row: {
          id: string
          name: string
          description: string
          workspace_id: string
          scenario_ids: string[]
          results: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          workspace_id: string
          scenario_ids: string[]
          results?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          workspace_id?: string
          scenario_ids?: string[]
          results?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      scenario_comparisons: {
        Row: {
          id: string
          name: string
          scenario_ids: string[]
          workspace_id: string
          results: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          scenario_ids: string[]
          workspace_id: string
          results?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          scenario_ids?: string[]
          workspace_id?: string
          results?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Functions: {
      get_effective_duty_rate: {
        Args: {
          p_hs_code: string
          p_destination_country: string
          p_origin_country?: string
          p_trade_agreement?: string
          p_effective_date?: string
        }
        Returns: {
          duty_rate: number
          vat_rate: number
          preferential_treatment: boolean
          trade_agreement_applied: string
          confidence: number
        }[]
      }
      get_reviewer_workload_stats: {
        Args: {
          reviewer_id?: string
          workspace_id?: string
        }
        Returns: {
          reviewer_id: string
          pending_reviews: number
          overdue_reviews: number
          avg_review_time: number
          workload_score: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[keyof Database]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
