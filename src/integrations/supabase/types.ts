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
          actions: Json | null
          created_at: string
          description: string | null
          id: string
          last_run: string | null
          name: string
          shop_id: string
          status: string
          success_count: number | null
          total_runs: number | null
          trigger_type: string
          trigger_value: string
          updated_at: string
        }
        Insert: {
          actions?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          last_run?: string | null
          name: string
          shop_id: string
          status?: string
          success_count?: number | null
          total_runs?: number | null
          trigger_type: string
          trigger_value: string
          updated_at?: string
        }
        Update: {
          actions?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          last_run?: string | null
          name?: string
          shop_id?: string
          status?: string
          success_count?: number | null
          total_runs?: number | null
          trigger_type?: string
          trigger_value?: string
          updated_at?: string
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
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          shop_id: string
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shop_id: string
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shop_id?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
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
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: number | null
          product_count: number | null
          shop_id: string
          slug: string
          updated_at: string
          woocommerce_id: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: number | null
          product_count?: number | null
          shop_id: string
          slug: string
          updated_at?: string
          woocommerce_id: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: number | null
          product_count?: number | null
          shop_id?: string
          slug?: string
          updated_at?: string
          woocommerce_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "collections_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          categories: Json | null
          created_at: string
          description: string | null
          featured: boolean | null
          id: string
          images: Json | null
          name: string
          on_sale: boolean | null
          price: number | null
          regular_price: number | null
          sale_price: number | null
          shop_id: string
          short_description: string | null
          sku: string | null
          slug: string
          status: string
          stock_quantity: number | null
          stock_status: string | null
          updated_at: string
          woocommerce_id: number
        }
        Insert: {
          categories?: Json | null
          created_at?: string
          description?: string | null
          featured?: boolean | null
          id?: string
          images?: Json | null
          name: string
          on_sale?: boolean | null
          price?: number | null
          regular_price?: number | null
          sale_price?: number | null
          shop_id: string
          short_description?: string | null
          sku?: string | null
          slug: string
          status?: string
          stock_quantity?: number | null
          stock_status?: string | null
          updated_at?: string
          woocommerce_id: number
        }
        Update: {
          categories?: Json | null
          created_at?: string
          description?: string | null
          featured?: boolean | null
          id?: string
          images?: Json | null
          name?: string
          on_sale?: boolean | null
          price?: number | null
          regular_price?: number | null
          sale_price?: number | null
          shop_id?: string
          short_description?: string | null
          sku?: string | null
          slug?: string
          status?: string
          stock_quantity?: number | null
          stock_status?: string | null
          updated_at?: string
          woocommerce_id?: number
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
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          openai_api_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          openai_api_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          openai_api_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seo_diagnostics: {
        Row: {
          created_at: string
          errors_count: number | null
          id: string
          info_count: number | null
          issues: Json | null
          recommendations: Json | null
          score: number | null
          shop_id: string
          status: string
          summary: Json | null
          total_issues: number | null
          updated_at: string
          warnings_count: number | null
        }
        Insert: {
          created_at?: string
          errors_count?: number | null
          id?: string
          info_count?: number | null
          issues?: Json | null
          recommendations?: Json | null
          score?: number | null
          shop_id: string
          status?: string
          summary?: Json | null
          total_issues?: number | null
          updated_at?: string
          warnings_count?: number | null
        }
        Update: {
          created_at?: string
          errors_count?: number | null
          id?: string
          info_count?: number | null
          issues?: Json | null
          recommendations?: Json | null
          score?: number | null
          shop_id?: string
          status?: string
          summary?: Json | null
          total_issues?: number | null
          updated_at?: string
          warnings_count?: number | null
        }
        Relationships: []
      }
      shops: {
        Row: {
          analytics_enabled: boolean | null
          collections_slug: string | null
          consumer_key: string | null
          consumer_secret: string | null
          created_at: string
          id: string
          jetpack_access_token: string | null
          language: string
          name: string
          openai_api_key: string | null
          shopify_access_token: string | null
          status: string
          type: string
          updated_at: string
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
          created_at?: string
          id?: string
          jetpack_access_token?: string | null
          language?: string
          name: string
          openai_api_key?: string | null
          shopify_access_token?: string | null
          status?: string
          type: string
          updated_at?: string
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
          created_at?: string
          id?: string
          jetpack_access_token?: string | null
          language?: string
          name?: string
          openai_api_key?: string | null
          shopify_access_token?: string | null
          status?: string
          type?: string
          updated_at?: string
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
          created_at: string
          current_rank: number | null
          difficulty: number | null
          id: string
          keyword: string
          opportunities: number | null
          shop_id: string
          target_rank: number | null
          trend: string | null
          updated_at: string
          volume: number | null
        }
        Insert: {
          competition?: string | null
          cpc?: number | null
          created_at?: string
          current_rank?: number | null
          difficulty?: number | null
          id?: string
          keyword: string
          opportunities?: number | null
          shop_id: string
          target_rank?: number | null
          trend?: string | null
          updated_at?: string
          volume?: number | null
        }
        Update: {
          competition?: string | null
          cpc?: number | null
          created_at?: string
          current_rank?: number | null
          difficulty?: number | null
          id?: string
          keyword?: string
          opportunities?: number | null
          shop_id?: string
          target_rank?: number | null
          trend?: string | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
