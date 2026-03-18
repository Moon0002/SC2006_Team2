-- EconoSG Supabase Indexes
-- Run this in Supabase SQL Editor after creating tables

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_home_postal ON public.profiles(home_postal);

-- SingStat item prices indexes for fast search
CREATE INDEX IF NOT EXISTS idx_singstat_data_category_name ON public.singstat_data(category_name);

-- Full-text search index for item names (for fuzzy search)
CREATE INDEX IF NOT EXISTS idx_singstat_data_series_search ON public.singstat_data
    USING gin(to_tsvector('english', data_series));

-- Index for price-based queries
CREATE INDEX IF NOT EXISTS idx_singstat_data_price_2026_jan ON public.singstat_data(price_2026_jan);
