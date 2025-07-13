#!/usr/bin/env -S deno run --allow-env

/**
 * Unified Validation Utilities for AI-BOS Platform
 * 
 * This module provides centralized validation functions with consistent
 * error handling and validation rules across all scripts, API modules, and the platform.
 * 
 * Consolidates validation from:
 * - scripts/modules/validation.ts (platform validation)
 * - api/modules/validation.ts (API-specific validation)
 */

import { ValidationResult, ValidationOptions, ApiValidationResult, ValidationErrorCodes } from './types.ts';

// Common validation patterns
const patterns = {
  slug: /^[a-z0-9-]+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/.+/,
  version: /^\d+\.\d+\.\d+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  filename: /^[a-zA-Z0-9._-]+$/,
  path: /^[a-zA-Z0-9/._-]+$/
};

// Windows reserved filenames
const windowsReservedNames = [
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
];

// Invalid characters for file/folder names
// deno-lint-ignore no-control-regex
const INVALID_NAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/;

// Invalid characters for paths
// deno-lint-ignore no-control-regex
const INVALID_PATH_CHARS = /[\u0000-\u001f]/;

/**
 * Validate a slug (URL-friendly identifier)
 * @param slug - Slug to validate
 * @param options - Validation options
 * @returns ValidationResult
 */
export function validateSlug(slug: string, options: ValidationOptions = {}): ValidationResult {
  const { allowEmpty = false, maxLength = 50, minLength = 1 } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if empty
  if (!slug) {
    if (allowEmpty) {
      return { isValid: true, errors: [], warnings: [] };
    }
    errors.push("Slug cannot be empty");
    return { isValid: false, errors, warnings };
  }

  // Check length
  if (slug.length < minLength) {
    errors.push(`Slug must be at least ${minLength} characters long`);
  }
  if (slug.length > maxLength) {
    errors.push(`Slug must be no more than ${maxLength} characters long`);
  }

  // Check pattern
  if (!patterns.slug.test(slug)) {
    errors.push("Slug can only contain lowercase letters, numbers, and hyphens");
  }

  // Check for reserved names
  if (windowsReservedNames.includes(slug.toUpperCase())) {
    errors.push(`Slug cannot be a Windows reserved name: ${slug}`);
  }

  // Check for consecutive hyphens
  if (slug.includes('--')) {
    warnings.push("Slug contains consecutive hyphens");
  }

  // Check for leading/trailing hyphens
  if (slug.startsWith('-') || slug.endsWith('-')) {
    warnings.push("Slug should not start or end with hyphens");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate an email address
 * @param email - Email to validate
 * @param options - Validation options
 * @returns ValidationResult
 */
export function validateEmail(email: string, options: ValidationOptions = {}): ValidationResult {
  const { allowEmpty = false } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if empty
  if (!email) {
    if (allowEmpty) {
      return { isValid: true, errors: [], warnings: [] };
    }
    errors.push("Email cannot be empty");
    return { isValid: false, errors, warnings };
  }

  // Check pattern
  if (!patterns.email.test(email)) {
    errors.push("Invalid email format");
  }

  // Check length
  if (email.length > 254) {
    errors.push("Email is too long (max 254 characters)");
  }

  // Check for common issues
  if (email.includes('..')) {
    warnings.push("Email contains consecutive dots");
  }

  if (email.startsWith('.') || email.endsWith('.')) {
    warnings.push("Email should not start or end with dots");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a URL
 * @param url - URL to validate
 * @param options - Validation options
 * @returns ValidationResult
 */
export function validateUrl(url: string, options: ValidationOptions = {}): ValidationResult {
  const { allowEmpty = false } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if empty
  if (!url) {
    if (allowEmpty) {
      return { isValid: true, errors: [], warnings: [] };
    }
    errors.push("URL cannot be empty");
    return { isValid: false, errors, warnings };
  }

  // Check pattern
  if (!patterns.url.test(url)) {
    errors.push("Invalid URL format (must start with http:// or https://)");
  }

  // Try to construct URL object for additional validation
  try {
    new URL(url);
  } catch {
    errors.push("Invalid URL structure");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a version string
 * @param version - Version to validate
 * @param options - Validation options
 * @returns ValidationResult
 */
export function validateVersion(version: string, options: ValidationOptions = {}): ValidationResult {
  const { allowEmpty = false } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if empty
  if (!version) {
    if (allowEmpty) {
      return { isValid: true, errors: [], warnings: [] };
    }
    errors.push("Version cannot be empty");
    return { isValid: false, errors, warnings };
  }

  // Check pattern
  if (!patterns.version.test(version)) {
    errors.push("Invalid version format (must be x.y.z)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a filename
 * @param filename - Filename to validate
 * @param options - Validation options
 * @returns ValidationResult
 */
export function validateFilename(filename: string, options: ValidationOptions = {}): ValidationResult {
  const { allowEmpty = false } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if empty
  if (!filename) {
    if (allowEmpty) {
      return { isValid: true, errors: [], warnings: [] };
    }
    errors.push("Filename cannot be empty");
    return { isValid: false, errors, warnings };
  }

  // Check length
  if (filename.length > 255) {
    errors.push("Filename is too long (max 255 characters)");
  }

  // Check pattern
  if (!patterns.filename.test(filename)) {
    errors.push("Filename contains invalid characters");
  }

  // Check for reserved names
  const baseName = filename.toUpperCase().split(".")[0];
  if (windowsReservedNames.includes(baseName as string)) {
    errors.push(`Filename cannot be a Windows reserved name: ${filename}`);
  }

  // Check for leading/trailing spaces
  if (filename !== filename.trim()) {
    errors.push("Filename cannot start or end with spaces");
  }

  // Check for dot-only names
  if (filename === "." || filename === "..") {
    errors.push("Filename cannot be '.' or '..'");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a file path
 * @param filePath - File path to validate
 * @param options - Validation options
 * @returns ValidationResult
 */
export function validatePath(filePath: string, options: ValidationOptions = {}): ValidationResult {
  const { allowEmpty = false } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if empty
  if (!filePath) {
    if (allowEmpty) {
      return { isValid: true, errors: [], warnings: [] };
    }
    errors.push("Path cannot be empty");
    return { isValid: false, errors, warnings };
  }

  // Check length
  if (filePath.length > 4096) {
    errors.push("Path is too long (max 4096 characters)");
  }

  // Check for path traversal
  if (filePath.includes("..")) {
    errors.push("Path cannot contain '..'");
  }

  // Check for invalid characters
  if (INVALID_PATH_CHARS.test(filePath)) {
    errors.push("Path contains invalid characters");
  }

  // Check pattern
  if (!patterns.path.test(filePath)) {
    errors.push("Path contains invalid characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a UUID
 * @param uuid - UUID to validate
 * @param options - Validation options
 * @returns ValidationResult
 */
export function validateUuid(uuid: string, options: ValidationOptions = {}): ValidationResult {
  const { allowEmpty = false } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if empty
  if (!uuid) {
    if (allowEmpty) {
      return { isValid: true, errors: [], warnings: [] };
    }
    errors.push("UUID cannot be empty");
    return { isValid: false, errors, warnings };
  }

  // Check pattern
  if (!patterns.uuid.test(uuid)) {
    errors.push("Invalid UUID format");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a required field
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param options - Validation options
 * @returns ValidationResult
 */
export function validateRequired(
  value: unknown, 
  fieldName: string, 
  options: ValidationOptions = {}
): ValidationResult {
  const { allowEmpty = false } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if empty
  if (value === null || value === undefined || value === "") {
    if (allowEmpty) {
      return { isValid: true, errors: [], warnings: [] };
    }
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors, warnings };
  }

  return {
    isValid: true,
    errors: [],
    warnings
  };
}

/**
 * Validate string length
 * @param value - String value to validate
 * @param fieldName - Name of the field for error messages
 * @param options - Validation options
 * @returns ValidationResult
 */
export function validateLength(
  value: string, 
  fieldName: string, 
  options: ValidationOptions = {}
): ValidationResult {
  const { minLength, maxLength } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (minLength && value.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters long`);
  }

  if (maxLength && value.length > maxLength) {
    errors.push(`${fieldName} must be no more than ${maxLength} characters long`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate multiple validation functions
 * @param validations - Array of validation functions to run
 * @returns ValidationResult
 */
export function validateMultiple(validations: Array<() => ValidationResult>): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const validation of validations) {
    const result = validation();
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Format validation errors into a readable string
 * @param result - Validation result to format
 * @returns string - Formatted error message
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.isValid) {
    return "Validation passed";
  }

  const parts: string[] = [];
  
  if (result.errors.length > 0) {
    parts.push("Errors:");
    parts.push(...result.errors.map(error => `  - ${error}`));
  }
  
  if (result.warnings.length > 0) {
    parts.push("Warnings:");
    parts.push(...result.warnings.map(warning => `  - ${warning}`));
  }
  
  return parts.join("\n");
}

// API-Specific validation functions (simplified interface)

/**
 * Validate email format (API version)
 */
export function validateEmailApi(email: string): ApiValidationResult {
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      message: "Email cannot be empty",
      code: ValidationErrorCodes.EMPTY_NAME,
    };
  }

  if (!patterns.email.test(email)) {
    return {
      valid: false,
      message: "Invalid email format",
      code: ValidationErrorCodes.INVALID_EMAIL,
    };
  }
  
  return {
    valid: true,
  };
}

/**
 * Validate file or folder name (API version)
 */
export function validateFileNameApi(name: string): ApiValidationResult {
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      message: "Name cannot be empty",
      code: ValidationErrorCodes.EMPTY_NAME,
    };
  }

  // Check for leading/trailing spaces
  if (name !== name.trim()) {
    return {
      valid: false,
      message: "Name cannot start or end with spaces",
      code: ValidationErrorCodes.LEADING_TRAILING_SPACES,
    };
  }

  // Check for dot-only names
  if (name === "." || name === "..") {
    return {
      valid: false,
      message: "Name cannot be '.' or '..'",
      code: ValidationErrorCodes.DOT_ONLY_NAME,
    };
  }

  if (name.length > 255) {
    return {
      valid: false,
      message: "Name is too long (max 255 characters)",
      code: ValidationErrorCodes.NAME_TOO_LONG,
    };
  }

  // Check for invalid characters
  if (INVALID_NAME_CHARS.test(name)) {
    return {
      valid: false,
      message: "Name contains invalid characters",
      code: ValidationErrorCodes.INVALID_CHARS,
    };
  }

  // Check for reserved names (Windows) - including with extensions
  const baseName = name.toUpperCase().split(".")[0];
  if (windowsReservedNames.includes(baseName as string)) {
    return {
      valid: false,
      message: "Name is reserved by the system",
      code: ValidationErrorCodes.RESERVED_NAME,
    };
  }

  return {
    valid: true,
  };
}

/**
 * Validate file path (API version)
 */
export function validatePathApi(path: string): ApiValidationResult {
  if (!path || path.trim().length === 0) {
    return {
      valid: false,
      message: "Path cannot be empty",
      code: ValidationErrorCodes.EMPTY_PATH,
    };
  }

  if (path.includes("..")) {
    return {
      valid: false,
      message: "Path cannot contain '..'",
      code: ValidationErrorCodes.PATH_CONTAINS_DOTS,
    };
  }

  if (path.length > 4096) {
    return {
      valid: false,
      message: "Path is too long (max 4096 characters)",
      code: ValidationErrorCodes.PATH_TOO_LONG,
    };
  }

  // Check for invalid characters
  if (INVALID_PATH_CHARS.test(path)) {
    return {
      valid: false,
      message: "Path contains invalid characters",
      code: ValidationErrorCodes.INVALID_CHARS,
    };
  }

  return {
    valid: true,
  };
}

/**
 * Validate item ID (API version)
 */
export function validateItemIdApi(id: string): ApiValidationResult {
  if (!id || id.trim().length === 0) {
    return {
      valid: false,
      message: "ID cannot be empty",
      code: ValidationErrorCodes.EMPTY_ID,
    };
  }

  if (id.length > 128) {
    return {
      valid: false,
      message: "ID is too long (max 128 characters)",
      code: ValidationErrorCodes.ID_TOO_LONG,
    };
  }

  return {
    valid: true,
  };
}

// Convenience functions for API validation
export function isValidName(name: string): boolean {
  return validateFileNameApi(name).valid;
}

export function isValidPath(path: string): boolean {
  return validatePathApi(path).valid;
}

export function isValidId(id: string): boolean {
  return validateItemIdApi(id).valid;
}

export function isValidEmail(email: string): boolean {
  return validateEmailApi(email).valid;
} 