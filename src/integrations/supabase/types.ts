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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      automation_rules: {
        Row: {
          actions: Json
          created_at: string | null
          description: string | null
          id: string
          last_run: string | null
          name: string
          shop_id: string
          status: string | null
          successful_runs: number | null
          total_runs: number | null
          trigger_type: string
          trigger_value: string
          updated_at: string | null
        }
        Insert: {
          actions: Json
          created_at?: string | null
          description?: string | null
          id?: string
          last_run?: string | null
          name: string
          shop_id: string
          status?: string | null
          successful_runs?: number | null
          total_runs?: number | null
          trigger_type: string
          trigger_value: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          last_run?: string | null
          name?: string
          shop_id?: string
          status?: string | null
          successful_runs?: number | null
          total_runs?: number | null
          trigger_type?: string
          trigger_value?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          content: string | null
          created_at: string | null
          excerpt: string | null
          external_id: string | null
          featured_image: string | null
          focus_keyword: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          shop_id: string
          slug: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          external_id?: string | null
          featured_image?: string | null
          focus_keyword?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          shop_id: string
          slug: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          external_id?: string | null
          featured_image?: string | null
          focus_keyword?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          shop_id?: string
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string | null
          description: string | null
          external_id: string | null
          id: string
          image: string | null
          long_description: string | null
          name: string
          parent_id: string | null
          product_count: number | null
          shop_id: string
          slug: string
          updated_at: string | null
          woocommerce_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          image?: string | null
          long_description?: string | null
          name: string
          parent_id?: string | null
          product_count?: number | null
          shop_id: string
          slug: string
          updated_at?: string | null
          woocommerce_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          image?: string | null
          long_description?: string | null
          name?: string
          parent_id?: string | null
          product_count?: number | null
          shop_id?: string
          slug?: string
          updated_at?: string | null
          woocommerce_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          current_item: string | null
          diagnostic_id: string | null
          error_message: string | null
          failed_count: number | null
          id: string
          last_heartbeat: string | null
          processed_items: number | null
          progress: number | null
          shop_id: string
          skipped_count: number | null
          started_at: string | null
          status: string
          success_count: number | null
          total_items: number
          type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_item?: string | null
          diagnostic_id?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          last_heartbeat?: string | null
          processed_items?: number | null
          progress?: number | null
          shop_id: string
          skipped_count?: number | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          total_items: number
          type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_item?: string | null
          diagnostic_id?: string | null
          error_message?: string | null
          failed_count?: number | null
          id?: string
          last_heartbeat?: string | null
          processed_items?: number | null
          progress?: number | null
          shop_id?: string
          skipped_count?: number | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          total_items?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "seo_diagnostics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      product_generation_jobs: {
        Row: {
          action: string
          completed_at: string | null
          created_at: string
          created_by: string
          error_message: string | null
          id: string
          language: string | null
          preserve_internal_links: boolean | null
          product_id: string
          shop_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          id?: string
          language?: string | null
          preserve_internal_links?: boolean | null
          product_id: string
          shop_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          id?: string
          language?: string | null
          preserve_internal_links?: boolean | null
          product_id?: string
          shop_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_generation_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_generation_jobs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modifications: {
        Row: {
          field_name: string
          id: string
          modified_at: string
          modified_by: string | null
          new_value: string | null
          old_value: string | null
          product_id: string
        }
        Insert: {
          field_name: string
          id?: string
          modified_at?: string
          modified_by?: string | null
          new_value?: string | null
          old_value?: string | null
          product_id: string
        }
        Update: {
          field_name?: string
          id?: string
          modified_at?: string
          modified_by?: string | null
          new_value?: string | null
          old_value?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_modifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          categories: Json | null
          created_at: string | null
          description: string | null
          external_id: string | null
          featured: boolean | null
          focus_keyword: string | null
          id: string
          images: Json | null
          meta_description: string | null
          meta_title: string | null
          name: string
          on_sale: boolean | null
          price: number | null
          regular_price: number | null
          sale_price: number | null
          shop_id: string
          short_description: string | null
          sku: string | null
          slug: string
          status: string | null
          stock_quantity: number | null
          stock_status: string | null
          updated_at: string | null
          woocommerce_id: string | null
        }
        Insert: {
          categories?: Json | null
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          featured?: boolean | null
          focus_keyword?: string | null
          id?: string
          images?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          on_sale?: boolean | null
          price?: number | null
          regular_price?: number | null
          sale_price?: number | null
          shop_id: string
          short_description?: string | null
          sku?: string | null
          slug: string
          status?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          updated_at?: string | null
          woocommerce_id?: string | null
        }
        Update: {
          categories?: Json | null
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          featured?: boolean | null
          focus_keyword?: string | null
          id?: string
          images?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          on_sale?: boolean | null
          price?: number | null
          regular_price?: number | null
          sale_price?: number | null
          shop_id?: string
          short_description?: string | null
          sku?: string | null
          slug?: string
          status?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          updated_at?: string | null
          woocommerce_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          openai_api_key: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          openai_api_key?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          openai_api_key?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      seo_diagnostics: {
        Row: {
          completed_at: string | null
          created_at: string | null
          errors_count: number | null
          id: string
          info_count: number | null
          issues: Json | null
          item_id: string
          item_type: string
          recommendations: Json | null
          score: number | null
          shop_id: string
          status: string | null
          summary: string | null
          total_issues: number | null
          updated_at: string | null
          warnings_count: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          errors_count?: number | null
          id?: string
          info_count?: number | null
          issues?: Json | null
          item_id: string
          item_type: string
          recommendations?: Json | null
          score?: number | null
          shop_id: string
          status?: string | null
          summary?: string | null
          total_issues?: number | null
          updated_at?: string | null
          warnings_count?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          errors_count?: number | null
          id?: string
          info_count?: number | null
          issues?: Json | null
          item_id?: string
          item_type?: string
          recommendations?: Json | null
          score?: number | null
          shop_id?: string
          status?: string | null
          summary?: string | null
          total_issues?: number | null
          updated_at?: string | null
          warnings_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_diagnostics_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          analytics_enabled: boolean | null
          collections_slug: string | null
          consumer_key: string | null
          consumer_secret: string | null
          created_at: string | null
          id: string
          jetpack_access_token: string | null
          language: string | null
          name: string
          openai_api_key: string | null
          shopify_access_token: string | null
          status: string | null
          type: string
          updated_at: string | null
          url: string
          user_id: string
          wp_password: string | null
          wp_username: string | null
        }
        Insert: {
          analytics_enabled?: boolean | null
          collections_slug?: string | null
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string | null
          id?: string
          jetpack_access_token?: string | null
          language?: string | null
          name: string
          openai_api_key?: string | null
          shopify_access_token?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          url: string
          user_id: string
          wp_password?: string | null
          wp_username?: string | null
        }
        Update: {
          analytics_enabled?: boolean | null
          collections_slug?: string | null
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string | null
          id?: string
          jetpack_access_token?: string | null
          language?: string | null
          name?: string
          openai_api_key?: string | null
          shopify_access_token?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          url?: string
          user_id?: string
          wp_password?: string | null
          wp_username?: string | null
        }
        Relationships: []
      }
      tracked_keywords: {
        Row: {
          competition: string | null
          cpc: number | null
          created_at: string | null
          current_position: number | null
          current_rank: number | null
          difficulty: string | null
          id: string
          keyword: string
          last_checked_at: string | null
          opportunities: Json | null
          previous_position: number | null
          search_volume: number | null
          shop_id: string
          target_rank: number | null
          target_url: string
          trend: string | null
          updated_at: string | null
          volume: number | null
        }
        Insert: {
          competition?: string | null
          cpc?: number | null
          created_at?: string | null
          current_position?: number | null
          current_rank?: number | null
          difficulty?: string | null
          id?: string
          keyword: string
          last_checked_at?: string | null
          opportunities?: Json | null
          previous_position?: number | null
          search_volume?: number | null
          shop_id: string
          target_rank?: number | null
          target_url: string
          trend?: string | null
          updated_at?: string | null
          volume?: number | null
        }
        Update: {
          competition?: string | null
          cpc?: number | null
          created_at?: string | null
          current_position?: number | null
          current_rank?: number | null
          difficulty?: string | null
          id?: string
          keyword?: string
          last_checked_at?: string | null
          opportunities?: Json | null
          previous_position?: number | null
          search_volume?: number | null
          shop_id?: string
          target_rank?: number | null
          target_url?: string
          trend?: string | null
          updated_at?: string | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tracked_keywords_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
