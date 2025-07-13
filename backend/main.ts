/// <reference lib="deno.unstable" />
// import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { extname } from "https://deno.land/std@0.208.0/path/extname.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_CONFIG } from './modules/config.ts';
import { logError } from './modules/logging.ts';

// Initialize Supabase client
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceRoleKey);

// Storage limits by subscription tier
const STORAGE_LIMITS = {
  free: {
    maxNotes: 10,
    maxNoteSize: 10000, // 10KB per note
    maxTotalStorage: 100000 // 100KB total
  },
  pro: {
    maxNotes: 100,
    maxNoteSize: 100000, // 100KB per note
    maxTotalStorage: 1000000 // 1MB total
  },
  enterprise: {
    maxNotes: 1000,
    maxNoteSize: 1000000, // 1MB per note
    maxTotalStorage: 10000000 // 10MB total
  }
};

// Database interfaces
interface Note {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  size: number;
}

// interface Tenant {
//   id: string;
//   name: string;
//   created_at: string;
//   subscription_tier: string;
// }

// Get tenant ID from request (in production, extract from JWT)
function getTenantId(req: Request): string {
  // For demo: use a header or query param
  // In production: extract from JWT token
  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenant") || req.headers.get("x-tenant-id") || "550e8400-e29b-41d4-a716-446655440000";
  return tenantId;
}

// Check storage quotas for tenant
async function checkStorageQuota(tenantId: string, newNoteSize: number = 0): Promise<{ allowed: boolean; reason?: string; currentUsage: Record<string, unknown> | null }> {
  try {
    // Get tenant subscription tier
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('subscription_tier')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return { allowed: false, reason: "Tenant not found", currentUsage: null };
    }

    const tier = tenant.subscription_tier as keyof typeof STORAGE_LIMITS;
    const limits = STORAGE_LIMITS[tier] || STORAGE_LIMITS.free;

    // Get current usage
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('size')
      .eq('tenant_id', tenantId);

    if (notesError) {
      return { allowed: false, reason: "Failed to check current usage", currentUsage: null };
    }

    const currentNotes = notes?.length || 0;
    const currentStorage = notes?.reduce((sum, note) => sum + note.size, 0) || 0;
    const newTotalStorage = currentStorage + newNoteSize;

    // Check limits
    if (currentNotes >= limits.maxNotes) {
      return { 
        allowed: false, 
        reason: `Note limit exceeded. Maximum ${limits.maxNotes} notes allowed for ${tier} tier.`,
        currentUsage: { notes: currentNotes, storage: currentStorage, limits }
      };
    }

    if (newTotalStorage > limits.maxTotalStorage) {
      return { 
        allowed: false, 
        reason: `Storage limit exceeded. Maximum ${limits.maxTotalStorage} bytes allowed for ${tier} tier.`,
        currentUsage: { notes: currentNotes, storage: currentStorage, limits }
      };
    }

    if (newNoteSize > limits.maxNoteSize) {
      return { 
        allowed: false, 
        reason: `Note size limit exceeded. Maximum ${limits.maxNoteSize} bytes per note for ${tier} tier.`,
        currentUsage: { notes: currentNotes, storage: currentStorage, limits }
      };
    }

    return { 
      allowed: true, 
      currentUsage: { notes: currentNotes, storage: currentStorage, limits }
    };

  } catch (error) {
    logError(`Storage quota check error: ${error instanceof Error ? error.message : String(error)}`);
    return { allowed: false, reason: "Storage quota check failed", currentUsage: null };
  }
}

// Handle API routes
async function handleAPI(req: Request, path: string): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Tenant-ID",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tenantId = getTenantId(req);

    if (path === "/api/saveNote" && req.method === "POST") {
      const body = await req.json();
      const { content, title = "Untitled Note" } = body;
      
      if (!content || typeof content !== "string") {
        return new Response(
          JSON.stringify({ error: "Content is required and must be a string" }),
          { 
            status: 400, 
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders 
            } 
          }
        );
      }

      // Check storage quota before saving
      const quotaCheck = await checkStorageQuota(tenantId, content.length);
      if (!quotaCheck.allowed) {
        return new Response(
          JSON.stringify({ 
            error: quotaCheck.reason,
            quota: quotaCheck.currentUsage
          }),
          { 
            status: 413, // Payload Too Large
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders 
            } 
          }
        );
      }

      const noteData = {
        tenant_id: tenantId,
        title: title.trim() || "Untitled Note",
        content: content.trim(),
        size: content.length
      };

      const { data: note, error } = await supabase
        .from('notes')
        .insert([noteData])
        .select()
        .single();

      if (error) {
        logError(`Supabase error: ${error.message}`);
        return new Response(
          JSON.stringify({ error: "Failed to save note" }),
          { 
            status: 500, 
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders 
            } 
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          message: "Note saved successfully!", 
          noteId: note.id,
          tenantId,
          timestamp: note.created_at,
          quota: quotaCheck.currentUsage
        }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          } 
        }
      );
    }

    if (path === "/api/notes" && req.method === "GET") {
      const { data: notes, error } = await supabase
        .from('notes')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false });

      if (error) {
        logError(`Supabase error: ${error.message}`);
        return new Response(
          JSON.stringify({ error: "Failed to load notes" }),
          { 
            status: 500, 
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders 
            } 
          }
        );
      }

      // Get quota info for the response
      const quotaCheck = await checkStorageQuota(tenantId);
      
      return new Response(
        JSON.stringify({
          notes: notes || [],
          quota: quotaCheck.currentUsage
        }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          } 
        }
      );
    }

    if (path === "/api/quota" && req.method === "GET") {
      const quotaCheck = await checkStorageQuota(tenantId);
      
      return new Response(
        JSON.stringify({
          quota: quotaCheck.currentUsage,
          limits: quotaCheck.currentUsage?.['limits']
        }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          } 
        }
      );
    }

    if (path.startsWith("/api/notes/") && req.method === "GET") {
      const noteId = path.split("/").pop();
      if (!noteId) {
        return new Response(
          JSON.stringify({ error: "Note ID required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: note, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .eq('tenant_id', tenantId)
        .single();

      if (error || !note) {
        return new Response(
          JSON.stringify({ error: "Note not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify(note),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (path.startsWith("/api/notes/") && req.method === "PUT") {
      const noteId = path.split("/").pop();
      if (!noteId) {
        return new Response(
          JSON.stringify({ error: "Note ID required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const body = await req.json();
      const { content, title } = body;

      // Check storage quota for updates
      if (content !== undefined) {
        const quotaCheck = await checkStorageQuota(tenantId, content.length);
        if (!quotaCheck.allowed) {
          return new Response(
            JSON.stringify({ 
              error: quotaCheck.reason,
              quota: quotaCheck.currentUsage
            }),
            { 
              status: 413,
              headers: { "Content-Type": "application/json", ...corsHeaders } 
            }
          );
        }
      }

      const updateData: Partial<Note> = {
        updated_at: new Date().toISOString()
      };

      if (title !== undefined) updateData.title = title;
      if (content !== undefined) {
        updateData.content = content;
        updateData.size = content.length;
      }

      const { data: note, error } = await supabase
        .from('notes')
        .update(updateData)
        .eq('id', noteId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error || !note) {
        return new Response(
          JSON.stringify({ error: "Note not found or update failed" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ message: "Note updated successfully!", note }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (path.startsWith("/api/notes/") && req.method === "DELETE") {
      const noteId = path.split("/").pop();
      if (!noteId) {
        return new Response(
          JSON.stringify({ error: "Note ID required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('tenant_id', tenantId);

      if (error) {
        logError(`Supabase error: ${error.message}`);
        return new Response(
          JSON.stringify({ error: "Failed to delete note" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ message: "Note deleted successfully!" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Tenant management endpoints
    if (path === "/api/tenants" && req.method === "POST") {
      const body = await req.json();
      const { name, subscription_tier = "free" } = body;

      const tenantData = {
        id: crypto.randomUUID(),
        name: name || "New Tenant",
        subscription_tier
      };

      const { data: tenant, error } = await supabase
        .from('tenants')
        .insert([tenantData])
        .select()
        .single();

      if (error) {
        logError(`Supabase error: ${error.message}`);
        return new Response(
          JSON.stringify({ error: "Failed to create tenant" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ message: "Tenant created successfully!", tenant }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "API endpoint not found" }),
      { 
        status: 404, 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        } 
      }
    );
  } catch (error) {
    logError(`API Error: ${error instanceof Error ? error.message : String(error)}`);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        } 
      }
    );
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname === "/" ? "/index.html" : url.pathname;

  // Healthcheck endpoint for debugging
  if (url.pathname === "/healthcheck") {
    try {
      // Test Supabase connection
      const { error } = await supabase.from('notes').select('count').limit(1);
      const supabaseStatus = error ? "error" : "connected";
      
      const files = [];
      for await (const f of Deno.readDir(".")) {
        files.push(f.name);
      }
      const faviconExists = await Deno.stat("./favicon.ico").then(() => true).catch(() => false);
      
      return new Response(JSON.stringify({
        faviconExists,
        files,
        supabaseStatus,
        supabaseUrl: SUPABASE_CONFIG.url,
        storageLimits: STORAGE_LIMITS
      }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (_error) {
      return new Response(JSON.stringify({
        error: "Health check failed",
        supabaseStatus: "error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // Handle API routes
  if (path.startsWith("/api/")) {
    return await handleAPI(req, path);
  }

  // Try to serve static files first
  try {
    const file = await Deno.readFile(`.${path}`);
    return new Response(file, {
      headers: {
        "content-type": getContentType(extname(path)),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
});

function getContentType(ext: string): string {
  switch (ext) {
    case ".ico": return "image/x-icon";
    case ".html": return "text/html";
    case ".js": return "application/javascript";
    case ".css": return "text/css";
    case ".png": return "image/png";
    case ".json": return "application/json";
    default: return "application/octet-stream";
  }
} 