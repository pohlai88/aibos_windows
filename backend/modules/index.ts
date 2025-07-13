/**
 * AI-BOS Unified Modules Index
 * 
 * This is the single source of truth for all shared modules.
 * Consolidates high-quality code from scripts/modules and api/modules
 * into one unified, connected architecture.
 */

// ============================================================================
// Core Platform Types (Unified)
// ============================================================================
export * from '../shared/types/platform.ts';

// ============================================================================
// Configuration (Unified)
// ============================================================================
export * from './config.ts';

// ============================================================================
// Supabase Integration (Unified)
// ============================================================================
export * from './supabase-client.ts';

// ============================================================================
// File System Operations (unified)
// ============================================================================
export * from './filesystem.ts';

// ============================================================================
// Validation (unified)
// ============================================================================
export * from './validation.ts';

// ============================================================================
// Logging (from scripts/modules)
// ============================================================================
export * from './logging.ts';

// ============================================================================
// SSOT Registry (from scripts/modules)
// ============================================================================
export * from './ssot-registry.ts';

// ============================================================================
// API-Specific Modules (from api/modules) - Coming Soon
// ============================================================================
// These will be added as we consolidate the API modules
// export * from './api-types.ts';
// export * from './api-storage.ts';
// export * from './api-middleware.ts';
// export * from './api-cache.ts';
// export * from './api-events.ts';
// export * from './api-metrics.ts';
// export * from './api-utils.ts';

// ============================================================================
// Unified Exports for Common Use Cases
// ============================================================================

// Common validation functions
export { 
  validateSlug, 
  validateEmail, 
  validateUrl, 
  validateVersion,
  validateFilename,
  validatePath,
  validateUuid,
  validateRequired,
  validateLength,
  validateMultiple,
  formatValidationErrors
} from './validation.ts';

// Common file operations
export {
  findFilesByPattern,
  safeRemove,
  ensureDir,
  readJsonFile,
  writeJsonFile,
  copyFile,
  moveFile
} from './filesystem.ts';

// Common logging functions
export {
  logInfo,
  logWarn,
  logError,
  logSuccess,
  logDebug
} from './logging.ts';

// Supabase utilities
export {
  supabase,
  testConnection,
  getDatabaseSchema,
  tableExists,
  getTableColumns,
  checkRlsPolicies,
  executeQuery
} from './supabase-client.ts';

// SSOT utilities
export {
  loadCanonicalRegistry,
  getRegistrySection,
  getWorkspaceConfig,
  getFilePatterns,
  getScriptsConfig,
  getModulesConfig,
  validateRegistry,
  getRegistryMetadata
} from './ssot-registry.ts'; 