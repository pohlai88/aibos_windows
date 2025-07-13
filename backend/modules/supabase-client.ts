#!/usr/bin/env -S deno run --allow-net --allow-env

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_CONFIG } from './config.ts';
import { logError, logSuccess } from "./logging.ts";

/**
 * Unified Supabase client for AI-BOS platform
 * 
 * This module provides a single, configured Supabase client instance
 * that can be imported by all scripts, API modules, and the entire platform.
 * It ensures consistent configuration and connection management.
 */

// Validate required configuration
if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.serviceRoleKey) {
  throw new Error("Missing required Supabase configuration. Please check config.ts");
}

/**
 * Create and configure the Supabase client
 */
export const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Test the Supabase connection
 * @returns Promise<boolean> - true if connection is successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    // Try a simple query to test the connection
    const { error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (error) {
      logError(`❌ Supabase connection test failed: ${error.message}`);
      return false;
    }

    logSuccess("✅ Supabase connection successful");
    return true;
  } catch (error) {
    logError(`❌ Supabase connection test failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Get database schema information
 * @returns Promise<Array<{table_name: string}>> - List of tables
 */
export async function getDatabaseSchema(): Promise<Array<{table_name: string}>> {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) {
      logError(`❌ Failed to get database schema: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    logError(`❌ Failed to get database schema: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Check if a specific table exists
 * @param tableName - Name of the table to check
 * @returns Promise<boolean> - true if table exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .single();

    return !!data;
  } catch (_error) {
    return false;
  }
}

/**
 * Get columns for a specific table
 * @param tableName - Name of the table
 * @returns Promise<string[]> - Array of column names
 */
export async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');

    if (error) {
      logError(`❌ Error fetching columns for "${tableName}": ${error.message}`);
      return [];
    }

    return data?.map(col => col.column_name) || [];
  } catch (error) {
    logError(`❌ Error fetching columns for "${tableName}": ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Check RLS policies for a table
 * @param tableName - Name of the table
 * @returns Promise<{hasRls: boolean; policies: string[]}> - RLS status and policies
 */
export async function checkRlsPolicies(tableName: string): Promise<{hasRls: boolean; policies: string[]}> {
  try {
    // Check if RLS is enabled
    const { data: rlsData, error: rlsError } = await supabase
      .from('pg_tables')
      .select('rowsecurity')
      .eq('tablename', tableName)
      .single();

    if (rlsError || !rlsData?.rowsecurity) {
      return { hasRls: false, policies: [] };
    }

    // Get existing policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname')
      .eq('tablename', tableName);

    if (policiesError) {
      logError(`❌ Error fetching RLS policies for "${tableName}": ${policiesError.message}`);
      return { hasRls: true, policies: [] };
    }

    const policyNames = policies?.map(p => p.policyname) || [];
    return { hasRls: true, policies: policyNames };
  } catch (error) {
    logError(`❌ Error checking RLS for "${tableName}": ${error instanceof Error ? error.message : String(error)}`);
    return { hasRls: false, policies: [] };
  }
}

/**
 * Execute a raw SQL query (use with caution)
 * @param sql - SQL query to execute
 * @returns Promise<unknown> - Query result
 */
export async function executeQuery(sql: string): Promise<unknown> {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      logError(`❌ Query execution failed: ${error.message}`);
      throw error;
    }
    
    return data;
  } catch (error) {
    logError(`❌ Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Export configuration for reference
export { SUPABASE_CONFIG };

// Default export for convenience
export default supabase; 