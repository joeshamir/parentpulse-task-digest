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
      action_items: {
        Row: {
          category: string
          created_at: string
          deadline: string | null
          group_jid: string | null
          group_name: string
          id: string
          is_completed: boolean
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          deadline?: string | null
          group_jid?: string | null
          group_name: string
          id?: string
          is_completed?: boolean
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          deadline?: string | null
          group_jid?: string | null
          group_name?: string
          id?: string
          is_completed?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_summaries: {
        Row: {
          created_at: string
          date: string
          group_name: string
          id: string
          summary_text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          group_name: string
          id?: string
          summary_text: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          group_name?: string
          id?: string
          summary_text?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          daily_summary_enabled: boolean
          last_sent_on: string | null
          send_hour_local: number
          test_requested_at: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          daily_summary_enabled?: boolean
          last_sent_on?: string | null
          send_hour_local?: number
          test_requested_at?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          daily_summary_enabled?: boolean
          last_sent_on?: string | null
          send_hour_local?: number
          test_requested_at?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      privacy_prefs: {
        Row: {
          completed_task_retention_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_task_retention_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_task_retention_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tracked_groups: {
        Row: {
          created_at: string
          group_jid: string
          group_name: string
          id: string
          is_tracked: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          group_jid: string
          group_name: string
          id?: string
          is_tracked?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          group_jid?: string
          group_name?: string
          id?: string
          is_tracked?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          consent_version: string
          created_at: string
          group_notice_accepted_at: string
          locale: string
          marketing_opt_in: boolean
          privacy_accepted_at: string
          terms_accepted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_version: string
          created_at?: string
          group_notice_accepted_at?: string
          locale?: string
          marketing_opt_in?: boolean
          privacy_accepted_at?: string
          terms_accepted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_version?: string
          created_at?: string
          group_notice_accepted_at?: string
          locale?: string
          marketing_opt_in?: boolean
          privacy_accepted_at?: string
          terms_accepted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          id: string
          qr_code_str: string | null
          reconnect_requested_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          qr_code_str?: string | null
          reconnect_requested_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          qr_code_str?: string | null
          reconnect_requested_at?: string | null
          status?: string
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
      purge_expired_data: { Args: never; Returns: undefined }
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
