#!/usr/bin/env -S deno run --allow-read --allow-write

import * as path from "https://deno.land/std@0.208.0/path/mod.ts";
import { logError, logWarn, logInfo, logSuccess } from "./logging.ts";

/**
 * Unified FileSystem Utilities for AI-BOS Platform
 * 
 * This module provides centralized filesystem operations with proper error handling,
 * ensuring consistent file operations across all scripts, API modules, and the platform.
 */

/**
 * Find files matching a pattern (simplified glob implementation)
 * @param pattern - Glob pattern to match
 * @param baseDir - Base directory to search (defaults to current directory)
 * @returns Promise<string[]> - Array of matching file paths
 */
export async function findFilesByPattern(
  pattern: string, 
  baseDir: string = "."
): Promise<string[]> {
  const files: string[] = [];
  
  try {
    // Simple pattern matching for common cases
    if (pattern.includes("test-*.ts")) {
      for await (const entry of Deno.readDir(baseDir)) {
        if (entry.isFile && entry.name.startsWith("test-") && entry.name.endsWith(".ts")) {
          files.push(path.join(baseDir, entry.name));
        }
      }
    }
    
    if (pattern.includes("*-schema.sql")) {
      for await (const entry of Deno.readDir(baseDir)) {
        if (entry.isFile && entry.name.includes("schema") && entry.name.endsWith(".sql")) {
          files.push(path.join(baseDir, entry.name));
        }
      }
    }
    
    if (pattern.includes("temp-*.ts")) {
      for await (const entry of Deno.readDir(baseDir)) {
        if (entry.isFile && entry.name.startsWith("temp-") && entry.name.endsWith(".ts")) {
          files.push(path.join(baseDir, entry.name));
        }
      }
    }
    
    // Check subdirectories recursively
    for await (const entry of Deno.readDir(baseDir)) {
      if (entry.isDirectory && !entry.name.startsWith(".")) {
        const subDir = path.join(baseDir, entry.name);
        
        // Skip certain directories
        if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".turbo") {
          continue;
        }
        
        try {
          const subFiles = await findFilesByPattern(pattern, subDir);
          files.push(...subFiles);
        } catch {
          // Skip directories we can't read
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`❌ Error finding files by pattern "${pattern}": ${errorMessage}`);
  }
  
  return files;
}

/**
 * Safely remove a file or directory
 * @param target - Path to file or directory to remove
 * @param options - Removal options
 * @returns Promise<boolean> - true if removal was successful
 */
export async function safeRemove(
  target: string, 
  options: {
    recursive?: boolean;
    force?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<boolean> {
  const { recursive = false, force = false, dryRun = false } = options;
  
  try {
    // Check if target exists
    try {
      await Deno.stat(target);
    } catch {
      if (force) {
        return true; // Target doesn't exist, but force is enabled
      }
      logWarn(`⚠️ Target does not exist: ${target}`);
      return false;
    }
    
    if (dryRun) {
      logInfo(`🔍 [DRY RUN] Would remove: ${target}`);
      return true;
    }
    
    // Remove the target
    await Deno.remove(target, { recursive });
    logSuccess(`✅ Removed: ${target}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`❌ Failed to remove "${target}": ${errorMessage}`);
    return false;
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param dirPath - Path to directory to ensure
 * @returns Promise<boolean> - true if directory exists or was created
 */
export async function ensureDir(dirPath: string): Promise<boolean> {
  try {
    try {
      const stat = await Deno.stat(dirPath);
      if (stat.isDirectory) {
        return true; // Directory already exists
      } else {
        logError(`❌ Path exists but is not a directory: ${dirPath}`);
        return false;
      }
    } catch {
      // Directory doesn't exist, create it
      await Deno.mkdir(dirPath, { recursive: true });
      logSuccess(`✅ Created directory: ${dirPath}`);
      return true;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`❌ Failed to ensure directory "${dirPath}": ${errorMessage}`);
    return false;
  }
}

/**
 * Copy a file or directory
 * @param source - Source path
 * @param destination - Destination path
 * @param options - Copy options
 * @returns Promise<boolean> - true if copy was successful
 */
export async function copyFile(
  source: string,
  destination: string,
  options: {
    overwrite?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<boolean> {
  const { overwrite = false, dryRun = false } = options;
  
  try {
    // Check if source exists
    try {
      await Deno.stat(source);
    } catch {
      logError(`❌ Source does not exist: ${source}`);
      return false;
    }
    
    // Check if destination exists
    let destExists = false;
    try {
      await Deno.stat(destination);
      destExists = true;
    } catch {
      // Destination doesn't exist, which is fine
    }
    
    if (destExists && !overwrite) {
      logError(`❌ Destination exists and overwrite is disabled: ${destination}`);
      return false;
    }
    
    if (dryRun) {
      logInfo(`🔍 [DRY RUN] Would copy: ${source} → ${destination}`);
      return true;
    }
    
    // Copy the file/directory
    await Deno.copyFile(source, destination);
    logSuccess(`✅ Copied: ${source} → ${destination}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`❌ Failed to copy "${source}" to "${destination}": ${errorMessage}`);
    return false;
  }
}

/**
 * Move a file or directory
 * @param source - Source path
 * @param destination - Destination path
 * @param options - Move options
 * @returns Promise<boolean> - true if move was successful
 */
export async function moveFile(
  source: string,
  destination: string,
  options: {
    overwrite?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<boolean> {
  const { overwrite = false, dryRun = false } = options;
  
  try {
    // Check if source exists
    try {
      await Deno.stat(source);
    } catch {
      logError(`❌ Source does not exist: ${source}`);
      return false;
    }
    
    // Check if destination exists
    let destExists = false;
    try {
      await Deno.stat(destination);
      destExists = true;
    } catch {
      // Destination doesn't exist, which is fine
    }
    
    if (destExists && !overwrite) {
      logError(`❌ Destination exists and overwrite is disabled: ${destination}`);
      return false;
    }
    
    if (dryRun) {
      logInfo(`🔍 [DRY RUN] Would move: ${source} → ${destination}`);
      return true;
    }
    
    // Move the file/directory
    await Deno.rename(source, destination);
    logSuccess(`✅ Moved: ${source} → ${destination}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`❌ Failed to move "${source}" to "${destination}": ${errorMessage}`);
    return false;
  }
}

/**
 * Read a JSON file
 * @param filePath - Path to the JSON file
 * @returns Promise<unknown> - Parsed JSON content
 */
export async function readJsonFile(filePath: string): Promise<unknown> {
  try {
    const content = await Deno.readTextFile(filePath);
    return JSON.parse(content);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`❌ Failed to read JSON file "${filePath}": ${errorMessage}`);
    throw error;
  }
}

/**
 * Write a JSON file
 * @param filePath - Path to the JSON file
 * @param data - Data to write
 * @param options - Write options
 * @returns Promise<boolean> - true if write was successful
 */
export async function writeJsonFile(
  filePath: string, 
  data: unknown, 
  options: {
    pretty?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<boolean> {
  const { pretty = true, dryRun = false } = options;
  
  try {
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    
    if (dryRun) {
      logInfo(`🔍 [DRY RUN] Would write JSON file: ${filePath}`);
      return true;
    }
    
    await Deno.writeTextFile(filePath, content);
    logSuccess(`✅ Wrote JSON file: ${filePath}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`❌ Failed to write JSON file "${filePath}": ${errorMessage}`);
    return false;
  }
}

/**
 * Get file size in bytes
 * @param filePath - Path to the file
 * @returns Promise<number> - File size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stat = await Deno.stat(filePath);
    return stat.size;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`❌ Failed to get file size for "${filePath}": ${errorMessage}`);
    return 0;
  }
}

/**
 * Check if a file exists
 * @param filePath - Path to the file
 * @returns Promise<boolean> - true if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(filePath);
    return stat.isFile;
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists
 * @param dirPath - Path to the directory
 * @returns Promise<boolean> - true if directory exists
 */
export async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(dirPath);
    return stat.isDirectory;
  } catch {
    return false;
  }
}

/**
 * Get all files in a directory
 * @param dirPath - Path to the directory
 * @returns Promise<string[]> - Array of file paths
 */
export async function getFilesInDir(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    for await (const entry of Deno.readDir(dirPath)) {
      if (entry.isFile) {
        files.push(path.join(dirPath, entry.name));
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`❌ Failed to get files in directory "${dirPath}": ${errorMessage}`);
  }
  
  return files;
}

/**
 * Get all directories in a directory
 * @param dirPath - Path to the directory
 * @returns Promise<string[]> - Array of directory paths
 */
export async function getDirsInDir(dirPath: string): Promise<string[]> {
  const dirs: string[] = [];
  
  try {
    for await (const entry of Deno.readDir(dirPath)) {
      if (entry.isDirectory) {
        dirs.push(path.join(dirPath, entry.name));
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`❌ Failed to get directories in "${dirPath}": ${errorMessage}`);
  }
  
  return dirs;
}

/**
 * Read a text file
 * @param filePath - Path to the text file
 * @returns Promise<string> - File content
 */
export async function readTextFile(filePath: string): Promise<string> {
  try {
    return await Deno.readTextFile(filePath);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`❌ Failed to read text file "${filePath}": ${errorMessage}`);
    throw error;
  }
}

/**
 * Write a text file
 * @param filePath - Path to the text file
 * @param content - Content to write
 * @returns Promise<boolean> - true if write was successful
 */
export async function writeTextFile(filePath: string, content: string): Promise<boolean> {
  try {
    await Deno.writeTextFile(filePath, content);
    logSuccess(`✅ Wrote text file: ${filePath}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`❌ Failed to write text file "${filePath}": ${errorMessage}`);
    return false;
  }
}

/**
 * Get current working directory
 * @returns string - Current working directory
 */
export function getCurrentDir(): string {
  return Deno.cwd();
}

/**
 * Resolve a relative path to absolute
 * @param relativePath - Relative path to resolve
 * @returns string - Absolute path
 */
export function resolvePath(relativePath: string): string {
  return path.resolve(relativePath);
} 