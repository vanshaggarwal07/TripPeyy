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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      cultural_experiences: {
        Row: {
          category: string
          completed: boolean | null
          cost: number | null
          created_at: string
          description: string | null
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          notes: string | null
          rating: number | null
          title: string
          trip_id: string
        }
        Insert: {
          category: string
          completed?: boolean | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          notes?: string | null
          rating?: number | null
          title: string
          trip_id: string
        }
        Update: {
          category?: string
          completed?: boolean | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          notes?: string | null
          rating?: number | null
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cultural_experiences_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string | null
          description: string
          expense_date: string
          id: string
          location: string | null
          trip_id: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          currency?: string | null
          description: string
          expense_date?: string
          id?: string
          location?: string | null
          trip_id: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string | null
          description?: string
          expense_date?: string
          id?: string
          location?: string | null
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      group_challenge_participants: {
        Row: {
          challenge_id: string
          final_score: number | null
          id: string
          joined_at: string | null
          progress: Json | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          final_score?: number | null
          id?: string
          joined_at?: string | null
          progress?: Json | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          final_score?: number | null
          id?: string
          joined_at?: string | null
          progress?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "group_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_challenge_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      group_challenges: {
        Row: {
          created_at: string
          creator_id: string
          description: string
          ends_at: string
          id: string
          is_active: boolean | null
          max_participants: number
          quest_requirements: Json
          reward_distribution: Json
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description: string
          ends_at: string
          id?: string
          is_active?: boolean | null
          max_participants?: number
          quest_requirements: Json
          reward_distribution: Json
          starts_at: string
          title: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string
          ends_at?: string
          id?: string
          is_active?: boolean | null
          max_participants?: number
          quest_requirements?: Json
          reward_distribution?: Json
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
          preferred_currency: string | null
          travel_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          preferred_currency?: string | null
          travel_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          preferred_currency?: string | null
          travel_style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quest_submissions: {
        Row: {
          created_at: string
          file_url: string
          id: string
          metadata: Json | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["submission_status"] | null
          submission_type: string
          updated_at: string
          user_quest_id: string
          verification_results: Json | null
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          metadata?: Json | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["submission_status"] | null
          submission_type: string
          updated_at?: string
          user_quest_id: string
          verification_results?: Json | null
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          metadata?: Json | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["submission_status"] | null
          submission_type?: string
          updated_at?: string
          user_quest_id?: string
          verification_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quest_submissions_user_quest_id_fkey"
            columns: ["user_quest_id"]
            isOneToOne: false
            referencedRelation: "user_quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          bonus_coins: number | null
          category: Database["public"]["Enums"]["quest_category"]
          chain_order: number | null
          chain_parent_id: string | null
          created_at: string
          description: string
          difficulty_level: number | null
          expires_at: string | null
          id: string
          is_chain_quest: boolean | null
          max_participants: number | null
          requirements: Json
          reward_coins: number
          title: string
          updated_at: string
          verification_rules: Json
        }
        Insert: {
          bonus_coins?: number | null
          category: Database["public"]["Enums"]["quest_category"]
          chain_order?: number | null
          chain_parent_id?: string | null
          created_at?: string
          description: string
          difficulty_level?: number | null
          expires_at?: string | null
          id?: string
          is_chain_quest?: boolean | null
          max_participants?: number | null
          requirements: Json
          reward_coins?: number
          title: string
          updated_at?: string
          verification_rules: Json
        }
        Update: {
          bonus_coins?: number | null
          category?: Database["public"]["Enums"]["quest_category"]
          chain_order?: number | null
          chain_parent_id?: string | null
          created_at?: string
          description?: string
          difficulty_level?: number | null
          expires_at?: string | null
          id?: string
          is_chain_quest?: boolean | null
          max_participants?: number | null
          requirements?: Json
          reward_coins?: number
          title?: string
          updated_at?: string
          verification_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "quests_chain_parent_id_fkey"
            columns: ["chain_parent_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      store_items: {
        Row: {
          category: string
          cost_coins: number
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean | null
          metadata: Json | null
          provider: string | null
          stock_quantity: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          cost_coins: number
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          provider?: string | null
          stock_quantity?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cost_coins?: number
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          provider?: string | null
          stock_quantity?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          budget_limit: number | null
          created_at: string
          description: string | null
          destination: string
          end_date: string | null
          id: string
          start_date: string | null
          status: string | null
          title: string
          total_spent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_limit?: number | null
          created_at?: string
          description?: string | null
          destination: string
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          title: string
          total_spent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_limit?: number | null
          created_at?: string
          description?: string | null
          destination?: string
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          title?: string
          total_spent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_coins: {
        Row: {
          available_coins: number
          created_at: string
          lifetime_earned: number
          total_coins: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_coins?: number
          created_at?: string
          lifetime_earned?: number
          total_coins?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_coins?: number
          created_at?: string
          lifetime_earned?: number
          total_coins?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_coins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_leaderboard: {
        Row: {
          created_at: string
          current_streak: number | null
          last_quest_completed: string | null
          longest_streak: number | null
          rank_position: number | null
          total_coins_earned: number | null
          total_quests_completed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number | null
          last_quest_completed?: string | null
          longest_streak?: number | null
          rank_position?: number | null
          total_coins_earned?: number | null
          total_quests_completed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number | null
          last_quest_completed?: string | null
          longest_streak?: number | null
          rank_position?: number | null
          total_coins_earned?: number | null
          total_quests_completed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_leaderboard_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_purchases: {
        Row: {
          coins_spent: number
          created_at: string
          id: string
          purchase_details: Json | null
          status: string | null
          store_item_id: string
          user_id: string
        }
        Insert: {
          coins_spent: number
          created_at?: string
          id?: string
          purchase_details?: Json | null
          status?: string | null
          store_item_id: string
          user_id: string
        }
        Update: {
          coins_spent?: number
          created_at?: string
          id?: string
          purchase_details?: Json | null
          status?: string | null
          store_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_purchases_store_item_id_fkey"
            columns: ["store_item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_quests: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          progress: Json | null
          quest_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["quest_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          progress?: Json | null
          quest_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["quest_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          progress?: Json | null
          quest_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["quest_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quests_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_rewards: {
        Row: {
          bonus_coins: number | null
          coins_earned: number | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          quest_id: string | null
          reward_type: Database["public"]["Enums"]["reward_type"]
          user_id: string
        }
        Insert: {
          bonus_coins?: number | null
          coins_earned?: number | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          quest_id?: string | null
          reward_type: Database["public"]["Enums"]["reward_type"]
          user_id: string
        }
        Update: {
          bonus_coins?: number | null
          coins_earned?: number | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          quest_id?: string | null
          reward_type?: Database["public"]["Enums"]["reward_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_rewards_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_quest_coins: {
        Args: {
          p_bonus_coins?: number
          p_coins: number
          p_quest_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      verify_quest_submission: {
        Args: { submission_id: string }
        Returns: Json
      }
    }
    Enums: {
      quest_category:
        | "budget"
        | "exploration"
        | "transport"
        | "cultural"
        | "social_impact"
      quest_status: "active" | "completed" | "expired" | "locked"
      reward_type: "coins" | "discount" | "experience" | "gift_card"
      submission_status: "pending" | "verified" | "rejected" | "under_review"
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
      quest_category: [
        "budget",
        "exploration",
        "transport",
        "cultural",
        "social_impact",
      ],
      quest_status: ["active", "completed", "expired", "locked"],
      reward_type: ["coins", "discount", "experience", "gift_card"],
      submission_status: ["pending", "verified", "rejected", "under_review"],
    },
  },
} as const
