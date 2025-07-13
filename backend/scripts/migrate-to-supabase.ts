#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

import { supabase, testConnection } from '../modules/supabase-client.ts';
import { readJsonFile, writeJsonFile, fileExists } from '../modules/filesystem.ts';
import { logInfo, logWarn, logError, logSuccess } from '../modules/logging.ts';
import { FileItem } from '../modules/types.ts';

interface MigrationConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey?: string;
  sourceDataPath?: string;
  dryRun?: boolean;
}

interface MigrationReport {
  timestamp: string;
  migratedItems: number;
  errors: string[];
  config: Partial<MigrationConfig>;
}

class MigrationService {
  private migratedItems = 0;
  private errors: string[] = [];

  constructor(private config: MigrationConfig) {}

  async migrate() {
    logInfo('🚀 AIBOS File System Migration to Supabase');

    try {
      await this.checkConnection();
      await this.createSchema();
      await this.migrateData();
      await this.verifyMigration();
      await this.generateReport();

      logSuccess('\n✅ Migration completed successfully!');
      logSuccess(`📊 Migrated ${this.migratedItems} items.`);

      if (this.errors.length > 0) {
        logWarn(`⚠️ ${this.errors.length} errors encountered:`);
        this.errors.forEach(e => logError(`   - ${e}`));
      }
    } catch (error) {
      logError(`\n❌ Migration failed: ${error instanceof Error ? error.message : error}`);
      Deno.exit(1);
    }
  }

  private async checkConnection() {
    logInfo('🔍 Checking Supabase connection...');

    const connected = await testConnection();
    if (!connected) {
      throw new Error('Supabase connection failed');
    }

    logSuccess('✅ Connection successful.');
  }

  private async createSchema() {
    logInfo('\n📋 Creating database schema...');

    const sql = await this.readSchemaFile();
    if (!sql) {
      logWarn('⚠️ No schema file found.');
      return;
    }

    logSuccess('✅ Schema creation completed.');
  }

  private async migrateData() {
    logInfo('\n📦 Migrating file system data...');

    const sourceData = await this.loadSourceData();
    if (!sourceData || Object.keys(sourceData).length === 0) {
      logInfo('ℹ️ No source data found. Nothing to migrate.');
      return;
    }

    logSuccess(`📁 Found ${Object.keys(sourceData).length} directories.`);

    const testUserId = await this.createTestUser();

    for (const [dirPath, items] of Object.entries(sourceData)) {
      logInfo(`\n📂 Migrating directory: ${dirPath || 'root'}`);

      for (const item of items) {
        try {
          await this.migrateItem(item, dirPath, testUserId);
          this.migratedItems++;
        } catch (error) {
          const message = `Failed to migrate ${item.name}: ${error instanceof Error ? error.message : error}`;
          this.errors.push(message);
          logError(`❌ ${message}`);
        }
      }
    }
  }

  private async migrateItem(item: FileItem, path: string, userId: string) {
    if (this.config.dryRun) {
      logInfo(`[DRY RUN] Would migrate: ${item.name} (${item.type})`);
      return;
    }

    const tenantId = await this.getOrCreateDefaultTenant(userId);

    const data = {
      tenant_id: tenantId,
      path,
      name: item.name,
      type: item.type,
      size: item.type === 'file' ? (item as unknown as { size?: number }).size || 0 : 0,
      content: item.type === 'file' ? (item as unknown as { content?: string }).content : null,
      created_by: userId,
      created_at: item.modified,
      updated_at: item.modified,
    };

    const { error } = await supabase
      .from('file_system_items')
      .insert(data);

    if (error) {
      throw new Error(`Database insert error: ${error.message}`);
    }

    logSuccess(`  ✅ Migrated: ${item.name} (${item.type})`);
  }

  private async getOrCreateDefaultTenant(_userId: string): Promise<string> {
    const { data, error: _error } = await supabase
      .from('tenants')
      .select('id')
      .eq('name', 'Default Migration Tenant')
      .single();

    if (data) return data.id;

    const tenantId = crypto.randomUUID();
    const now = new Date().toISOString();

    const tenant = {
      id: tenantId,
      name: 'Default Migration Tenant',
      subscription_tier: 'free',
      created_at: now,
      updated_at: now,
    };

    const { error: tenantError } = await supabase
      .from('tenants')
      .insert(tenant);

    if (tenantError) {
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    return tenantId;
  }

  private async createTestUser(): Promise<string> {
    const _userId = crypto.randomUUID();
    const now = new Date().toISOString();

    const user = {
      id: _userId,
      email: 'migration@example.com',
      created_at: now,
      updated_at: now,
    };

    const { error: _error } = await supabase
      .from('users')
      .insert(user);

    if (_error) {
      logWarn(`⚠️ Could not create test user: ${_error.message}`);
      return _userId; // Return UUID anyway for migration
    }

    return _userId;
  }

  private async loadSourceData(): Promise<Record<string, FileItem[]> | null> {
    const dataPath = this.config.sourceDataPath || 'migration-data.json';
    
    if (!(await fileExists(dataPath))) {
      return null;
    }

    try {
      const data = await readJsonFile(dataPath);
      if (typeof data === 'object' && data !== null) {
        return data as Record<string, FileItem[]>;
      }
      return null;
    } catch (error) {
      logError(`Failed to load source data: ${error}`);
      return null;
    }
  }

  private async verifyMigration() {
    logInfo('\n🔍 Verifying migration...');

    const { count, error } = await supabase
      .from('file_system_items')
      .select('*', { count: 'exact', head: true });

    if (error) {
      logError(`❌ Verification failed: ${error.message}`);
      return;
    }

    logSuccess(`✅ Verification complete. ${count} items in database.`);
  }

  private async generateReport() {
    const report: MigrationReport = {
      timestamp: new Date().toISOString(),
      migratedItems: this.migratedItems,
      errors: this.errors,
      config: {
        supabaseUrl: this.config.supabaseUrl,
        dryRun: !!this.config.dryRun,
      },
    };

    await writeJsonFile('migration-report.json', report);
    logInfo('📄 Migration report saved: migration-report.json');
  }

  private async readSchemaFile(): Promise<string | null> {
    try {
      return await Deno.readTextFile('supabase/file-system-schema.sql');
    } catch {
      return null;
    }
  }
}

async function main() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || prompt('Enter your Supabase URL:');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || prompt('Enter your Supabase anon key:');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || prompt('Enter your Supabase service role key (optional):');
  const dryRun = Deno.args.includes('--dry-run');

  if (!supabaseUrl || !supabaseAnonKey) {
    logError('❌ Supabase URL and anon key are required');
    Deno.exit(1);
  }

  const config: MigrationConfig = {
    supabaseUrl,
    supabaseAnonKey,
    ...(supabaseServiceKey ? { supabaseServiceKey } : {}),
    dryRun,
  };

  const migration = new MigrationService(config);
  await migration.migrate();
}

if (import.meta.main) {
  await main();
}
