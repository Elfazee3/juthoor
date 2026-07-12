
-- Person attachments: photos + documents tied to a person, gated by tree access.
DO $$ BEGIN
  CREATE TYPE public.attachment_kind AS ENUM ('photo','document');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.attachment_tag AS ENUM (
    'portrait','id_card','passport','birth_cert','death_cert',
    'marriage_cert','land_deed','family_card','letter','old_photo','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.person_attachments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  kind          public.attachment_kind NOT NULL,
  tag           public.attachment_tag NOT NULL DEFAULT 'other',
  storage_path  text NOT NULL,
  mime_type     text NOT NULL,
  size_bytes    integer NOT NULL,
  caption_ar    text,
  caption_en    text,
  year          smallint,
  uploaded_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_person_attachments_person ON public.person_attachments (person_id, kind, created_at DESC);

-- One primary photo per person (referenced from persons table)
ALTER TABLE public.persons
  ADD COLUMN IF NOT EXISTS primary_photo_id uuid
    REFERENCES public.person_attachments(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.person_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pa_select ON public.person_attachments;
CREATE POLICY pa_select ON public.person_attachments FOR SELECT
  USING (
    public.can_access_tree((SELECT tree_id FROM public.persons WHERE id = person_id))
  );

DROP POLICY IF EXISTS pa_insert ON public.person_attachments;
CREATE POLICY pa_insert ON public.person_attachments FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1
      FROM public.persons p
      JOIN public.trees t ON t.id = p.tree_id
      WHERE p.id = person_id
        AND (
          t.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tree_members tm
            WHERE tm.tree_id = t.id
              AND tm.user_id = auth.uid()
              AND tm.status = 'approved'
              AND tm.role IN ('owner','collaborator')
          )
        )
    )
  );

DROP POLICY IF EXISTS pa_delete ON public.person_attachments;
CREATE POLICY pa_delete ON public.person_attachments FOR DELETE USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.persons p JOIN public.trees t ON t.id = p.tree_id
    WHERE p.id = person_id AND t.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS pa_update ON public.person_attachments;
CREATE POLICY pa_update ON public.person_attachments FOR UPDATE USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.persons p JOIN public.trees t ON t.id = p.tree_id
    WHERE p.id = person_id AND t.owner_id = auth.uid()
  )
);

COMMENT ON TABLE public.person_attachments IS
  'Photos + supporting documents per person. RLS: read = anyone with tree access; write = owner/collaborator.';
