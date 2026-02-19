export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string;
          badge_id: string | null;
          created_at: string | null;
          id: string;
          item_position: number | null;
          item_title: string | null;
          journey_id: string | null;
          metadata: Json | null;
          rating: number | null;
          review_text: string | null;
          user_id: string;
        };
        Insert: {
          activity_type: string;
          badge_id?: string | null;
          created_at?: string | null;
          id?: string;
          item_position?: number | null;
          item_title?: string | null;
          journey_id?: string | null;
          metadata?: Json | null;
          rating?: number | null;
          review_text?: string | null;
          user_id: string;
        };
        Update: {
          activity_type?: string;
          badge_id?: string | null;
          created_at?: string | null;
          id?: string;
          item_position?: number | null;
          item_title?: string | null;
          journey_id?: string | null;
          metadata?: Json | null;
          rating?: number | null;
          review_text?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_journey_id_fkey";
            columns: ["journey_id"];
            isOneToOne: false;
            referencedRelation: "journeys";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_items: {
        Row: {
          collection_id: string;
          created_at: string | null;
          id: string;
          image_url: string | null;
          media_id: string;
          media_type: string;
          metadata: Json | null;
          title: string | null;
        };
        Insert: {
          collection_id: string;
          created_at?: string | null;
          id?: string;
          image_url?: string | null;
          media_id: string;
          media_type: string;
          metadata?: Json | null;
          title?: string | null;
        };
        Update: {
          collection_id?: string;
          created_at?: string | null;
          id?: string;
          image_url?: string | null;
          media_id?: string;
          media_type?: string;
          metadata?: Json | null;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
        ];
      };
      collections: {
        Row: {
          created_at: string | null;
          id: string;
          is_public: boolean | null;
          name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_public?: boolean | null;
          name: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_public?: boolean | null;
          name?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          created_at: string | null;
          follower_id: string;
          following_id: string;
        };
        Insert: {
          created_at?: string | null;
          follower_id: string;
          following_id: string;
        };
        Update: {
          created_at?: string | null;
          follower_id?: string;
          following_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      interactions: {
        Row: {
          comment_text: string | null;
          created_at: string | null;
          id: string;
          interaction_type: string;
          target_id: string;
          target_type: string;
          user_id: string;
        };
        Insert: {
          comment_text?: string | null;
          created_at?: string | null;
          id?: string;
          interaction_type: string;
          target_id: string;
          target_type: string;
          user_id: string;
        };
        Update: {
          comment_text?: string | null;
          created_at?: string | null;
          id?: string;
          interaction_type?: string;
          target_id?: string;
          target_type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      journey_progress: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          id: string;
          item_position: number;
          item_rating: number | null;
          item_runtime_minutes: number | null;
          item_title: string;
          item_year: number | null;
          journey_id: string;
          review_text: string | null;
          sequence_fit_rating: number | null;
          skipped_at: string | null;
          started_at: string | null;
          status: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          item_position: number;
          item_rating?: number | null;
          item_runtime_minutes?: number | null;
          item_title: string;
          item_year?: number | null;
          journey_id: string;
          review_text?: string | null;
          sequence_fit_rating?: number | null;
          skipped_at?: string | null;
          started_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          item_position?: number;
          item_rating?: number | null;
          item_runtime_minutes?: number | null;
          item_title?: string;
          item_year?: number | null;
          journey_id: string;
          review_text?: string | null;
          sequence_fit_rating?: number | null;
          skipped_at?: string | null;
          started_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "journey_progress_journey_id_fkey";
            columns: ["journey_id"];
            isOneToOne: false;
            referencedRelation: "journeys";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journey_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      journeys: {
        Row: {
          alternative_paths: Json | null;
          completed_at: string | null;
          content_type: string;
          created_at: string | null;
          current_position: number | null;
          description: string | null;
          difficulty_progression: string | null;
          forked_from: string | null;
          id: string;
          intent_answers: Json | null;
          is_created_by_user: boolean | null;
          is_public: boolean | null;
          items: Json;
          overall_rating: number | null;
          query: string;
          sequence_rating: number | null;
          started_at: string | null;
          status: string | null;
          title: string;
          total_items: number | null;
          total_runtime_minutes: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          alternative_paths?: Json | null;
          completed_at?: string | null;
          content_type: string;
          created_at?: string | null;
          current_position?: number | null;
          description?: string | null;
          difficulty_progression?: string | null;
          forked_from?: string | null;
          id?: string;
          intent_answers?: Json | null;
          is_created_by_user?: boolean | null;
          is_public?: boolean | null;
          items: Json;
          overall_rating?: number | null;
          query: string;
          sequence_rating?: number | null;
          started_at?: string | null;
          status?: string | null;
          title: string;
          total_items?: number | null;
          total_runtime_minutes?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          alternative_paths?: Json | null;
          completed_at?: string | null;
          content_type?: string;
          created_at?: string | null;
          current_position?: number | null;
          description?: string | null;
          difficulty_progression?: string | null;
          forked_from?: string | null;
          id?: string;
          intent_answers?: Json | null;
          is_created_by_user?: boolean | null;
          is_public?: boolean | null;
          items?: Json;
          overall_rating?: number | null;
          query?: string;
          sequence_rating?: number | null;
          started_at?: string | null;
          status?: string | null;
          title?: string;
          total_items?: number | null;
          total_runtime_minutes?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "journeys_forked_from_fkey";
            columns: ["forked_from"];
            isOneToOne: false;
            referencedRelation: "journeys";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journeys_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          favorite_genres: string[] | null;
          full_name: string | null;
          id: string;
          streaming_services: string[] | null;
          updated_at: string | null;
          username: string | null;
          website: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          favorite_genres?: string[] | null;
          full_name?: string | null;
          id: string;
          streaming_services?: string[] | null;
          updated_at?: string | null;
          username?: string | null;
          website?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          favorite_genres?: string[] | null;
          full_name?: string | null;
          id?: string;
          streaming_services?: string[] | null;
          updated_at?: string | null;
          username?: string | null;
          website?: string | null;
        };
        Relationships: [];
      };
      saved_journeys: {
        Row: {
          created_at: string | null;
          goal_amount: number | null;
          goal_unit: string | null;
          id: string;
          query: string;
          refinement_steps: Json | null;
          results: Json | null;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          goal_amount?: number | null;
          goal_unit?: string | null;
          id?: string;
          query: string;
          refinement_steps?: Json | null;
          results?: Json | null;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          goal_amount?: number | null;
          goal_unit?: string | null;
          id?: string;
          query?: string;
          refinement_steps?: Json | null;
          results?: Json | null;
          title: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_journeys_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_achievements: {
        Row: {
          achievement_id: string;
          created_at: string | null;
          id: string;
          progress: number | null;
          target: number;
          unlocked: boolean | null;
          unlocked_at: string | null;
          user_id: string;
        };
        Insert: {
          achievement_id: string;
          created_at?: string | null;
          id?: string;
          progress?: number | null;
          target: number;
          unlocked?: boolean | null;
          unlocked_at?: string | null;
          user_id: string;
        };
        Update: {
          achievement_id?: string;
          created_at?: string | null;
          id?: string;
          progress?: number | null;
          target?: number;
          unlocked?: boolean | null;
          unlocked_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_stats: {
        Row: {
          average_item_rating: number | null;
          average_journey_rating: number | null;
          current_streak_days: number | null;
          journey_completion_rate: number | null;
          last_activity_date: string | null;
          longest_streak_days: number | null;
          top_genres: Json | null;
          total_badges_unlocked: number | null;
          total_hours_watched: number | null;
          total_items_watched: number | null;
          total_journeys_completed: number | null;
          total_journeys_in_progress: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          average_item_rating?: number | null;
          average_journey_rating?: number | null;
          current_streak_days?: number | null;
          journey_completion_rate?: number | null;
          last_activity_date?: string | null;
          longest_streak_days?: number | null;
          top_genres?: Json | null;
          total_badges_unlocked?: number | null;
          total_hours_watched?: number | null;
          total_items_watched?: number | null;
          total_journeys_completed?: number | null;
          total_journeys_in_progress?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          average_item_rating?: number | null;
          average_journey_rating?: number | null;
          current_streak_days?: number | null;
          journey_completion_rate?: number | null;
          last_activity_date?: string | null;
          longest_streak_days?: number | null;
          top_genres?: Json | null;
          total_badges_unlocked?: number | null;
          total_hours_watched?: number | null;
          total_items_watched?: number | null;
          total_journeys_completed?: number | null;
          total_journeys_in_progress?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      update_user_stats: { Args: { p_user_id: string }; Returns: undefined };
      update_user_streak: { Args: { p_user_id: string }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
