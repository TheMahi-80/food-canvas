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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_bn: string
          name_en: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_bn: string
          name_en?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_bn?: string
          name_en?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      discounts: {
        Row: {
          category_id: string | null
          coupon_code: string | null
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          min_cart_value: number | null
          name_bn: string
          product_id: string | null
          scope: string
          starts_at: string | null
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          category_id?: string | null
          coupon_code?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          min_cart_value?: number | null
          name_bn: string
          product_id?: string | null
          scope: string
          starts_at?: string | null
          type: string
          updated_at?: string
          value: number
        }
        Update: {
          category_id?: string | null
          coupon_code?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          min_cart_value?: number | null
          name_bn?: string
          product_id?: string | null
          scope?: string
          starts_at?: string | null
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      opening_hours: {
        Row: {
          closes_at: string
          created_at: string
          day_of_week: number
          is_closed: boolean
          opens_at: string
          updated_at: string
        }
        Insert: {
          closes_at: string
          created_at?: string
          day_of_week: number
          is_closed?: boolean
          opens_at: string
          updated_at?: string
        }
        Update: {
          closes_at?: string
          created_at?: string
          day_of_week?: number
          is_closed?: boolean
          opens_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_addons: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          name_bn: string
          name_en: string | null
          price: number
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          name_bn: string
          name_en?: string | null
          price: number
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          name_bn?: string
          name_en?: string | null
          price?: number
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          name_bn: string
          name_en: string | null
          price: number
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          name_bn: string
          name_en?: string | null
          price: number
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          name_bn?: string
          name_en?: string | null
          price?: number
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          created_at: string
          description_bn: string | null
          description_en: string | null
          id: string
          image_path: string | null
          is_active: boolean
          is_available: boolean
          is_featured: boolean
          name_bn: string
          name_en: string | null
          price: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          is_available?: boolean
          is_featured?: boolean
          name_bn: string
          name_en?: string | null
          price: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          is_available?: boolean
          is_featured?: boolean
          name_bn?: string
          name_en?: string | null
          price?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_settings: {
        Row: {
          about_bn: string | null
          address_bn: string | null
          closure_note_bn: string | null
          contact_phone: string | null
          created_at: string
          delivery_enabled: boolean | null
          delivery_fee: number | null
          email: string | null
          facebook_url: string | null
          hero_headline_bn: string
          hero_image_path: string | null
          hero_subtext_bn: string
          id: number
          logo_path: string | null
          map_url: string | null
          min_order: number | null
          pickup_enabled: boolean | null
          restaurant_name: string
          temporarily_closed: boolean
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          about_bn?: string | null
          address_bn?: string | null
          closure_note_bn?: string | null
          contact_phone?: string | null
          created_at?: string
          delivery_enabled?: boolean | null
          delivery_fee?: number | null
          email?: string | null
          facebook_url?: string | null
          hero_headline_bn?: string
          hero_image_path?: string | null
          hero_subtext_bn?: string
          id?: number
          logo_path?: string | null
          map_url?: string | null
          min_order?: number | null
          pickup_enabled?: boolean | null
          restaurant_name?: string
          temporarily_closed?: boolean
          updated_at?: string
          whatsapp_number?: string
        }
        Update: {
          about_bn?: string | null
          address_bn?: string | null
          closure_note_bn?: string | null
          contact_phone?: string | null
          created_at?: string
          delivery_enabled?: boolean | null
          delivery_fee?: number | null
          email?: string | null
          facebook_url?: string | null
          hero_headline_bn?: string
          hero_image_path?: string | null
          hero_subtext_bn?: string
          id?: number
          logo_path?: string | null
          map_url?: string | null
          min_order?: number | null
          pickup_enabled?: boolean | null
          restaurant_name?: string
          temporarily_closed?: boolean
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_category: {
        Args: {
          p_category_id: string
          p_delete_products?: boolean
          p_reassign_to?: string
        }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      lookup_coupon: {
        Args: { p_code: string }
        Returns: {
          coupon_code: string
          ends_at: string
          id: string
          min_cart_value: number
          name_bn: string
          starts_at: string
          type: string
          value: number
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
