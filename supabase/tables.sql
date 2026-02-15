-- EconoSG Supabase Tables
-- Run this in Supabase SQL Editor to create tables

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles table: Stores user profile data linked to Supabase Auth
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

-- CPI Cache table: Stores cached CPI data from Data.gov.sg
-- Note: Data.gov.sg CPI dataset (d_bdaff844e3ef89d39fceb962ff8f0791) provides index values, not direct prices
-- The "Data Series" column contains item names, and monthly columns contain CPI index values (2024 base year)
CREATE TABLE IF NOT EXISTS public.cpi_cache (
    item_name text PRIMARY KEY,
    item_id text UNIQUE,
    cpi_index numeric(10,4),
    estimated_price numeric(10,2),
    data_month text,
    category text,
    is_price_estimated boolean DEFAULT true,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    data_source text DEFAULT 'data.gov.sg' NOT NULL,
    raw_data jsonb,
    CONSTRAINT estimated_price_positive CHECK (estimated_price IS NULL OR estimated_price >= 0),
    CONSTRAINT cpi_index_positive CHECK (cpi_index IS NULL OR cpi_index >= 0),
    CONSTRAINT data_month_format CHECK (data_month IS NULL OR data_month ~ '^\d{4}-\d{2}$')
);
