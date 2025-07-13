#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { getDatabaseSchema, getTableColumns, checkRlsPolicies } from '../modules/supabase-client.ts';
import { loadCanonicalRegistry } from '../modules/ssot-registry.ts';
import { findFilesByPattern, fileExists } from '../modules/filesystem.ts';
import { logInfo, logWarn, logError, logSuccess } from '../modules/logging.ts';
import { CheckResult } from '../modules/types.ts';

// SSOT Validation Functions
async function validateSSOT(): Promise<{ errors: string[]; warnings: string[] }> {
  const registry = await loadCanonicalRegistry();
  const errors: string[] = [];
  const warnings: string[] = [];

  logInfo('🔍 Validating Single Source of Truth...');

  // Check for forbidden files
  const forbidden = (typeof registry === 'object' && registry !== null && 'forbidden' in registry) ? (registry as Record<string, unknown>)['forbidden'] : undefined;
  const forbiddenPatterns = (typeof forbidden === 'object' && forbidden !== null && 'patterns' in forbidden) ? (forbidden as Record<string, unknown>)['patterns'] : undefined;
  if (Array.isArray(forbiddenPatterns)) {
    for (const pattern of forbiddenPatterns) {
      if (typeof pattern === 'string') {
        const forbiddenFiles = await findFilesByPattern(pattern);
        for (const file of forbiddenFiles) {
          errors.push(`Forbidden file found: ${file}`);
        }
      }
    }
  }

  // Check for duplicate schema files
  const schemaFiles = await findFilesByPattern('**/*-schema.sql');
  if (schemaFiles.length > 1) {
    errors.push(`Multiple schema files found: ${schemaFiles.join(", ")}`);
  }

  // Check for test files in production
  const testFiles = await findFilesByPattern('**/test-*.ts');
  if (testFiles.length > 0) {
    errors.push(`Test files found in production workspace: ${testFiles.join(", ")}`);
  }

  // Validate canonical files exist
  for (const category of Object.keys(registry)) {
    if (category === 'forbidden' || category === 'aiAgentBoundaries') continue;
    const categoryData = registry[category];
    if (typeof categoryData === 'object' && categoryData !== null && 'files' in categoryData && Array.isArray((categoryData as Record<string, unknown>)['files'])) {
      for (const file of (categoryData as Record<string, unknown>)['files'] as unknown[]) {
        if (typeof file === 'string' && !(await fileExists(file))) {
          warnings.push(`Canonical file missing: ${file}`);
        }
      }
    }
  }

  return { errors, warnings };
}

// Example: Check expected tables and columns in Supabase
async function checkTables(expectedTables: Record<string, string[]>): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  for (const [table, columns] of Object.entries(expectedTables)) {
    const exists = await tableExists(table);
    let columnsOk = false;
    let rlsOk = false;
    let missingColumns: string[] = [];
    let missingPolicies: string[] = [];
    if (exists) {
      const actualColumns = await getTableColumns(table);
      missingColumns = columns.filter(col => !actualColumns.includes(col));
      columnsOk = missingColumns.length === 0;
      const rls = await checkRlsPolicies(table);
      rlsOk = rls.hasRls;
      missingPolicies = rls.policies || [];
    }
    results.push({ table, exists, columnsOk, rlsOk, missingColumns, missingPolicies });
  }
  return results;
}

async function tableExists(tableName: string): Promise<boolean> {
  const schema = await getDatabaseSchema();
  return schema.some((t: { table_name: string }) => t.table_name === tableName);
}

async function main() {
  logInfo('🔍 AI-BOS Architecture Check');
  logInfo('='.repeat(60));

  // 1. Validate SSOT
  const ssotResult = await validateSSOT();
  if (ssotResult.errors.length > 0) {
    logError('❌ SSOT ERRORS:');
    ssotResult.errors.forEach(e => logError(`   • ${e}`));
  }
  if (ssotResult.warnings.length > 0) {
    logWarn('⚠️ SSOT WARNINGS:');
    ssotResult.warnings.forEach(w => logWarn(`   • ${w}`));
  }
  if (ssotResult.errors.length === 0 && ssotResult.warnings.length === 0) {
    logSuccess('✅ SSOT validation passed - No issues found!');
  }

  // 2. Check expected tables (example)
  const expectedTables = {
    tenants: ["id", "name", "slug", "description", "logo_url", "website_url", "contact_email", "status", "plan_type", "max_users", "max_storage_gb", "created_at", "updated_at", "created_by"],
    tenant_members: ["id", "tenant_id", "user_id", "role", "permissions", "joined_at", "invited_by"],
    tenant_settings: ["id", "tenant_id", "theme", "language", "timezone", "notifications_enabled", "auto_backup_enabled", "security_settings", "created_at", "updated_at"],
    app_categories: ["id", "name", "slug", "description", "icon", "color", "sort_order", "is_active", "created_at"],
    apps: ["id", "name", "slug", "description", "long_description", "version", "author_id", "category_id", "icon_url", "screenshots", "download_url", "repository_url", "website_url", "price", "is_free", "is_featured", "is_verified", "status", "downloads_count", "rating_average", "rating_count", "tags", "requirements", "metadata", "created_at", "updated_at"],
    app_versions: ["id", "app_id", "version", "release_notes", "created_at", "updated_at"]
  };
  const tableResults = await checkTables(expectedTables);
  for (const result of tableResults) {
    if (!result.exists) {
      logError(`❌ Table missing: ${result.table}`);
    } else if (!result.columnsOk) {
      logWarn(`⚠️ Table ${result.table} missing columns: ${result.missingColumns.join(", ")}`);
    } else if (!result.rlsOk) {
      logWarn(`⚠️ Table ${result.table} missing RLS policies`);
    } else {
      logSuccess(`✅ Table ${result.table} OK`);
    }
  }

  logInfo('='.repeat(60));
  logSuccess('🎉 AI-BOS Architecture Check Complete');
}

if (import.meta.main) {
  await main();
} 