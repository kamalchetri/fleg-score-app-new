// SYNC: copied from Fleg-score web 2026-07-04 — keep in sync manually (no edits here)
// ─────────────────────────────────────────────────────────────────────────────
//  Supabase database types — generated from live schema (project: Fleg-web)
//  Generated: 2026-07-03 via Supabase MCP (post WP-1 migrations)
//  Regenerate after every migration; paste wholesale over this file.
// ─────────────────────────────────────────────────────────────────────────────

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
      aiko_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: number
          raw_event_json: Json | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          registration_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: number
          raw_event_json?: Json | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          registration_id: string
          status: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: number
          raw_event_json?: Json | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          registration_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "aiko_payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "aiko_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      aiko_registration_categories: {
        Row: {
          category_id: string
          category_name: string
          category_type: string
          id: number
          partner_age: number | null
          partner_email: string | null
          partner_gender: string | null
          partner_id_proof: string | null
          partner_name: string | null
          partner_phone: string | null
          registration_id: string
          status: string
        }
        Insert: {
          category_id: string
          category_name: string
          category_type: string
          id?: number
          partner_age?: number | null
          partner_email?: string | null
          partner_gender?: string | null
          partner_id_proof?: string | null
          partner_name?: string | null
          partner_phone?: string | null
          registration_id: string
          status?: string
        }
        Update: {
          category_id?: string
          category_name?: string
          category_type?: string
          id?: number
          partner_age?: number | null
          partner_email?: string | null
          partner_gender?: string | null
          partner_id_proof?: string | null
          partner_name?: string | null
          partner_phone?: string | null
          registration_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "aiko_registration_categories_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "aiko_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      aiko_registration_controls: {
        Row: {
          event_config: Json | null
          payment_open: boolean
          public_message: string | null
          registration_open: boolean
          tournament_key: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          event_config?: Json | null
          payment_open?: boolean
          public_message?: string | null
          registration_open?: boolean
          tournament_key: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          event_config?: Json | null
          payment_open?: boolean
          public_message?: string | null
          registration_open?: boolean
          tournament_key?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      aiko_registrations: {
        Row: {
          addon_fee_amount: number
          age: number | null
          base_fee_amount: number
          city: string
          created_at: string
          currency: string
          email: string
          emergency_contact: string | null
          gender: string | null
          id: string
          id_proof: string | null
          max_categories_allowed: number
          paid_at: string | null
          payment_attempts: number
          payment_created_at: string | null
          payment_failure_reason: string | null
          payment_status: string
          payment_verified_at: string | null
          phone: string
          player_name: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          recovery_token_hash: string | null
          registration_status: string
          release_reason: string | null
          released_at: string | null
          reservation_expires_at: string | null
          skill_level: string
          total_fee_amount: number
          tournament_id: string
          updated_at: string
        }
        Insert: {
          addon_fee_amount: number
          age?: number | null
          base_fee_amount: number
          city: string
          created_at?: string
          currency?: string
          email: string
          emergency_contact?: string | null
          gender?: string | null
          id: string
          id_proof?: string | null
          max_categories_allowed: number
          paid_at?: string | null
          payment_attempts?: number
          payment_created_at?: string | null
          payment_failure_reason?: string | null
          payment_status?: string
          payment_verified_at?: string | null
          phone: string
          player_name: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          recovery_token_hash?: string | null
          registration_status?: string
          release_reason?: string | null
          released_at?: string | null
          reservation_expires_at?: string | null
          skill_level: string
          total_fee_amount: number
          tournament_id?: string
          updated_at?: string
        }
        Update: {
          addon_fee_amount?: number
          age?: number | null
          base_fee_amount?: number
          city?: string
          created_at?: string
          currency?: string
          email?: string
          emergency_contact?: string | null
          gender?: string | null
          id?: string
          id_proof?: string | null
          max_categories_allowed?: number
          paid_at?: string | null
          payment_attempts?: number
          payment_created_at?: string | null
          payment_failure_reason?: string | null
          payment_status?: string
          payment_verified_at?: string | null
          phone?: string
          player_name?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          recovery_token_hash?: string | null
          registration_status?: string
          release_reason?: string | null
          released_at?: string | null
          reservation_expires_at?: string | null
          skill_level?: string
          total_fee_amount?: number
          tournament_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      entrant_contacts: {
        Row: {
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          entrant_id: string
          notes: string | null
          player_details: Json
          tournament_id: string
        }
        Insert: {
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at?: string
          entrant_id: string
          notes?: string | null
          player_details?: Json
          tournament_id: string
        }
        Update: {
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          entrant_id?: string
          notes?: string | null
          player_details?: Json
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrant_contacts_entrant_id_fkey"
            columns: ["entrant_id"]
            isOneToOne: true
            referencedRelation: "entrants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrant_contacts_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      entrants: {
        Row: {
          amount_due: number
          category_id: string
          created_at: string
          created_by: string | null
          display_name: string
          id: string
          paid_at: string | null
          payment_status: string
          players: Json
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          seed: number | null
          status: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          amount_due?: number
          category_id: string
          created_at?: string
          created_by?: string | null
          display_name: string
          id?: string
          paid_at?: string | null
          payment_status?: string
          players?: Json
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          seed?: number | null
          status?: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          amount_due?: number
          category_id?: string
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          paid_at?: string | null
          payment_status?: string
          players?: Json
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          seed?: number | null
          status?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrants_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          category_id: string
          completed_at: string | null
          court: string | null
          created_at: string
          entrant_a: string | null
          entrant_b: string | null
          format_override: Json | null
          id: string
          position: number
          referee_id: string | null
          round: number
          scheduled_at: string | null
          score: Json
          stage_id: string | null
          started_at: string | null
          status: string
          tournament_id: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          category_id: string
          completed_at?: string | null
          court?: string | null
          created_at?: string
          entrant_a?: string | null
          entrant_b?: string | null
          format_override?: Json | null
          id?: string
          position?: number
          referee_id?: string | null
          round?: number
          scheduled_at?: string | null
          score?: Json
          stage_id?: string | null
          started_at?: string | null
          status?: string
          tournament_id: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          category_id?: string
          completed_at?: string | null
          court?: string | null
          created_at?: string
          entrant_a?: string | null
          entrant_b?: string | null
          format_override?: Json | null
          id?: string
          position?: number
          referee_id?: string | null
          round?: number
          scheduled_at?: string | null
          score?: Json
          stage_id?: string | null
          started_at?: string | null
          status?: string
          tournament_id?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_entrant_a_fkey"
            columns: ["entrant_a"]
            isOneToOne: false
            referencedRelation: "entrants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_entrant_b_fkey"
            columns: ["entrant_b"]
            isOneToOne: false
            referencedRelation: "entrants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "entrants"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_profiles: {
        Row: {
          account_type: string
          city: string | null
          created_at: string
          expected_tournaments_per_year: number | null
          gst_required: boolean
          gstin: string | null
          logo_url: string | null
          org_name: string | null
          org_type: string | null
          pan: string | null
          payout_details: Json
          payouts_enabled: boolean
          sports: string[]
          state: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: string
          city?: string | null
          created_at?: string
          expected_tournaments_per_year?: number | null
          gst_required?: boolean
          gstin?: string | null
          logo_url?: string | null
          org_name?: string | null
          org_type?: string | null
          pan?: string | null
          payout_details?: Json
          payouts_enabled?: boolean
          sports?: string[]
          state?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          city?: string | null
          created_at?: string
          expected_tournaments_per_year?: number | null
          gst_required?: boolean
          gstin?: string | null
          logo_url?: string | null
          org_name?: string | null
          org_type?: string | null
          pan?: string | null
          payout_details?: Json
          payouts_enabled?: boolean
          sports?: string[]
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      score_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: number
          match_id: string
          payload: Json
          tournament_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: never
          match_id: string
          payload?: Json
          tournament_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: never
          match_id?: string
          payload?: Json
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          category_id: string
          config: Json
          created_at: string
          id: string
          name: string
          sort_order: number
          stage_type: string
          tournament_id: string
        }
        Insert: {
          category_id: string
          config?: Json
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          stage_type: string
          tournament_id: string
        }
        Update: {
          category_id?: string
          config?: Json
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          stage_type?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stages_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_categories: {
        Row: {
          created_at: string
          entrant_type: string
          entry_fee: number
          format: string
          id: string
          max_entrants: number | null
          name: string
          sort_order: number
          tournament_id: string
        }
        Insert: {
          created_at?: string
          entrant_type?: string
          entry_fee?: number
          format?: string
          id?: string
          max_entrants?: number | null
          name: string
          sort_order?: number
          tournament_id: string
        }
        Update: {
          created_at?: string
          entrant_type?: string
          entry_fee?: number
          format?: string
          id?: string
          max_entrants?: number | null
          name?: string
          sort_order?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_categories_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_staff: {
        Row: {
          created_at: string
          staff_role: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          staff_role: string
          tournament_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          staff_role?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_staff_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          banner_url: string | null
          city: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          name: string
          organizer_id: string
          registration_ends_at: string | null
          slug: string | null
          sport: string
          sport_config: Json
          starts_at: string | null
          state: string | null
          status: string
          updated_at: string
          venue_name: string | null
          visibility: string
        }
        Insert: {
          banner_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          name: string
          organizer_id: string
          registration_ends_at?: string | null
          slug?: string | null
          sport: string
          sport_config?: Json
          starts_at?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          venue_name?: string | null
          visibility?: string
        }
        Update: {
          banner_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          organizer_id?: string
          registration_ends_at?: string | null
          slug?: string | null
          sport?: string
          sport_config?: Json
          starts_at?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          venue_name?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      // Pending deployment. This table is not on Fleg-web production.
      // The shape matches docs/nspg-audit/migration.sql only.
      // Insert and Update are never: the app may SELECT, and append only through log_audit_event.
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: number
          occurred_at: string
          tournament_id: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // Pending deployment. This RPC is not on Fleg-web production.
      // The signature matches docs/append-score-event-guarded/migration.sql only.
      append_score_event_guarded: {
        Args: {
          p_expected_last_event_id: number
          p_event_type: string
          p_match_id: string
          p_payload: Json
        }
        Returns: {
          conflict: boolean
          event_id: number | null
          last_event_id: number
          ok: boolean
        }[]
      }
      aiko_insert_categories_atomic: {
        Args: { p_categories: Json; p_registration_id: string }
        Returns: Json
      }
      aiko_release_pending_registration: {
        Args: { p_reason: string; p_registration_id: string }
        Returns: Json
      }
      aiko_replace_categories_atomic: {
        Args: { p_categories: Json; p_registration_id: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_tournament_public: { Args: { t_id: string }; Returns: boolean }
      is_tournament_staff: {
        Args: { roles: string[]; t_id: string }
        Returns: boolean
      }
      // Pending deployment. This RPC is not on Fleg-web production.
      // The signature matches docs/nspg-audit/migration.sql only.
      log_audit_event: {
        Args: {
          p_action: string
          p_details: Json
          p_entity_id: string
          p_entity_type: string
          p_tournament_id: string
        }
        Returns: number
      }
      register_entrant: {
        Args: {
          p_category_id: string
          p_contact_email: string
          p_contact_name: string
          p_contact_phone: string
          p_display_name: string
          p_notes?: string
          p_player_details?: Json
          p_players: Json
          p_tournament_id: string
        }
        Returns: string
      }
      reload_pgrst_schema: { Args: never; Returns: undefined }
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
