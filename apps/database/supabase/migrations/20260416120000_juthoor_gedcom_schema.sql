-- ============================================================================
-- Juthoor (جذور) — GEDCOM 7-Aligned Database Schema
-- ============================================================================
-- Aligns with FamilySearch GEDCOM 7.0.18 record types:
--   INDI → persons + person_names + person_events
--   FAM  → families + family_children + family_events
--   PLAC → places (bilingual, with coordinates)
--   SOUR → sources (Phase 2)
--   OBJE → media (Phase 2)
--
-- Reference: https://gedcom.io/specifications/FamilySearchGEDCOMv7.html
-- Reference: https://github.com/jaklithn/GedcomParser (C# entities)
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";  -- fuzzy text search

-- ============================================================================
-- ENUMS (GEDCOM enumeration values)
-- ============================================================================

-- GEDCOM g7:enumset-SEX
CREATE TYPE public.gender_type AS ENUM ('M', 'F', 'X', 'U');

-- GEDCOM individual event tags (g7:BIRT, g7:DEAT, etc.)
CREATE TYPE public.event_type AS ENUM (
  'BIRT',  -- Birth
  'DEAT',  -- Death
  'BURI',  -- Burial
  'BAPM',  -- Baptism
  'CHR',   -- Christening
  'EMIG',  -- Emigration (critical for Palestinians)
  'IMMI',  -- Immigration
  'NATU',  -- Naturalization
  'CENS',  -- Census
  'RESI',  -- Residence
  'EVEN',  -- Generic event
  -- Family events (GEDCOM FAM events)
  'MARR',  -- Marriage
  'DIV',   -- Divorce
  'ANUL',  -- Annulment
  'ENGA',  -- Engagement
  'MARS',  -- Marriage Settlement
  'MARL',  -- Marriage License
  'MARB',  -- Marriage Bann
  'MARC',  -- Marriage Contract
  'DIVF',  -- Divorce Filed
  'SEPA'   -- Separation
);

-- GEDCOM g7:enumset-NAME-TYPE
CREATE TYPE public.name_type AS ENUM (
  'birth',       -- birth name
  'married',     -- married name
  'immigrant',   -- name taken at immigration
  'aka',         -- also known as
  'professional',-- professional name
  'maiden'       -- maiden name (FRS requirement)
);

-- GEDCOM pedigree type (g7:PEDI)
CREATE TYPE public.pedigree_type AS ENUM (
  'birth',    -- biological
  'adopted',  -- adopted
  'foster',   -- foster
  'sealing',  -- LDS sealing (GEDCOM compat)
  'other'
);

-- Match status for Fellegi-Sunter engine
CREATE TYPE public.match_status AS ENUM (
  'pending',
  'auto_merged',
  'admin_approved',
  'admin_rejected',
  'deferred'
);

-- Tree access role
CREATE TYPE public.tree_role AS ENUM (
  'owner',
  'collaborator',
  'read_only'
);

-- ============================================================================
-- PLACES (GEDCOM PLACE_STRUCTURE)
-- ============================================================================
-- Maps to: GEDCOM PLAC with FORM, LANG, TRAN, MAP (LATI + LONG)
-- Replaces the old "villages" concept with a full GEDCOM-aligned place system
-- Covers: 530 depopulated Palestinian villages + any other places

CREATE TABLE public.places (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  -- Bilingual names (GEDCOM PLAC + TRAN)
  name_ar text NOT NULL,              -- Arabic canonical name
  name_en text,                        -- English translation (GEDCOM TRAN with LANG=en)
  -- GEDCOM PLAC hierarchy: "Village, District, Country"
  place_type text DEFAULT 'village',   -- village, city, district, country, camp, diaspora_city
  district_ar text,                    -- District name Arabic
  district_en text,                    -- District name English
  country text DEFAULT 'فلسطين',       -- Country
  -- GEDCOM MAP (LATI + LONG)
  latitude double precision,
  longitude double precision,
  -- Palestinian-specific
  depopulated_year smallint,           -- Year village was depopulated (1948, 1967, etc.)
  is_depopulated boolean DEFAULT false,
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_places_name_ar ON public.places USING gin (name_ar gin_trgm_ops);
CREATE INDEX idx_places_name_en ON public.places USING gin (name_en gin_trgm_ops);
CREATE INDEX idx_places_type ON public.places (place_type);
CREATE INDEX idx_places_coords ON public.places (latitude, longitude) WHERE latitude IS NOT NULL;

COMMENT ON TABLE public.places IS 'GEDCOM PLACE_STRUCTURE — bilingual places with coordinates. Includes 530 depopulated Palestinian villages.';

-- ============================================================================
-- TREES (container for family trees)
-- ============================================================================

CREATE TABLE public.trees (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public boolean DEFAULT false,
  -- GEDCOM import tracking
  gedcom_filename text,                -- original .ged file if imported
  gedcom_imported_at timestamptz,
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trees_owner ON public.trees (owner_id);

COMMENT ON TABLE public.trees IS 'Family tree container. Each user can own multiple trees. The "Master Tree" is the merged view of all public trees.';

-- ============================================================================
-- TREE MEMBERS (access control)
-- ============================================================================

CREATE TABLE public.tree_members (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role tree_role NOT NULL DEFAULT 'read_only',
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (tree_id, user_id)
);

CREATE INDEX idx_tree_members_tree ON public.tree_members (tree_id);
CREATE INDEX idx_tree_members_user ON public.tree_members (user_id);

-- ============================================================================
-- PERSONS (GEDCOM INDIVIDUAL_RECORD / INDI)
-- ============================================================================
-- Maps to: GedcomParser Person entity
-- Core person record. Names are in a separate table (GEDCOM supports multiple names per person).
-- Events (birth, death, etc.) are in a separate events table (GEDCOM pattern).

CREATE TABLE public.persons (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  -- GEDCOM g7:SEX
  gender gender_type NOT NULL DEFAULT 'U',
  -- Quick-access denormalized fields (primary name cached here for performance)
  display_name_ar text,                -- cached: "محمد الخطيب" (for UI/search)
  display_name_en text,                -- cached: "Mohammed Al-Khatib"
  -- GEDCOM XREF tracking (for import/export)
  gedcom_xref text,                    -- e.g., "@I1@" — preserved for round-trip
  -- Metadata
  is_living boolean DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_persons_tree ON public.persons (tree_id);
CREATE INDEX idx_persons_display_ar ON public.persons USING gin (display_name_ar gin_trgm_ops);
CREATE INDEX idx_persons_display_en ON public.persons USING gin (display_name_en gin_trgm_ops);
CREATE INDEX idx_persons_gedcom_xref ON public.persons (tree_id, gedcom_xref) WHERE gedcom_xref IS NOT NULL;

COMMENT ON TABLE public.persons IS 'GEDCOM INDIVIDUAL_RECORD (INDI). Core person. Names and events are in separate tables for GEDCOM compliance.';

-- ============================================================================
-- PERSON NAMES (GEDCOM PERSONAL_NAME_STRUCTURE)
-- ============================================================================
-- Maps to: GEDCOM NAME with PERSONAL_NAME_PIECES + TRAN
-- A person can have multiple names (birth, married, aka, immigrant, maiden)
-- Each name has Arabic + English pieces

CREATE TABLE public.person_names (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  -- GEDCOM g7:NAME-TYPE
  name_type name_type NOT NULL DEFAULT 'birth',
  is_primary boolean DEFAULT false,    -- which name to show by default
  -- Language
  lang text NOT NULL DEFAULT 'ar',     -- 'ar' or 'en' (GEDCOM LANG tag)
  -- GEDCOM PERSONAL_NAME_PIECES
  prefix text,                         -- NPFX: "الشيخ", "Dr.", "أبو"
  given_name text,                     -- GIVN: "محمد", "Mohammed"
  nickname text,                       -- NICK: "أبو أحمد"
  surname_prefix text,                 -- SPFX: "ال" (the "Al" in Al-Khatib)
  surname text,                        -- SURN: "خطيب", "Khatib"
  suffix text,                         -- NSFX: "Jr.", "الأول"
  -- GEDCOM full name string: "محمد /الخطيب/" (surname in slashes)
  gedcom_name text,                    -- full GEDCOM-formatted name for export
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_person_names_person ON public.person_names (person_id);
CREATE INDEX idx_person_names_given ON public.person_names USING gin (given_name gin_trgm_ops);
CREATE INDEX idx_person_names_surname ON public.person_names USING gin (surname gin_trgm_ops);
CREATE INDEX idx_person_names_primary ON public.person_names (person_id, is_primary) WHERE is_primary = true;

COMMENT ON TABLE public.person_names IS 'GEDCOM PERSONAL_NAME_STRUCTURE. Multiple names per person, each in AR or EN, with name pieces (GIVN, SURN, etc.).';

-- ============================================================================
-- FAMILIES (GEDCOM FAMILY_RECORD / FAM)
-- ============================================================================
-- Maps to: GedcomParser SpouseRelation + GEDCOM FAM
-- Links two partners. Children are in family_children join table.
-- Gender-neutral partner1/partner2 per GEDCOM 7 recommendation.

CREATE TABLE public.families (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  -- GEDCOM HUSB + WIFE (gender-neutral naming per GEDCOM 7 note)
  partner1_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  partner2_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  -- GEDCOM XREF tracking
  gedcom_xref text,                    -- e.g., "@F1@"
  -- Metadata
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_families_tree ON public.families (tree_id);
CREATE INDEX idx_families_partner1 ON public.families (partner1_id);
CREATE INDEX idx_families_partner2 ON public.families (partner2_id);
CREATE INDEX idx_families_gedcom_xref ON public.families (tree_id, gedcom_xref) WHERE gedcom_xref IS NOT NULL;

COMMENT ON TABLE public.families IS 'GEDCOM FAMILY_RECORD (FAM). Links two partners. Marriage/divorce are events. Children via family_children.';

-- ============================================================================
-- FAMILY CHILDREN (GEDCOM FAM.CHIL pointers)
-- ============================================================================
-- Maps to: GedcomParser ChildRelation
-- Links a child person to a family (FAM) with pedigree type (birth/adopted/foster)

CREATE TABLE public.family_children (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  -- GEDCOM g7:PEDI (pedigree)
  pedigree pedigree_type NOT NULL DEFAULT 'birth',
  -- Birth order (GEDCOM: CHIL order is chronological)
  birth_order smallint,
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, child_id)
);

CREATE INDEX idx_family_children_family ON public.family_children (family_id);
CREATE INDEX idx_family_children_child ON public.family_children (child_id);

COMMENT ON TABLE public.family_children IS 'GEDCOM FAM.CHIL. Links children to families with pedigree type (birth, adopted, foster).';

-- ============================================================================
-- EVENTS (GEDCOM EVENT_DETAIL — unified for INDI + FAM events)
-- ============================================================================
-- Maps to: GedcomParser DatePlace + GEDCOM INDIVIDUAL_EVENT_STRUCTURE + FAMILY_EVENT_STRUCTURE
-- Generic event table covering all GEDCOM event types.
-- An event belongs to either a person OR a family (not both).

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  -- Polymorphic owner: person event or family event
  person_id uuid REFERENCES public.persons(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  -- GEDCOM event tag
  event_type event_type NOT NULL,
  -- GEDCOM DATE (flexible: year, year-month, full date, ranges, approximate)
  date_value text,                     -- raw GEDCOM date string for round-trip
  date_sort integer,                   -- YYYYMMDD integer for sorting/queries
  date_year smallint,                  -- extracted year for quick filters
  -- GEDCOM PLAC
  place_id uuid REFERENCES public.places(id) ON DELETE SET NULL,
  place_name text,                     -- free-text place (when no matching places row)
  -- GEDCOM EVENT_DETAIL extras
  description text,                    -- GEDCOM TYPE substructure text
  cause text,                          -- GEDCOM CAUS (cause of death, etc.)
  notes text,
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Constraint: must belong to person XOR family
  CONSTRAINT event_owner_check CHECK (
    (person_id IS NOT NULL AND family_id IS NULL) OR
    (person_id IS NULL AND family_id IS NOT NULL)
  )
);

CREATE INDEX idx_events_person ON public.events (person_id) WHERE person_id IS NOT NULL;
CREATE INDEX idx_events_family ON public.events (family_id) WHERE family_id IS NOT NULL;
CREATE INDEX idx_events_type ON public.events (event_type);
CREATE INDEX idx_events_date_sort ON public.events (date_sort) WHERE date_sort IS NOT NULL;
CREATE INDEX idx_events_place ON public.events (place_id) WHERE place_id IS NOT NULL;

COMMENT ON TABLE public.events IS 'GEDCOM EVENT_DETAIL. Unified events for persons (BIRT/DEAT/EMIG) and families (MARR/DIV). Each has date + place.';

-- ============================================================================
-- MATCHES (Fellegi-Sunter matching engine results)
-- ============================================================================
-- Juthoor-specific: not from GEDCOM but essential for the Family Finder feature

CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  person_a_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  person_b_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  -- Fellegi-Sunter score (FRS: 25 weighted parameters, max ~450+)
  confidence_score integer NOT NULL DEFAULT 0,
  -- Status
  status match_status NOT NULL DEFAULT 'pending',
  -- Who found/reviewed
  found_by text DEFAULT 'system',      -- 'system' (batch) or user_id
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  -- Match detail breakdown (JSONB for the 25 weight parameters)
  score_breakdown jsonb,
  -- Metadata
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Prevent duplicate match pairs
  CONSTRAINT unique_match_pair CHECK (person_a_id < person_b_id),
  UNIQUE (person_a_id, person_b_id)
);

CREATE INDEX idx_matches_person_a ON public.matches (person_a_id);
CREATE INDEX idx_matches_person_b ON public.matches (person_b_id);
CREATE INDEX idx_matches_status ON public.matches (status);
CREATE INDEX idx_matches_score ON public.matches (confidence_score DESC);

COMMENT ON TABLE public.matches IS 'Fellegi-Sunter matching engine results. Score >= 450 auto-merges, < 450 goes to admin review.';

-- ============================================================================
-- PROFILES (extends Supabase Auth with Juthoor-specific fields)
-- ============================================================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  display_name_ar text,
  avatar_url text,
  preferred_language text DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'en')),
  is_admin boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Extends Supabase Auth users with Juthoor profile data.';

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'full_name', new.email));
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- AUTO-UPDATE updated_at (trigger)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_places_updated_at BEFORE UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_trees_updated_at BEFORE UPDATE ON public.trees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_persons_updated_at BEFORE UPDATE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_families_updated_at BEFORE UPDATE ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
