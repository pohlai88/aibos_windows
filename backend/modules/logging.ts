/// <reference lib="deno.ns" />

/**
 * Deno Server Logging Module
 * Lightweight, server-side logging for AI-BOS Deno deployment
 * Separate from EnterpriseLogger (browser/client logging)
 */

// Simple log levels for server operations
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// Server-specific log context
interface ServerLogContext {
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

// Deno-compatible environment detection
function isDevelopment(): boolean {
  return Deno.env.get('DENO_ENV') === 'development' || 
         Deno.env.get('NODE_ENV') === 'development' ||
         Deno.env.get('ENVIRONMENT') === 'development';
}

// Simple console logging for Deno server
function logToConsole(level: LogLevel, message: string, context?: ServerLogContext): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (context?.component) {
    console.log(`${prefix} [${context.component}] ${message}`, context.metadata || '');
  } else {
    console.log(`${prefix} ${message}`, context?.metadata || '');
  }
}

// Main logging functions for server operations
export function logInfo(message: string, context?: ServerLogContext): void {
  if (isDevelopment()) {
    logToConsole('info', message, context);
  }
}

export function logWarn(message: string, context?: ServerLogContext): void {
  logToConsole('warn', message, context);
}

export function logError(message: string, context?: ServerLogContext): void {
  logToConsole('error', message, context);
  
  // In production, could send to external monitoring service
  if (!isDevelopment()) {
    // TODO: Implement production error reporting
    // Example: Send to Supabase, external logging service, etc.
  }
}

export function logSuccess(message: string, context?: ServerLogContext): void {
  logToConsole('info', `✅ ${message}`, context);
}

export function logDebug(message: string, context?: ServerLogContext): void {
  if (isDevelopment()) {
    logToConsole('debug', message, context);
  }
} 