-- Convert duration_days from days to hours
-- Existing values (in days) get multiplied by 24 to become hours
-- Column name stays duration_days for backwards compat but now stores hours
-- Default changes from 1 (day) to 24 (hours = 1 day)
UPDATE public.todos SET duration_days = duration_days * 24 WHERE duration_days IS NOT NULL;
ALTER TABLE public.todos ALTER COLUMN duration_days SET DEFAULT 24;
