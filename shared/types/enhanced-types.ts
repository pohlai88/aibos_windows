/**
 * Enhanced Type Utilities for AI-BOS Platform
 * Provides strict type safety with runtime validation
 */

// Generic utility types
export type NonNullable<T> = T extends null | undefined ? never : T;
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Result types for better error handling
export type Result<T, E = Error> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Enhanced component prop types
export interface BaseComponentProps {
  className?: string;
  'data-testid'?: string;
  children?: React.ReactNode;
}

export interface ComponentWithId extends BaseComponentProps {
  id: string;
}

// Memory management types
export interface CleanupFunction {
  (): void;
}

export interface MemoryTracker {
  track<T>(resource: T, cleanup: CleanupFunction): T;
  cleanup(): void;
  getActiveResources(): number;
}

// Enhanced validation schemas
export interface ValidationSchema<T> {
  parse(input: unknown): Result<T, ValidationError>;
  safeParse(input: unknown): T | null;
  validate(input: unknown): boolean;
}

export interface ValidationError {
  message: string;
  path: string[];
  code: string;
}

// Type guards
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) return false;
  if (!itemGuard) return true;
  return value.every(itemGuard);
}

// Runtime type validation
export function createValidator<T>(schema: ValidationSchema<T>) {
  return {
    parse: (input: unknown): T => {
      const result = schema.parse(input);
      if (!result.success) {
        throw new Error(`Validation failed: ${result.error.message}`);
      }
      return result.data;
    },
    safeParse: schema.safeParse,
    validate: schema.validate
  };
} 