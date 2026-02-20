-- Add duration_days column to todos (default 1 day)
-- Also add due_date if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'todos' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE public.todos ADD COLUMN due_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'todos' AND column_name = 'duration_days'
  ) THEN
    ALTER TABLE public.todos ADD COLUMN duration_days integer default 1 not null;
  END IF;
END $$;
