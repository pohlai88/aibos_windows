#!/usr/bin/env -S deno run --allow-read

/**
 * SSOT (Single Source of Truth) Registry for AI-BOS Platform
 * 
 * This module provides centralized access to the workspace canonical registry,
 * ensuring all scripts and modules use the same configuration source.
 */

import { readJsonFile } from './filesystem.ts';
import { logError, logInfo } from './logging.ts';

/**
 * Load the canonical workspace registry
 * @returns Promise<Record<string, unknown>> - The parsed workspace registry
 */
export async function loadCanonicalRegistry(): Promise<Record<string, unknown>> {
  try {
    const registry = await readJsonFile("workspace-canonical.json") as Record<string, unknown>;
    logInfo("✅ Successfully loaded canonical registry");
    return registry;
  } catch (error) {
    logError(`❌ Failed to load canonical registry: ${error}`);
    throw error;
  }
}

/**
 * Get specific section from the canonical registry
 * @param section - Section name to retrieve
 * @returns Promise<unknown> - The requested section
 */
export async function getRegistrySection(section: string): Promise<unknown> {
  try {
    const registry = await loadCanonicalRegistry();
    if (!registry[section]) {
      throw new Error(`Section '${section}' not found in registry`);
    }
    return registry[section];
  } catch (error) {
    logError(`❌ Failed to get registry section '${section}': ${error}`);
    throw error;
  }
}

/**
 * Get the workspace configuration from registry
 * @returns Promise<unknown> - Workspace configuration
 */
export async function getWorkspaceConfig(): Promise<unknown> {
  return await getRegistrySection("workspace");
}

/**
 * Get the file patterns from registry
 * @returns Promise<unknown> - File patterns configuration
 */
export async function getFilePatterns(): Promise<unknown> {
  return await getRegistrySection("filePatterns");
}

/**
 * Get the scripts configuration from registry
 * @returns Promise<unknown> - Scripts configuration
 */
export async function getScriptsConfig(): Promise<unknown> {
  return await getRegistrySection("scripts");
}

/**
 * Get the modules configuration from registry
 * @returns Promise<unknown> - Modules configuration
 */
export async function getModulesConfig(): Promise<unknown> {
  return await getRegistrySection("modules");
}

/**
 * Validate the canonical registry structure
 * @returns Promise<boolean> - true if registry is valid
 */
export async function validateRegistry(): Promise<boolean> {
  try {
    const registry = await loadCanonicalRegistry();
    
    // Check required sections
    const requiredSections = ["workspace", "filePatterns", "scripts", "modules"];
    for (const section of requiredSections) {
      if (!registry[section]) {
        logError(`❌ Missing required section: ${section}`);
        return false;
      }
    }
    
    logInfo("✅ Registry validation passed");
    return true;
  } catch (error) {
    logError(`❌ Registry validation failed: ${error}`);
    return false;
  }
}

/**
 * Get registry metadata
 * @returns Promise<Record<string, unknown>> - Registry metadata
 */
export async function getRegistryMetadata(): Promise<Record<string, unknown>> {
  try {
    const registry = await loadCanonicalRegistry();
    return {
      version: registry['version'] || "unknown",
      lastUpdated: registry['lastUpdated'] || "unknown",
      sections: Object.keys(registry),
      totalSections: Object.keys(registry).length
    };
  } catch (error) {
    logError(`❌ Failed to get registry metadata: ${error}`);
    throw error;
  }
} 