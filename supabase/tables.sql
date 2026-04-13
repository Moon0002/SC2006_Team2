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

-- SingStat Item Prices table: Source of truth for item prices
-- Seed using `supabase/singstat_data.sql`
CREATE TABLE IF NOT EXISTS public.singstat_data (
    item_id text PRIMARY KEY,
    data_series text NOT NULL,
    category_name text,
    price_2026_jan numeric(10,2) NOT NULL,
    cpi_index numeric(10,3),
    CONSTRAINT price_2026_jan_positive CHECK (price_2026_jan >= 0)
);

-- CPI category-to-series mapping table:
-- lets us map singstat_data.category_name -> Data.gov.sg DataSeries reliably.
CREATE TABLE IF NOT EXISTS public.cpi_series_map (
    category_name text PRIMARY KEY,
    data_series text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
