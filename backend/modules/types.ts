#!/usr/bin/env -S deno run --allow-env

/**
 * Unified Types for AI-BOS Platform
 * 
 * This module provides centralized type definitions that are used
 * across scripts, API modules, and the entire platform, ensuring 
 * consistency and reducing duplication.
 * 
 * Consolidates types from:
 * - scripts/modules/types.ts (platform types)
 * - api/modules/types.ts (API-specific types)
 */

// ============================================================================
// Database and Schema Types
// ============================================================================

export interface CheckResult {
  table: string;
  exists: boolean;
  columnsOk: boolean;
  rlsOk: boolean;
  missingColumns: string[];
  missingPolicies: string[];
}

export interface DatabaseTable {
  name: string;
  columns: string[];
  hasRls: boolean;
  policies: string[];
}

export interface SchemaValidationResult {
  tables: CheckResult[];
  summary: {
    totalTables: number;
    existingTables: number;
    tablesWithAllColumns: number;
    tablesWithRls: number;
  };
  isValid: boolean;
}

// ============================================================================
// File System Types (Unified)
// ============================================================================

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  isDirectory: boolean;
  modifiedAt: Date;
  createdAt: Date;
}

export interface FileOperationResult {
  success: boolean;
  path: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface FileSearchResult {
  files: string[];
  totalFound: number;
  searchTime: number;
  pattern: string;
}

// API-Specific File Types
export type FileItem = File | Folder;

export interface File {
  id: string;
  name: string;
  type: "file";
  size: number;
  modified: string;
  icon: string;
  path: string;
}

export interface Folder {
  id: string;
  name: string;
  type: "folder";
  modified: string;
  icon: string;
  path: string;
}

export interface OperationError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface OperationResult<T = FileItem | FileItem[]> {
  success: boolean;
  data?: T;
  error?: string | OperationError;
}

export interface FileStorage {
  getFiles(path: string): Promise<FileItem[]>;
  saveFiles(path: string, files: FileItem[]): Promise<void>;
  deleteFile(path: string, itemId: string): Promise<boolean>;
}

// Type guards for API types
export function isFile(item: FileItem): item is File {
  return item.type === "file";
}

export function isFolder(item: FileItem): item is Folder {
  return item.type === "folder";
}

export function isValidOperationResult<T>(result: unknown): result is OperationResult<T> {
  return typeof result === "object" && 
         result !== null && 
         typeof (result as Record<string, unknown>)['success'] === "boolean";
}

export function hasError(result: OperationResult): result is OperationResult & { error: string | OperationError } {
  return !result.success && result.error !== undefined;
}

export function hasData<T>(result: OperationResult<T>): result is OperationResult<T> & { data: T } {
  return result.success && result.data !== undefined;
}

// ============================================================================
// Validation Types (Unified)
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationOptions {
  strict?: boolean;
  allowEmpty?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
}

// API-Specific Validation Result
export type ApiValidationResult = {
  valid: boolean;
  message?: string;
  code?: string;
};

// ============================================================================
// Logging Types
// ============================================================================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4
}

export interface LogOptions {
  level?: LogLevel;
  timestamp?: boolean;
  prefix?: string;
  color?: boolean;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  prefix?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ScriptConfig {
  name: string;
  version: string;
  description: string;
  author?: string;
  dependencies?: string[];
  permissions?: string[];
}

export interface EnvironmentConfig {
  nodeEnv: 'development' | 'production' | 'test';
  debug: boolean;
  verbose: boolean;
  dryRun: boolean;
}

// ============================================================================
// Process and Execution Types
// ============================================================================

export interface ProcessResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  command: string;
}

export interface ExecutionContext {
  scriptName: string;
  startTime: Date;
  config: ScriptConfig;
  environment: EnvironmentConfig;
  args: string[];
}

// ============================================================================
// Report and Output Types
// ============================================================================

export interface ReportSection {
  title: string;
  content: string | string[];
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

export interface Report {
  title: string;
  version: string;
  generatedAt: Date;
  sections: ReportSection[];
  summary: {
    totalSections: number;
    totalErrors: number;
    totalWarnings: number;
    totalSuccess: number;
  };
}

export interface OutputFormat {
  type: 'text' | 'json' | 'csv' | 'html';
  pretty?: boolean;
  includeMetadata?: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ScriptError extends Error {
  code: string;
  context?: Record<string, unknown>;
  timestamp: Date;
  scriptName?: string;
}

export interface ValidationError extends ScriptError {
  field: string;
  value: unknown;
  rule: string;
}

export interface DatabaseError extends ScriptError {
  table?: string;
  operation: string;
  sql?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Nullable<T> = T | null;

export type AsyncResult<T, E = Error> = Promise<{ success: true; data: T } | { success: false; error: E }>;

// ============================================================================
// Event and Callback Types
// ============================================================================

export interface EventHandler<T = unknown> {
  (event: string, data: T): void | Promise<void>;
}

export interface ProgressCallback {
  (current: number, total: number, message: string): void;
}

export interface ErrorCallback {
  (error: ScriptError): void;
}

// ============================================================================
// API and HTTP Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  requestId?: string;
}

export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  createdAt: Date;
  expiresAt?: Date;
  accessCount: number;
  lastAccessed: Date;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  maxAge?: number; // Maximum age in milliseconds
}

// ============================================================================
// Performance Types
// ============================================================================

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

export interface PerformanceReport {
  scriptName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  metrics: PerformanceMetric[];
  summary: {
    totalMetrics: number;
    averageDuration: number;
    peakMemory?: number;
  };
}

// ============================================================================
// Task and Job Types
// ============================================================================

export interface TaskDefinition {
  id: string;
  name: string;
  description: string;
  handler: () => Promise<unknown>;
  dependencies?: string[];
  timeout?: number;
  retries?: number;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  data?: unknown;
  error?: ScriptError;
  duration: number;
  startTime: Date;
  endTime: Date;
}

export interface JobDefinition {
  id: string;
  name: string;
  description: string;
  tasks: TaskDefinition[];
  parallel?: boolean;
  timeout?: number;
  retries?: number;
}

export interface JobResult {
  jobId: string;
  success: boolean;
  results: TaskResult[];
  duration: number;
  startTime: Date;
  endTime: Date;
  summary: {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    averageTaskDuration: number;
  };
}

// ============================================================================
// API-Specific Constants
// ============================================================================

export const FileOperationErrorCodes = {
  NOT_FOUND: "FILE_NOT_FOUND",
  ALREADY_EXISTS: "FILE_ALREADY_EXISTS",
  INVALID_NAME: "INVALID_FILE_NAME",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  STORAGE_ERROR: "STORAGE_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

export type FileOperationErrorCode = typeof FileOperationErrorCodes[keyof typeof FileOperationErrorCodes];

export const ValidationErrorCodes = {
  EMPTY_NAME: "ERR_EMPTY_NAME",
  LEADING_TRAILING_SPACES: "ERR_LEADING_TRAILING_SPACES",
  DOT_ONLY_NAME: "ERR_DOT_ONLY_NAME",
  NAME_TOO_LONG: "ERR_NAME_TOO_LONG",
  INVALID_CHARS: "ERR_INVALID_CHARS",
  RESERVED_NAME: "ERR_RESERVED_NAME",
  EMPTY_PATH: "ERR_EMPTY_PATH",
  PATH_TOO_LONG: "ERR_PATH_TOO_LONG",
  PATH_CONTAINS_DOTS: "ERR_PATH_CONTAINS_DOTS",
  EMPTY_ID: "ERR_EMPTY_ID",
  ID_TOO_LONG: "ERR_ID_TOO_LONG",
  INVALID_UUID: "ERR_INVALID_UUID",
  INVALID_EMAIL: "ERR_INVALID_EMAIL",
} as const; 