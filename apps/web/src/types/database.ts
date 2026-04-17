/**
 * Juthoor Database Types — GEDCOM 7 Aligned
 * Generated from Supabase schema (2026-04-16)
 *
 * To regenerate:
 *   npx supabase login
 *   npx supabase gen types typescript --project-id nlufpicjdeeqcgepewdg > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================================================
// Enums
// ============================================================================

/** GEDCOM g7:enumset-SEX */
export type GenderType = 'M' | 'F' | 'X' | 'U';

/** GEDCOM event tags */
export type EventType =
  | 'BIRT' | 'DEAT' | 'BURI' | 'BAPM' | 'CHR'
  | 'EMIG' | 'IMMI' | 'NATU' | 'CENS' | 'RESI' | 'EVEN'
  | 'MARR' | 'DIV' | 'ANUL' | 'ENGA' | 'MARS' | 'MARL'
  | 'MARB' | 'MARC' | 'DIVF' | 'SEPA';

/** GEDCOM g7:enumset-NAME-TYPE */
export type NameType = 'birth' | 'married' | 'immigrant' | 'aka' | 'professional' | 'maiden';

/** GEDCOM pedigree type (g7:PEDI) */
export type PedigreeType = 'birth' | 'adopted' | 'foster' | 'sealing' | 'other';

/** Fellegi-Sunter match status */
export type MatchStatus = 'pending' | 'auto_merged' | 'admin_approved' | 'admin_rejected' | 'deferred';

/** Tree access role */
export type TreeRole = 'owner' | 'collaborator' | 'read_only';

// ============================================================================
// Table Row Types
// ============================================================================

/** GEDCOM PLACE_STRUCTURE — bilingual places with coordinates */
export interface Place {
  readonly id: string;
  readonly name_ar: string;
  readonly name_en: string | null;
  readonly place_type: string;
  readonly district_ar: string | null;
  readonly district_en: string | null;
  readonly country: string;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly depopulated_year: number | null;
  readonly is_depopulated: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Family tree container */
export interface Tree {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly owner_id: string;
  readonly is_public: boolean;
  readonly gedcom_filename: string | null;
  readonly gedcom_imported_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Tree access control */
export interface TreeMember {
  readonly id: string;
  readonly tree_id: string;
  readonly user_id: string;
  readonly role: TreeRole;
  readonly invited_at: string;
  readonly accepted_at: string | null;
}

/** GEDCOM INDIVIDUAL_RECORD (INDI) */
export interface Person {
  readonly id: string;
  readonly tree_id: string;
  readonly gender: GenderType;
  readonly display_name_ar: string | null;
  readonly display_name_en: string | null;
  readonly gedcom_xref: string | null;
  readonly is_living: boolean;
  readonly notes: string | null;
  readonly created_by: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** GEDCOM PERSONAL_NAME_STRUCTURE */
export interface PersonName {
  readonly id: string;
  readonly person_id: string;
  readonly name_type: NameType;
  readonly is_primary: boolean;
  readonly lang: string;
  readonly prefix: string | null;
  readonly given_name: string | null;
  readonly nickname: string | null;
  readonly surname_prefix: string | null;
  readonly surname: string | null;
  readonly suffix: string | null;
  readonly gedcom_name: string | null;
  readonly created_at: string;
}

/** GEDCOM FAMILY_RECORD (FAM) */
export interface Family {
  readonly id: string;
  readonly tree_id: string;
  readonly partner1_id: string | null;
  readonly partner2_id: string | null;
  readonly gedcom_xref: string | null;
  readonly notes: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** GEDCOM FAM.CHIL — child-to-family link */
export interface FamilyChild {
  readonly id: string;
  readonly family_id: string;
  readonly child_id: string;
  readonly pedigree: PedigreeType;
  readonly birth_order: number | null;
  readonly created_at: string;
}

/** GEDCOM EVENT_DETAIL — unified person + family events */
export interface Event {
  readonly id: string;
  readonly person_id: string | null;
  readonly family_id: string | null;
  readonly event_type: EventType;
  readonly date_value: string | null;
  readonly date_sort: number | null;
  readonly date_year: number | null;
  readonly place_id: string | null;
  readonly place_name: string | null;
  readonly description: string | null;
  readonly cause: string | null;
  readonly notes: string | null;
  readonly created_at: string;
}

/** Fellegi-Sunter matching results */
export interface Match {
  readonly id: string;
  readonly person_a_id: string;
  readonly person_b_id: string;
  readonly confidence_score: number;
  readonly status: MatchStatus;
  readonly found_by: string;
  readonly reviewed_by: string | null;
  readonly reviewed_at: string | null;
  readonly score_breakdown: Json | null;
  readonly notes: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** User profile (extends Supabase Auth) */
export interface Profile {
  readonly id: string;
  readonly display_name: string | null;
  readonly display_name_ar: string | null;
  readonly avatar_url: string | null;
  readonly preferred_language: 'ar' | 'en';
  readonly is_admin: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

// ============================================================================
// Insert Types (for creating new rows — omit server-generated fields)
// ============================================================================

export type PlaceInsert = Omit<Place, 'id' | 'created_at' | 'updated_at'> & {
  readonly id?: string;
};

export type TreeInsert = Omit<Tree, 'id' | 'created_at' | 'updated_at' | 'is_public'> & {
  readonly id?: string;
  readonly is_public?: boolean;
};

export type PersonInsert = Omit<Person, 'id' | 'created_at' | 'updated_at' | 'gender' | 'is_living'> & {
  readonly id?: string;
  readonly gender?: GenderType;
  readonly is_living?: boolean;
};

export type PersonNameInsert = Omit<PersonName, 'id' | 'created_at' | 'is_primary' | 'name_type' | 'lang'> & {
  readonly id?: string;
  readonly is_primary?: boolean;
  readonly name_type?: NameType;
  readonly lang?: string;
};

export type FamilyInsert = Omit<Family, 'id' | 'created_at' | 'updated_at'> & {
  readonly id?: string;
};

export type FamilyChildInsert = Omit<FamilyChild, 'id' | 'created_at' | 'pedigree'> & {
  readonly id?: string;
  readonly pedigree?: PedigreeType;
};

export type EventInsert = Omit<Event, 'id' | 'created_at'> & {
  readonly id?: string;
};

export type MatchInsert = Omit<Match, 'id' | 'created_at' | 'updated_at' | 'status' | 'found_by'> & {
  readonly id?: string;
  readonly status?: MatchStatus;
  readonly found_by?: string;
};

// ============================================================================
// Database Schema Type (Supabase-compatible)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      places: {
        Row: Place;
        Insert: PlaceInsert;
        Update: Partial<PlaceInsert>;
      };
      trees: {
        Row: Tree;
        Insert: TreeInsert;
        Update: Partial<TreeInsert>;
      };
      tree_members: {
        Row: TreeMember;
        Insert: Omit<TreeMember, 'id' | 'invited_at'> & { id?: string; invited_at?: string };
        Update: Partial<TreeMember>;
      };
      persons: {
        Row: Person;
        Insert: PersonInsert;
        Update: Partial<PersonInsert>;
      };
      person_names: {
        Row: PersonName;
        Insert: PersonNameInsert;
        Update: Partial<PersonNameInsert>;
      };
      families: {
        Row: Family;
        Insert: FamilyInsert;
        Update: Partial<FamilyInsert>;
      };
      family_children: {
        Row: FamilyChild;
        Insert: FamilyChildInsert;
        Update: Partial<FamilyChildInsert>;
      };
      events: {
        Row: Event;
        Insert: EventInsert;
        Update: Partial<EventInsert>;
      };
      matches: {
        Row: Match;
        Insert: MatchInsert;
        Update: Partial<MatchInsert>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at' | 'preferred_language' | 'is_admin'> & {
          preferred_language?: 'ar' | 'en';
          is_admin?: boolean;
        };
        Update: Partial<Profile>;
      };
    };
    Enums: {
      gender_type: GenderType;
      event_type: EventType;
      name_type: NameType;
      pedigree_type: PedigreeType;
      match_status: MatchStatus;
      tree_role: TreeRole;
    };
  };
}
