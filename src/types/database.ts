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
  section_id: string;
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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'id'>>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Event, 'id'>>;
      };
      event_members: {
        Row: EventMember;
        Insert: Omit<EventMember, 'id' | 'joined_at'> & {
          id?: string;
          joined_at?: string;
        };
        Update: Partial<Omit<EventMember, 'id'>>;
      };
      event_invites: {
        Row: EventInvite;
        Insert: Omit<EventInvite, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<EventInvite, 'id'>>;
      };
      checklist_sections: {
        Row: ChecklistSection;
        Insert: Omit<ChecklistSection, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ChecklistSection, 'id'>>;
      };
      checklist_items: {
        Row: ChecklistItem;
        Insert: Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ChecklistItem, 'id'>>;
      };
      checklist_templates: {
        Row: ChecklistTemplate;
        Insert: Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ChecklistTemplate, 'id'>>;
      };
      template_sections: {
        Row: TemplateSection;
        Insert: Omit<TemplateSection, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<TemplateSection, 'id'>>;
      };
      template_items: {
        Row: TemplateItem;
        Insert: Omit<TemplateItem, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<TemplateItem, 'id'>>;
      };
      activity_events: {
        Row: ActivityEvent;
        Insert: Omit<ActivityEvent, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ActivityEvent, 'id'>>;
      };
    };
  };
}
