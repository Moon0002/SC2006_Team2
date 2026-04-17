-- CPI series map seed
-- Run this after `tables.sql` and `singstat_data.sql`.
-- It bootstraps direct category_name -> DataSeries mappings.
-- You can then manually refine rows where Data.gov.sg uses different wording.

CREATE TABLE IF NOT EXISTS public.cpi_series_map (
  category_name text PRIMARY KEY,
  data_series text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO public.cpi_series_map (category_name, data_series, is_active)
SELECT DISTINCT category_name, category_name, true
FROM public.singstat_data
WHERE category_name IS NOT NULL
ON CONFLICT (category_name) DO NOTHING;
