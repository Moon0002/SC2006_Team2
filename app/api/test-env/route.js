export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    checks: {},
    allPassed: true,
  };

  // Check Supabase URL
  results.checks.supabaseUrl = {
    present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    value: process.env.NEXT_PUBLIC_SUPABASE_URL ? '***' + process.env.NEXT_PUBLIC_SUPABASE_URL.slice(-10) : 'MISSING',
    valid: false,
  };

  // Check Supabase Anon Key
  results.checks.supabaseAnonKey = {
    present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(-10) : 'MISSING',
    valid: false,
  };

  // Check Supabase Service Role Key
  const serviceKeyValid = process.env.SUPABASE_SERVICE_ROLE_KEY && 
                          process.env.SUPABASE_SERVICE_ROLE_KEY.length > 20;
  results.checks.supabaseServiceKey = {
    present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    value: process.env.SUPABASE_SERVICE_ROLE_KEY ? '***' + process.env.SUPABASE_SERVICE_ROLE_KEY.slice(-10) : 'MISSING',
    valid: serviceKeyValid,
  };

  // Check LTA DataMall API Key
  results.checks.ltaApiKey = {
    present: !!process.env.LTA_DATAMALL_API_KEY,
    value: process.env.LTA_DATAMALL_API_KEY ? '***' + process.env.LTA_DATAMALL_API_KEY.slice(-10) : 'MISSING',
    valid: false,
  };

  // Check Google Maps API Keys
  results.checks.googleMapsPublicKey = {
    present: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    value: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? '***' + process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.slice(-10) : 'MISSING',
    valid: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    note: 'For client-side calls (with HTTP referrer restrictions)',
  };
  results.checks.googleMapsServerKey = {
    present: !!process.env.GOOGLE_MAPS_API_KEY,
    value: process.env.GOOGLE_MAPS_API_KEY ? '***' + process.env.GOOGLE_MAPS_API_KEY.slice(-10) : 'MISSING',
    valid: !!process.env.GOOGLE_MAPS_API_KEY,
    note: 'For server-side calls (NO referrer restrictions) - RECOMMENDED',
  };

  // Test Supabase Connection
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      // Use the new server client utility
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      
      // Test connection by querying a table (cpi_cache should exist)
      const { data, error } = await supabase.from('cpi_cache').select('count').limit(1);
      
      results.checks.supabaseConnection = {
        success: !error,
        error: error?.message || null,
        message: error ? `Connection failed: ${error.message}` : 'Connected successfully',
        note: error?.code === 'PGRST116' ? 'Table "cpi_cache" does not exist yet. Run the schema.sql in Supabase.' : null,
      };
      results.checks.supabaseUrl.valid = !error;
      results.checks.supabaseAnonKey.valid = !error;
    } catch (error) {
      // Fallback to format validation if import fails
      const urlValid = process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://') && 
                       process.env.NEXT_PUBLIC_SUPABASE_URL.includes('.supabase.co');
      const keyValid = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 20;
      
      results.checks.supabaseConnection = {
        success: false,
        error: error.message,
        message: 'Client utility import failed, format validation only',
      };
      results.checks.supabaseUrl.valid = urlValid;
      results.checks.supabaseAnonKey.valid = keyValid;
    }
  } else {
    results.checks.supabaseConnection = {
      success: false,
      error: 'Missing Supabase credentials',
      message: 'Cannot test connection',
    };
  }

  // Test LTA DataMall API
  if (process.env.LTA_DATAMALL_API_KEY) {
    try {
      // Trim whitespace from API key
      const apiKey = process.env.LTA_DATAMALL_API_KEY.trim();
      
      // Use Taxi-Availability endpoint for verification (as per LTA documentation)
      const response = await fetch('https://datamall2.mytransport.sg/ltaodataservice/Taxi-Availability', {
        headers: {
          'AccountKey': apiKey,
        },
      });
      
      const responseText = await response.text();
      let responseData;
      let errorMessage = null;
      
      try {
        responseData = JSON.parse(responseText);
        // Check for error messages in the response
        if (responseData.error || responseData.message) {
          errorMessage = responseData.error || responseData.message;
        }
      } catch {
        // If not JSON, use the raw text (might be HTML error page)
        errorMessage = responseText.substring(0, 200); // Limit length
        responseData = null;
      }
      
      // 401 means unauthorized - API key is invalid or missing
      if (response.status === 401) {
        results.checks.ltaConnection = {
          success: false,
          status: response.status,
          message: 'Unauthorized - API key invalid or incorrect',
          error: errorMessage || 'Check your LTA_DATAMALL_API_KEY in .env',
          debug: {
            keyLength: apiKey.length,
            keyPrefix: apiKey.substring(0, 4) + '...',
            responsePreview: responseText.substring(0, 100),
          },
          troubleshooting: [
            'Verify the API key in your .env file matches the AccountKey from LTA DataMall',
            'Ensure there are no quotes or extra spaces around the key',
            'Restart your dev server after changing .env (npm run dev)',
            'Test the same key in Postman to verify it works',
          ],
        };
        results.checks.ltaApiKey.valid = false;
      } else if (response.ok) {
        results.checks.ltaConnection = {
          success: true,
          status: response.status,
          message: 'API key valid',
        };
        results.checks.ltaApiKey.valid = true;
      } else {
        results.checks.ltaConnection = {
          success: false,
          status: response.status,
          message: `HTTP ${response.status}: ${errorMessage || 'Request failed'}`,
          error: errorMessage,
        };
        results.checks.ltaApiKey.valid = false;
      }
    } catch (error) {
      results.checks.ltaConnection = {
        success: false,
        error: error.message,
        message: 'Connection test failed - network error',
      };
    }
  } else {
    results.checks.ltaConnection = {
      success: false,
      error: 'Missing LTA API key',
      message: 'Cannot test connection',
    };
  }

  // Test Google Maps API Key
  const googleMapsServerKey = process.env.GOOGLE_MAPS_API_KEY
  const googleMapsPublicKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  
  if (googleMapsPublicKey || googleMapsServerKey) {
    // Use server key for server-side testing (no referrer restrictions)
    // Fallback to public key if server key not available
    const apiKey = (googleMapsServerKey || googleMapsPublicKey || '').trim();
    const apiTests = {
      geocoding: null,
      mapsJavaScript: null,
    };
    let overallSuccess = false;
    
    // Add diagnostic info about which key is being used
    if (googleMapsServerKey && googleMapsPublicKey) {
      apiTests.keyInfo = {
        serverKeyPresent: true,
        publicKeyPresent: true,
        using: 'serverKey',
        note: 'Using GOOGLE_MAPS_API_KEY for server-side testing (no referrer restrictions)',
      };
    } else if (googleMapsServerKey) {
      apiTests.keyInfo = {
        serverKeyPresent: true,
        publicKeyPresent: false,
        using: 'serverKey',
        note: 'Using GOOGLE_MAPS_API_KEY (recommended for server-side)',
      };
    } else if (googleMapsPublicKey) {
      apiTests.keyInfo = {
        serverKeyPresent: false,
        publicKeyPresent: true,
        using: 'publicKey',
        note: '⚠️ Using NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for server-side testing. This may fail if the key has HTTP referrer restrictions. Set GOOGLE_MAPS_API_KEY (without referrer restrictions) for server-side calls.',
      };
    }
    
    // Test 1: Geocoding API (Required - for postal code to coordinates)
    try {
      const geocodeResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=639798,Singapore&key=${apiKey}`
      );
      const geocodeData = await geocodeResponse.json();
      
      apiTests.geocoding = {
        success: geocodeData.status === 'OK',
        status: geocodeData.status,
        message: geocodeData.status === 'OK' 
          ? 'Geocoding API enabled' 
          : geocodeData.error_message || geocodeData.status,
        error: geocodeData.error_message || null,
      };
      
      if (geocodeData.status === 'OK') overallSuccess = true;
    } catch (error) {
      apiTests.geocoding = {
        success: false,
        error: error.message,
        message: 'Geocoding API test failed',
      };
    }
    
    // Test 2: Maps JavaScript API (Required - for rendering maps)
    // Note: Can't test via REST, but we can verify the API key format
    // The actual test happens when loading the JS SDK in the browser
    apiTests.mapsJavaScript = {
      success: true, // Assume valid if key exists (actual test happens client-side)
      status: 'NOT_TESTED',
      message: 'Maps JavaScript API - test in browser (loads via JS SDK)',
      note: 'Enable "Maps JavaScript API" in Google Cloud Console',
      troubleshooting: [
        'If you see "This page can\'t load Google Maps correctly" error:',
        '1. Check API key restrictions in Google Cloud Console',
        '2. For development, set "Application restrictions" to "None" or add localhost to HTTP referrers',
        '3. Ensure Maps JavaScript API is enabled',
        '4. Check that billing is enabled for your project',
        '5. Wait 2-5 minutes after changing restrictions',
      ],
    };
    
    // Determine overall status and message
    const enabledApis = Object.entries(apiTests)
      .filter(([_, test]) => test?.success)
      .map(([name, _]) => name);
    
    const disabledApis = Object.entries(apiTests)
      .filter(([_, test]) => test && !test.success)
      .map(([name, test]) => ({ 
        name, 
        reason: test.error || test.message,
        apiName: name === 'geocoding' ? 'Geocoding API' : 'Maps JavaScript API',
      }));
    
    let overallMessage = '';
    if (apiTests.geocoding?.success) {
      overallMessage = 'Geocoding API enabled. Maps JavaScript API must be enabled separately.';
    } else {
      overallMessage = 'Geocoding API not enabled. Enable required APIs in Google Cloud Console.';
    }
    
    results.checks.googleMapsConnection = {
      success: overallSuccess,
      message: overallMessage,
      apis: apiTests,
      enabled: enabledApis,
      disabled: disabledApis,
      requiredApis: [
        'Geocoding API - for postal code to coordinates conversion',
        'Maps JavaScript API - for rendering interactive maps',
        'Directions API (optional) - for route calculation, or use Routes API (new)',
      ],
      troubleshooting: !apiTests.geocoding?.success ? [
        'Go to: https://console.cloud.google.com/apis/library',
        'Search for and enable:',
        '  1. Geocoding API (required)',
        '  2. Maps JavaScript API (required)',
        '  3. Directions API or Routes API (optional, for transit routes)',
        'Wait 2-5 minutes for changes to propagate',
        'Then re-test this endpoint',
      ] : [
        'Geocoding API is working!',
        'Also ensure "Maps JavaScript API" is enabled for map rendering',
        'Optional: Enable "Directions API" or "Routes API" for route calculation',
      ],
    };
    results.checks.googleMapsKey.valid = overallSuccess;
  } else {
    results.checks.googleMapsConnection = {
      success: false,
      error: 'Missing Google Maps API key',
      message: 'Cannot test connection',
    };
  }

  // Check if all passed
  results.allPassed = 
    results.checks.supabaseUrl.present &&
    results.checks.supabaseAnonKey.present &&
    results.checks.supabaseServiceKey.present &&
    results.checks.ltaApiKey.present &&
    results.checks.googleMapsKey.present &&
    results.checks.supabaseConnection?.success &&
    results.checks.ltaConnection?.success &&
    results.checks.googleMapsConnection?.success;

  return Response.json(results, {
    status: results.allPassed ? 200 : 400,
  });
}
