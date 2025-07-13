/// <reference lib="deno.ns" />

/**
 * AI-BOS Configuration
 * 
 * Centralized configuration for the AI-BOS platform.
 * Uses environment variables with fallbacks for development.
 */

export const SUPABASE_CONFIG = {
  url: Deno.env.get("SUPABASE_URL") || "https://your-project.supabase.co",
  anonKey: Deno.env.get("SUPABASE_ANON_KEY") || "your-anon-key",
  serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "your-service-role-key",
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
};

export const STORAGE_CONFIG = {
  bucket: Deno.env.get("SUPABASE_STORAGE_BUCKET") || 'aibos-files',
  allowedMimeTypes: [
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'image/png',
    'image/jpeg',
    'image/gif',
    'application/pdf'
  ],
  maxFileSize: parseInt(Deno.env.get("MAX_FILE_SIZE") || "10485760")
};

export const API_CONFIG = {
  baseUrl: `${SUPABASE_CONFIG.url}/rest/v1`,
  headers: {
    apikey: SUPABASE_CONFIG.anonKey,
    Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
    'Content-Type': 'application/json'
  }
};

export const PLATFORM_CONFIG = {
  nodeEnv: Deno.env.get("NODE_ENV") || 'development',
  port: parseInt(Deno.env.get("PORT") || "8000"),
  enablePathValidation: Deno.env.get("ENABLE_PATH_VALIDATION") === "true",
  supabaseRealtimeEnabled: Deno.env.get("SUPABASE_REALTIME_ENABLED") === "true"
}; 