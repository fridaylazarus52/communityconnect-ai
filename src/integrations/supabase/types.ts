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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          notes: string | null
          opportunity_id: string | null
          organisation: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          organisation?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          organisation?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          data: Json | null
          excerpt: string | null
          id: string
          message_id: string
          thread_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          excerpt?: string | null
          id?: string
          message_id: string
          thread_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          excerpt?: string | null
          id?: string
          message_id?: string
          thread_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          apply_url: string | null
          category: string
          compensation: string | null
          created_at: string
          deadline: string | null
          experience_levels: string[]
          featured: boolean
          id: string
          industry: string | null
          is_paid: boolean
          location: string
          logo_text: string | null
          organisation: string
          skills: string[]
          state: string | null
          summary: string
          title: string
          work_mode: string
        }
        Insert: {
          apply_url?: string | null
          category: string
          compensation?: string | null
          created_at?: string
          deadline?: string | null
          experience_levels?: string[]
          featured?: boolean
          id?: string
          industry?: string | null
          is_paid?: boolean
          location: string
          logo_text?: string | null
          organisation: string
          skills?: string[]
          state?: string | null
          summary: string
          title: string
          work_mode?: string
        }
        Update: {
          apply_url?: string | null
          category?: string
          compensation?: string | null
          created_at?: string
          deadline?: string | null
          experience_levels?: string[]
          featured?: boolean
          id?: string
          industry?: string | null
          is_paid?: boolean
          location?: string
          logo_text?: string | null
          organisation?: string
          skills?: string[]
          state?: string | null
          summary?: string
          title?: string
          work_mode?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          career_goal: string | null
          created_at: string
          current_status: string | null
          display_name: string | null
          education_level: string | null
          field_of_study: string | null
          id: string
          location: string | null
          onboarding_completed: boolean
          opportunity_interests: string[]
          preferred_industries: string[]
          sector_interests: string[] | null
          skills: string[]
          state: string | null
          updated_at: string
          work_preference: string | null
        }
        Insert: {
          avatar_url?: string | null
          career_goal?: string | null
          created_at?: string
          current_status?: string | null
          display_name?: string | null
          education_level?: string | null
          field_of_study?: string | null
          id: string
          location?: string | null
          onboarding_completed?: boolean
          opportunity_interests?: string[]
          preferred_industries?: string[]
          sector_interests?: string[] | null
          skills?: string[]
          state?: string | null
          updated_at?: string
          work_preference?: string | null
        }
        Update: {
          avatar_url?: string | null
          career_goal?: string | null
          created_at?: string
          current_status?: string | null
          display_name?: string | null
          education_level?: string | null
          field_of_study?: string | null
          id?: string
          location?: string | null
          onboarding_completed?: boolean
          opportunity_interests?: string[]
          preferred_industries?: string[]
          sector_interests?: string[] | null
          skills?: string[]
          state?: string | null
          updated_at?: string
          work_preference?: string | null
        }
        Relationships: []
      }
      saved_opportunities: {
        Row: {
          created_at: string
          id: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_opportunities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          id: string
          query: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
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
    Enums: {},
  },
} as const
