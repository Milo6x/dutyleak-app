export type Json = any

export type Database = {
  public: {
    Tables: {
      classifications: {
        Row: {
          confidence_score: number
          created_at: string | null
          hs6: string
          hs8: string | null
          id: string
          is_active: boolean
          product_id: string
          ruling_reference: string | null
          source: string
          updated_at: string | null
        }
        Insert: {
          confidence_score: number
          created_at?: string | null
          hs6: string
          hs8?: string | null
          id?: string
          is_active?: boolean
          product_id: string
          ruling_reference?: string | null
          source: string
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number
          created_at?: string | null
          hs6?: string
          hs8?: string | null
          id?: string
          is_active?: boolean
          product_id?: string
          ruling_reference?: string | null
          source?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      duty_calculations: {
        Row: {
          classification_id: string
          created_at: string | null
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
          vat_amount: number
          vat_percentage: number
        }
        Insert: {
          classification_id: string
          created_at?: string | null
          destination_country: string
          duty_amount: number
          duty_percentage: number
          fba_fee_amount?: number
          id?: string
          insurance_cost?: number
          product_id: string
          product_value: number
          shipping_cost?: number
          total_landed_cost: number
          vat_amount: number
          vat_percentage: number
        }
        Update: {
          classification_id?: string
          created_at?: string | null
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
          vat_amount?: number
          vat_percentage?: number
        }
        Relationships: []
      }
      duty_rates: {
        Row: {
          classification_id: string
          country_code: string
          created_at: string | null
          duty_percentage: number
          effective_date: string
          id: string
          updated_at: string | null
          vat_percentage: number
        }
        Insert: {
          classification_id: string
          country_code: string
          created_at?: string | null
          duty_percentage?: number
          effective_date?: string
          id?: string
          updated_at?: string | null
          vat_percentage?: number
        }
        Update: {
          classification_id?: string
          country_code?: string
          created_at?: string | null
          duty_percentage?: number
          effective_date?: string
          id?: string
          updated_at?: string | null
          vat_percentage?: number
        }
        Relationships: []
      }
      duty_scenarios: {
        Row: {
          base_product_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          scenario_data: Json
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          base_product_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          scenario_data?: Json
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          base_product_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          scenario_data?: Json
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      job_logs: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          level: string
          message: string
          metadata: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          level?: string
          message: string
          metadata?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          level?: string
          message?: string
          metadata?: Json
        }
        Relationships: []
      }
      job_related_entities: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          job_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          job_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          job_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error: string | null
          id: string
          parameters: Json
          progress: number
          started_at: string | null
          status: string
          type: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          parameters?: Json
          progress?: number
          started_at?: string | null
          status?: string
          type: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          parameters?: Json
          progress?: number
          started_at?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active_classification_id: string | null
          asin: string | null
          cost: number | null
          created_at: string | null
          description: string | null
          fba_fee_estimate_usd: number | null
          id: string
          image_url: string | null
          title: string | null
          updated_at: string | null
          workspace_id: string
          yearly_units: number | null
        }
        Insert: {
          active_classification_id?: string | null
          asin?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          fba_fee_estimate_usd?: number | null
          id?: string
          image_url?: string | null
          title?: string | null
          updated_at?: string | null
          workspace_id: string
          yearly_units?: number | null
        }
        Update: {
          active_classification_id?: string | null
          asin?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          fba_fee_estimate_usd?: number | null
          id?: string
          image_url?: string | null
          title?: string | null
          updated_at?: string | null
          workspace_id?: string
          yearly_units?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      review_queue: {
        Row: {
          classification_id: string
          confidence_score: number | null
          created_at: string | null
          id: string
          product_id: string
          reason: string
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          classification_id: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          product_id: string
          reason: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          classification_id?: string
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          product_id?: string
          reason?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      savings_ledger: {
        Row: {
          baseline_duty_rate: number
          calculation_id: string
          created_at: string | null
          id: string
          optimized_duty_rate: number
          product_id: string
          savings_amount: number
          savings_percentage: number
          workspace_id: string
        }
        Insert: {
          baseline_duty_rate: number
          calculation_id: string
          created_at?: string | null
          id?: string
          optimized_duty_rate: number
          product_id: string
          savings_amount: number
          savings_percentage: number
          workspace_id: string
        }
        Update: {
          baseline_duty_rate?: number
          calculation_id?: string
          created_at?: string | null
          id?: string
          optimized_duty_rate?: number
          product_id?: string
          savings_amount?: number
          savings_percentage?: number
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_users: {
        Row: {
          created_at: string | null
          role: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          role?: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          created_at: string | null
          id: string
          name: string
          plan: string
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          plan?: string
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          plan?: string
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
