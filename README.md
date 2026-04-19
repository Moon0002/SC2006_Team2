# PriceWatch

Calculate the True Cost of your grocery trips by comparing prices, transit fares, and your time value. Find out if traveling to a cheaper supermarket is worth the transport cost and time.
(Note: Just in Case the SQL files do not work/ if the user do not use supabase, we added csv files for the user to reference)

Youtube Link: https://youtu.be/5xPnJfzf8N0

## Requirements

- Node.js 18+ and npm
- Supabase account and project
- Google Maps API key (browser + optional server key)
- Data.gov.sg API key (optional; only if you use CPI sync against their API)

## How to Launch

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_server_key

# Optional: Data.gov.sg API (CPI sync) <-- This is optional because you can manually sync the CPI Data from gov.sg>
DATA_GOV_SG_API_KEY=your_data_gov_sg_api_key
```

**Where to get credentials**

- **Supabase**: Project Settings → API (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- **Google Maps**: Google Cloud Console → enable Maps JavaScript API, Geocoding API, and Places API (or the subset your routes use); restrict keys appropriately.
- **Data.gov.sg**: Optional; public datasets may work without a key depending on usage.
- **Supavase Settings**: To enable email authentication, Authentication  →  Sign In / Providers (enable "Allow New Users to sign up" and "Confirm email" in the User Signups Section, and also enable "email" on the providers section"  

### 3. Set Up the Supabase Database

In the Supabase SQL editor, run scripts **in this order**:

1. **`supabase/tables.sql`** — Creates `profiles`, `singstat_data`, and `cpi_series_map`.  
   (If you maintain `profiles` separately, you can run **`supabase/profiles.sql`** instead for that table only, then add the other tables from `tables.sql`.)
2. **`supabase/triggers.sql`** — Creates the `auth.users` → `public.profiles` trigger for new sign-ups.
3. **`supabase/singstat_data.sql`** — Seeds item prices (needed for search and ROI).
4. **`supabase/cpi_series_map.sql`** — Seeds category → DataSeries mapping (used by CPI sync).
5. **Remember to Disable RLS for Convinience (Note that this is only for Convinience, and should never be so in actual development (we did not force any RLS because we do not know how the TA will test our codes))**
### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Keep CPI data up to date (`cpi-sync`)

SingStat rows in `public.singstat_data` include a `cpi_index` that can be refreshed from Data.gov.sg by calling the CPI sync API route.

1. Ensure **`DATA_GOV_SG_API_KEY`** is set if your Data.gov.sg usage requires it (see step 2).
2. With the app running, send a **POST** request to **`/api/cpi-sync`** (same origin as the app).

Example with the dev server on port 3000:

```bash
curl -X POST http://localhost:3000/api/cpi-sync
```

The response JSON reports counts, warnings, and any errors (for example unmatched categories). Run this periodically (for example after SingStat publishes new CPI figures) so ROI and pricing stay aligned with the latest indices.
