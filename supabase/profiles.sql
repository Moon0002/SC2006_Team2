-- public.profiles — user profile linked to Supabase Auth

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    hourly_rate numeric(10,2) DEFAULT 10.00 NOT NULL,
    home_postal text,
    saved_basket jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hourly_rate_positive CHECK (hourly_rate >= 0),
    CONSTRAINT postal_code_format CHECK (home_postal IS NULL OR home_postal ~ '^[0-9]{6}$')
);
