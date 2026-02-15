-- EconoSG Supabase Indexes
-- Run this in Supabase SQL Editor after creating tables

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_home_postal ON public.profiles(home_postal);

-- CPI Cache indexes for fast search
CREATE INDEX IF NOT EXISTS idx_cpi_cache_category ON public.cpi_cache(category);
CREATE INDEX IF NOT EXISTS idx_cpi_cache_last_updated ON public.cpi_cache(last_updated);
CREATE INDEX IF NOT EXISTS idx_cpi_cache_data_month ON public.cpi_cache(data_month);

-- Full-text search index for item names (for fuzzy search)
CREATE INDEX IF NOT EXISTS idx_cpi_cache_item_name_search ON public.cpi_cache 
    USING gin(to_tsvector('english', item_name));

-- Index for price-based queries
CREATE INDEX IF NOT EXISTS idx_cpi_cache_estimated_price ON public.cpi_cache(estimated_price) 
    WHERE estimated_price IS NOT NULL;
