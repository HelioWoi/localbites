BEGIN;

CREATE TABLE IF NOT EXISTS public.photo_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  restaurant_id uuid NULL,
  item_id uuid NULL,
  original_image_url text NOT NULL,
  enhanced_image_url text NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text NULL,
  request_id text NULL,
  credits_used integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz NULL,
  completed_at timestamptz NULL,
  CONSTRAINT photo_jobs_status_check CHECK (status IN ('pending', 'processing', 'done', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_photo_jobs_status ON public.photo_jobs(status);
CREATE INDEX IF NOT EXISTS idx_photo_jobs_user_id ON public.photo_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_jobs_item_id ON public.photo_jobs(item_id);

ALTER TABLE public.photo_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own photo jobs" ON public.photo_jobs;
CREATE POLICY "Users can insert own photo jobs"
  ON public.photo_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own photo jobs" ON public.photo_jobs;
CREATE POLICY "Users can read own photo jobs"
  ON public.photo_jobs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage photo jobs" ON public.photo_jobs;
CREATE POLICY "Service role can manage photo jobs"
  ON public.photo_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.photo_jobs FROM PUBLIC;
REVOKE ALL ON TABLE public.photo_jobs FROM anon;

GRANT SELECT, INSERT ON public.photo_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_jobs TO service_role;

DO $$
BEGIN
  IF to_regprocedure('public.update_updated_at_column()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.update_updated_at_column()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $body$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $body$;
    $fn$;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS update_photo_jobs_updated_at ON public.photo_jobs;
CREATE TRIGGER update_photo_jobs_updated_at
  BEFORE UPDATE ON public.photo_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
