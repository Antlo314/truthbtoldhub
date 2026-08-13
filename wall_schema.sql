-- The Mark — yearly community wall.
-- One row per (email, calendar year). Hidden cells stay in the table
-- so the unique lock still holds; they render as plaster.

CREATE TABLE IF NOT EXISTS public.wall_marks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year         INT NOT NULL,
    face         TEXT NOT NULL CHECK (face IN ('w', 's', 'n')),
    col          INT NOT NULL,
    row          INT NOT NULL,
    author_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email_norm   TEXT NOT NULL,
    png          TEXT NOT NULL,
    caption      TEXT NOT NULL DEFAULT '',
    gold_frame   BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_at    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (email_norm, year),
    UNIQUE (year, face, col, row)
);

CREATE INDEX IF NOT EXISTS wall_marks_year_idx ON public.wall_marks (year) WHERE hidden_at IS NULL;

ALTER TABLE public.wall_marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wall_marks_public_read ON public.wall_marks;
CREATE POLICY wall_marks_public_read ON public.wall_marks
    FOR SELECT USING (hidden_at IS NULL);

-- Writes go through /api/wall (service role). No direct client inserts.
