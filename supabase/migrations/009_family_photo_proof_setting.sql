-- Add family-level require_photo_proof toggle (defaults to false)
ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS require_photo_proof BOOLEAN;

ALTER TABLE public.families
  ALTER COLUMN require_photo_proof SET DEFAULT FALSE;

UPDATE public.families
  SET require_photo_proof = FALSE
  WHERE require_photo_proof IS NULL;

ALTER TABLE public.families
  ALTER COLUMN require_photo_proof SET NOT NULL;

