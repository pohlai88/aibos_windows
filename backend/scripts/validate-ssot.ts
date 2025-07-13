#!/usr/bin/env -S deno run --allow-read

import {
  loadCanonicalRegistry,
} from '../modules/ssot-registry.ts';
import {
  findFilesByPattern,
  fileExists,
} from '../modules/filesystem.ts';
import {
  logInfo,
  logWarn,
  logError,
  logSuccess,
} from '../modules/logging.ts';
import { ValidationResult } from '../modules/types.ts';

/**
 * SSOT Validation Script (Unified)
 * Validates workspace against canonical registry using unified modules
 */

async function validateSSOT(): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Load canonical registry
    let registry;
    try {
      registry = await loadCanonicalRegistry();
      logSuccess('Canonical registry loaded successfully');
    } catch (_error) {
      errors.push('workspace-canonical.json not found or invalid');
      logError('workspace-canonical.json not found or invalid');
      return { isValid: false, errors, warnings };
    }

    // Check for test files
    const testFiles = await findFilesByPattern('test-*.ts');
    if (testFiles.length > 0) {
      errors.push(`Test files found: ${testFiles.join(", ")}`);
    }

    // Check for schema files
    const schemaFiles = await findFilesByPattern('*schema*.sql');
    if (schemaFiles.length > 1) {
      errors.push(`Multiple schema files found: ${schemaFiles.join(", ")}`);
    }

    // Check for build artifacts
    const buildDirs = ['.turbo', 'dist', 'build', 'node_modules'];
    for (const dir of buildDirs) {
      if (await fileExists(dir)) {
        errors.push(`Build artifact found: ${dir}`);
      }
    }

    // Validate canonical files exist
    const schemas = registry['schemas'] as { files?: string[] } | undefined;
    if (schemas?.files) {
      for (const file of schemas.files) {
        if (!(await fileExists(file))) {
          warnings.push(`Canonical schema file missing: ${file}`);
        }
      }
    }

    const scripts = registry['scripts'] as { files?: string[] } | undefined;
    if (scripts?.files) {
      for (const file of scripts.files) {
        if (!(await fileExists(file))) {
          warnings.push(`Canonical script missing: ${file}`);
        }
      }
    }

    const isValid = errors.length === 0;
    return { isValid, errors, warnings };
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    logError(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    return { isValid: false, errors, warnings };
  }
}

async function main() {
  logInfo('🔍 AIBOS SSOT Validation');
  logInfo('='.repeat(50));

  const result = await validateSSOT();

  if (result.errors.length > 0) {
    logError('\n❌ SSOT ERRORS:');
    result.errors.forEach(e => logError(`   • ${e}`));
  }

  if (result.warnings.length > 0) {
    logWarn('\n⚠️ SSOT WARNINGS:');
    result.warnings.forEach(w => logWarn(`   • ${w}`));
  }

  if (result.errors.length === 0 && result.warnings.length === 0) {
    logSuccess('\n✅ SSOT validation passed - No issues found!');
  }

  logInfo('\n' + '='.repeat(50));
  if (result.isValid) {
    logSuccess('🎉 SSOT VALIDATION: PASSED');
  } else {
    logError('❌ SSOT VALIDATION: FAILED');
  }
  logInfo('='.repeat(50));

  Deno.exit(result.isValid ? 0 : 1);
}

if (import.meta.main) {
  await main();
}
