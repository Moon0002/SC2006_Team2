# EconoSG

Calculate the True Cost of your grocery trips by comparing prices, transit fares, and your time value. Find out if traveling to a cheaper supermarket is worth the transport cost and time.

## Requirements

- Node.js 18+ and npm
- Supabase account and project
- Google Maps API key
- Data.gov.sg API key

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

# Optional: Data.gov.sg API (only needed if you re-enable CPI sync)
DATA_GOV_SG_API_KEY=your_data_gov_sg_api_key


### API Key Setup
- **Supabase**: Get credentials from your Supabase project settings
- **Google Maps**: Create a project in Google Cloud Console and enable Geocoding, Maps JavaScript API, and Places API
- **Data.gov.sg**: for fetching CPI data (can use without API key for public data)

### 3. Set Up Database
Run the SQL schema in your Supabase SQL editor to create the required tables (`profiles`, `singstat_data`).

### 4. Seed CPI Data (Mandatory)
The app uses item prices and `cpi_index` from `public.singstat_data` (seeded from `supabase/singstat_data.sql`).

The CPI values inside `supabase/singstat_data.sql` come from the government Data.gov.sg / SingStat CPI dataset.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
