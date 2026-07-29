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
      leads: {
        Row: {
          attempt_id: string | null
          city: string | null
          consent_marketing: boolean
          consent_privacy: boolean
          created_at: string
          email: string
          id: string
          is_demo: boolean
          name: string
          phone: string | null
          source: string | null
          updated_at: string
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          attempt_id?: string | null
          city?: string | null
          consent_marketing?: boolean
          consent_privacy?: boolean
          created_at?: string
          email: string
          id?: string
          is_demo?: boolean
          name: string
          phone?: string | null
          source?: string | null
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          attempt_id?: string | null
          city?: string | null
          consent_marketing?: boolean
          consent_privacy?: boolean
          created_at?: string
          email?: string
          id?: string
          is_demo?: boolean
          name?: string
          phone?: string | null
          source?: string | null
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      pmma_attempt_questions: {
        Row: {
          answered_at: string | null
          attempt_id: string
          created_at: string
          display_order: number
          id: string
          is_bonus: boolean
          is_correct: boolean | null
          question_id: string
          response_time_seconds: number | null
          selected_answer: boolean | null
        }
        Insert: {
          answered_at?: string | null
          attempt_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_bonus?: boolean
          is_correct?: boolean | null
          question_id: string
          response_time_seconds?: number | null
          selected_answer?: boolean | null
        }
        Update: {
          answered_at?: string | null
          attempt_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_bonus?: boolean
          is_correct?: boolean | null
          question_id?: string
          response_time_seconds?: number | null
          selected_answer?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pmma_attempt_questions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "pmma_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pmma_attempt_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pmma_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      pmma_attempts: {
        Row: {
          anonymous_session_id: string | null
          best_streak: number
          bonus_answered: boolean
          bonus_correct: boolean | null
          campaign_id: string | null
          completed_at: string | null
          correct_count: number
          created_at: string
          cta_variant: string | null
          current_question_index: number
          device_type: string | null
          duration_seconds: number | null
          headline_variant: string | null
          id: string
          lead_captured_at: string | null
          lead_id: string | null
          partner_code: string | null
          percentage: number
          referrer: string | null
          started_at: string
          status: string
          total_questions: number
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          wrong_count: number
        }
        Insert: {
          anonymous_session_id?: string | null
          best_streak?: number
          bonus_answered?: boolean
          bonus_correct?: boolean | null
          campaign_id?: string | null
          completed_at?: string | null
          correct_count?: number
          created_at?: string
          cta_variant?: string | null
          current_question_index?: number
          device_type?: string | null
          duration_seconds?: number | null
          headline_variant?: string | null
          id?: string
          lead_captured_at?: string | null
          lead_id?: string | null
          partner_code?: string | null
          percentage?: number
          referrer?: string | null
          started_at?: string
          status?: string
          total_questions?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          wrong_count?: number
        }
        Update: {
          anonymous_session_id?: string | null
          best_streak?: number
          bonus_answered?: boolean
          bonus_correct?: boolean | null
          campaign_id?: string | null
          completed_at?: string | null
          correct_count?: number
          created_at?: string
          cta_variant?: string | null
          current_question_index?: number
          device_type?: string | null
          duration_seconds?: number | null
          headline_variant?: string | null
          id?: string
          lead_captured_at?: string | null
          lead_id?: string | null
          partner_code?: string | null
          percentage?: number
          referrer?: string | null
          started_at?: string
          status?: string
          total_questions?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "pmma_attempts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "pmma_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pmma_attempts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "pmma_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      pmma_campaigns: {
        Row: {
          bonus_enabled: boolean
          created_at: string
          end_at: string | null
          id: string
          lead_capture_after_question: number
          name: string
          offer_url: string
          paused_message: string | null
          product_id: string | null
          questions_per_attempt: number
          questions_per_discipline: number
          settings_json: Json
          slug: string
          start_at: string | null
          status: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          bonus_enabled?: boolean
          created_at?: string
          end_at?: string | null
          id?: string
          lead_capture_after_question?: number
          name: string
          offer_url?: string
          paused_message?: string | null
          product_id?: string | null
          questions_per_attempt?: number
          questions_per_discipline?: number
          settings_json?: Json
          slug: string
          start_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          bonus_enabled?: boolean
          created_at?: string
          end_at?: string | null
          id?: string
          lead_capture_after_question?: number
          name?: string
          offer_url?: string
          paused_message?: string | null
          product_id?: string | null
          questions_per_attempt?: number
          questions_per_discipline?: number
          settings_json?: Json
          slug?: string
          start_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      pmma_events: {
        Row: {
          attempt_id: string | null
          created_at: string
          event_data_json: Json
          event_name: string
          id: string
          lead_id: string | null
          session_id: string | null
        }
        Insert: {
          attempt_id?: string | null
          created_at?: string
          event_data_json?: Json
          event_name: string
          id?: string
          lead_id?: string | null
          session_id?: string | null
        }
        Update: {
          attempt_id?: string | null
          created_at?: string
          event_data_json?: Json
          event_name?: string
          id?: string
          lead_id?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      pmma_leads: {
        Row: {
          consent: boolean
          consent_at: string | null
          consent_text: string | null
          consent_text_version: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          partner_code: string | null
          source: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp_e164: string
        }
        Insert: {
          consent?: boolean
          consent_at?: string | null
          consent_text?: string | null
          consent_text_version?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          partner_code?: string | null
          source?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_e164: string
        }
        Update: {
          consent?: boolean
          consent_at?: string | null
          consent_text?: string | null
          consent_text_version?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          partner_code?: string | null
          source?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_e164?: string
        }
        Relationships: []
      }
      pmma_questions: {
        Row: {
          campaign_id: string | null
          correct_answer: boolean
          created_at: string
          created_by: string | null
          difficulty: string
          discipline: string
          feedback_correct: string
          feedback_wrong: string
          id: string
          is_active: boolean
          key_point: string
          legal_review_status: string | null
          original_reference: string | null
          pedagogical_review_status: string
          public_code: string
          sort_order: number
          source_name: string | null
          source_type: string | null
          statement: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          correct_answer: boolean
          created_at?: string
          created_by?: string | null
          difficulty?: string
          discipline: string
          feedback_correct: string
          feedback_wrong: string
          id?: string
          is_active?: boolean
          key_point: string
          legal_review_status?: string | null
          original_reference?: string | null
          pedagogical_review_status?: string
          public_code: string
          sort_order?: number
          source_name?: string | null
          source_type?: string | null
          statement: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          correct_answer?: boolean
          created_at?: string
          created_by?: string | null
          difficulty?: string
          discipline?: string
          feedback_correct?: string
          feedback_wrong?: string
          id?: string
          is_active?: boolean
          key_point?: string
          legal_review_status?: string | null
          original_reference?: string | null
          pedagogical_review_status?: string
          public_code?: string
          sort_order?: number
          source_name?: string | null
          source_type?: string | null
          statement?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pmma_questions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "pmma_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          answered_at: string
          attempt_id: string
          id: string
          is_correct: boolean
          option_id: string | null
          question_id: string
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          id?: string
          is_correct?: boolean
          option_id?: string | null
          question_id: string
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          id?: string
          is_correct?: boolean
          option_id?: string | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "quiz_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          consent_marketing: boolean
          consent_privacy: boolean
          created_at: string
          finished_at: string | null
          id: string
          lead_city: string | null
          lead_email: string | null
          lead_name: string | null
          lead_phone: string | null
          public_token: string
          source: string | null
          started_at: string
          status: string
          type: string
          updated_at: string
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          consent_marketing?: boolean
          consent_privacy?: boolean
          created_at?: string
          finished_at?: string | null
          id?: string
          lead_city?: string | null
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          public_token?: string
          source?: string | null
          started_at?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          consent_marketing?: boolean
          consent_privacy?: boolean
          created_at?: string
          finished_at?: string | null
          id?: string
          lead_city?: string | null
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          public_token?: string
          source?: string | null
          started_at?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      quiz_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          label: string
          option_text: string
          position: number
          question_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          label: string
          option_text: string
          position?: number
          question_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          label?: string
          option_text?: string
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string
          difficulty: string
          discipline: string
          explanation: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          position: number
          statement: string
          topic: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          difficulty?: string
          discipline: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          position?: number
          statement: string
          topic?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          difficulty?: string
          discipline?: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          position?: number
          statement?: string
          topic?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          attempt_id: string
          blank_count: number
          calculated_at: string
          correct_count: number
          created_at: string
          estimated_rank: string | null
          id: string
          passed: boolean
          recommendation: string | null
          score_percentage: number
          total_questions: number
          wrong_count: number
        }
        Insert: {
          attempt_id: string
          blank_count?: number
          calculated_at?: string
          correct_count?: number
          created_at?: string
          estimated_rank?: string | null
          id?: string
          passed?: boolean
          recommendation?: string | null
          score_percentage?: number
          total_questions?: number
          wrong_count?: number
        }
        Update: {
          attempt_id?: string
          blank_count?: number
          calculated_at?: string
          correct_count?: number
          created_at?: string
          estimated_rank?: string | null
          id?: string
          passed?: boolean
          recommendation?: string | null
          score_percentage?: number
          total_questions?: number
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "quiz_attempts"
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
