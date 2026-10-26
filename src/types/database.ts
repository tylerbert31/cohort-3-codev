export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EventStatus = 'active' | 'archived' | 'completed';
export type MemberRole = 'owner' | 'participant';

export interface Profile {
  id: string;
  clerk_user_id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: EventStatus;
  archived_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventMember {
  id: string;
  event_id: string;
  clerk_user_id: string;
  role: MemberRole;
  joined_at: string;
  profile?: Profile;
}

export interface EventInvite {
  id: string;
  event_id: string;
  invite_code: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  revoked_at: string | null;
}

export interface ChecklistSection {
  id: string;
  event_id: string;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
  items?: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  event_id: string;
  section_id: string | null;
  title: string;
  notes: string | null;
  quantity: string | null;
  assignee_id: string | null;
  deadline?: string | null;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignee?: Profile | null;
}

export interface ChecklistTemplate {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  sections?: TemplateSection[];
}

export interface TemplateSection {
  id: string;
  template_id: string;
  title: string;
  position: number;
  created_at: string;
  items?: TemplateItem[];
}

export interface TemplateItem {
  id: string;
  template_id: string;
  section_id: string | null;
  title: string;
  notes: string | null;
  quantity: string | null;
  position: number;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  event_id: string;
  actor_id: string;
  event_type:
    | 'event_created'
    | 'member_joined'
    | 'section_created'
    | 'item_created'
    | 'item_completed'
    | 'item_uncompleted'
    | 'item_deleted'
    | 'assignment_changed'
    | 'event_archived'
    | 'event_restored'
    | 'event_completed';
  details: Record<string, unknown>;
  created_at: string;
  actor?: Profile;
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          actor_id: string
          created_at: string
          details: Json
          event_id: string
          event_type: string
          id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          details?: Json
          event_id: string
          event_type: string
          id?: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          details?: Json
          event_id?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["clerk_user_id"]
          },
          {
            foreignKeyName: "activity_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          deadline: string | null
          event_id: string
          id: string
          is_completed: boolean
          notes: string | null
          position: number
          quantity: string | null
          section_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          deadline?: string | null
          event_id: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          position?: number
          quantity?: string | null
          section_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          event_id?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          position?: number
          quantity?: string | null
          section_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["clerk_user_id"]
          },
          {
            foreignKeyName: "checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["clerk_user_id"]
          },
          {
            foreignKeyName: "checklist_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["clerk_user_id"]
          },
          {
            foreignKeyName: "checklist_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "checklist_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_sections: {
        Row: {
          created_at: string
          event_id: string
          id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_sections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["clerk_user_id"]
          },
        ]
      }
      event_invites: {
        Row: {
          created_at: string
          created_by: string
          event_id: string
          id: string
          invite_code: string
          is_active: boolean
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id: string
          id?: string
          invite_code: string
          is_active?: boolean
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string
          id?: string
          invite_code?: string
          is_active?: boolean
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["clerk_user_id"]
          },
          {
            foreignKeyName: "event_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_members: {
        Row: {
          clerk_user_id: string
          event_id: string
          id: string
          joined_at: string
          role: string
        }
        Insert: {
          clerk_user_id: string
          event_id: string
          id?: string
          joined_at?: string
          role?: string
        }
        Update: {
          clerk_user_id?: string
          event_id?: string
          id?: string
          joined_at?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_members_clerk_user_id_fkey"
            columns: ["clerk_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["clerk_user_id"]
          },
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          location: string | null
          owner_id: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          owner_id: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          owner_id?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["clerk_user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          clerk_user_id: string
          created_at: string
          first_name: string | null
          id: string
          image_url: string | null
          last_name: string | null
          updated_at: string
        }
        Insert: {
          clerk_user_id: string
          created_at?: string
          first_name?: string | null
          id?: string
          image_url?: string | null
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          clerk_user_id?: string
          created_at?: string
          first_name?: string | null
          id?: string
          image_url?: string | null
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      template_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          position: number
          quantity: string | null
          section_id: string | null
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          position?: number
          quantity?: string | null
          section_id?: string | null
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          position?: number
          quantity?: string | null
          section_id?: string | null
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "template_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_sections: {
        Row: {
          created_at: string
          id: string
          position: number
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
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
};
