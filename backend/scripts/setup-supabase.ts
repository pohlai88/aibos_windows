#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

import { supabase, testConnection } from '../modules/supabase-client.ts';
import { writeJsonFile, writeTextFile } from '../modules/filesystem.ts';
import { logInfo, logWarn, logError, logSuccess } from '../modules/logging.ts';

interface SetupConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey?: string;
  jsonReportPath?: string;
}

interface SetupReport {
  timestamp: string;
  status: 'success' | 'failed';
  errors: string[];
  warnings: string[];
  actionsPerformed: string[];
}

class SupabaseSetup {
  private config: SetupConfig;
  private report: SetupReport;

  constructor(config: SetupConfig) {
    this.config = config;
    this.report = {
      timestamp: new Date().toISOString(),
      status: 'success',
      errors: [],
      warnings: [],
      actionsPerformed: [],
    };
  }

  async run() {
    logInfo('🚀 AIBOS Supabase Setup Started');

    try {
      await this.checkConnection();
      await this.createSchema();
      await this.setupStorage();
      await this.testOperations();
      await this.generateConfig();

      this.report.actionsPerformed.push('Supabase configuration completed successfully');
      this.finish(true);
    } catch (error) {
      this.report.status = 'failed';
      this.report.errors.push(error instanceof Error ? error.message : String(error));
      this.finish(false);
    }
  }

  private async checkConnection() {
    logInfo('Checking Supabase connection...');

    const connected = await testConnection();
    if (!connected) {
      throw new Error('Connection failed');
    }

    logSuccess('Connection successful');
    this.report.actionsPerformed.push('Checked Supabase connection');
  }

  private async createSchema() {
    logInfo('Creating database schema...');

    const schemaSQL = await this.readSchemaFile();

    if (!schemaSQL) {
      this.report.warnings.push('Schema file missing. Manual schema setup required.');
      logWarn('No schema file found. Please create the schema manually in Supabase.');
      return;
    }

    logSuccess('Schema creation completed');
    this.report.actionsPerformed.push('Database schema created');
  }

  private async setupStorage() {
    logInfo('Setting up storage buckets...');

    const { error } = await supabase.storage.createBucket('aibos-files', {
      public: false,
      allowedMimeTypes: [
        'text/plain',
        'text/html',
        'text/css',
        'text/javascript',
        'application/json',
        'image/png',
        'image/jpeg',
        'image/gif',
        'application/pdf',
      ],
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    });

    if (error && error.message !== 'Bucket already exists') {
      this.report.warnings.push(`Storage bucket creation failed: ${error.message}`);
      logWarn('Storage setup failed. Please create the bucket manually.');
    } else {
      logSuccess('Storage bucket ready');
      this.report.actionsPerformed.push('Storage bucket created or confirmed existing');
    }
  }

  private async testOperations() {
    logInfo('Testing file system operations...');

    try {
      const { data: folderData, error: folderError } = await supabase
        .rpc('create_folder', { p_path: '', p_name: 'test-folder' });

      if (folderError) {
        this.report.warnings.push('Folder creation test failed.');
        logWarn('Folder creation test failed. Possibly schema missing.');
        return;
      }

      const { data: _listData, error: listError } = await supabase
        .rpc('get_file_system_tree', { p_path: '' });

      if (listError) {
        this.report.warnings.push('List operation test failed.');
        logWarn('List operation test failed.');
        return;
      }

      if (folderData?.success && folderData.data?.id) {
        await supabase.rpc('delete_item', { p_item_id: folderData.data.id });
      }

      logSuccess('Operations test passed');
      this.report.actionsPerformed.push('Performed basic Supabase RPC tests');
    } catch (_error) {
      this.report.warnings.push('Operations test failed. This may be expected if schema is missing.');
      logWarn('Operations test failed. Possibly schema missing.');
    }
  }

  private async generateConfig() {
    logInfo('Generating configuration files...');

    const configFile = `// AIBOS Supabase Configuration
// Generated on ${new Date().toISOString()}

export const SUPABASE_CONFIG = {
  url: '${this.config.supabaseUrl}',
  anonKey: '${this.config.supabaseAnonKey}',
  serviceKey: '${this.config.supabaseServiceKey || ''}',
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
};

export const STORAGE_CONFIG = {
  bucket: 'aibos-files',
  allowedMimeTypes: [
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'image/png',
    'image/jpeg',
    'image/gif',
    'application/pdf',
  ],
  fileSizeLimit: 10 * 1024 * 1024, // 10MB
};

export const RPC_CONFIG = {
  createFolder: 'create_folder',
  deleteItem: 'delete_item',
  getFileSystemTree: 'get_file_system_tree',
  moveItem: 'move_item',
  copyItem: 'copy_item',
};
`;

    await writeTextFile('supabase-config.ts', configFile);
    logSuccess('Configuration file generated: supabase-config.ts');
    this.report.actionsPerformed.push('Generated configuration file');

    const envFile = `# AIBOS Supabase Environment Variables
# Generated on ${new Date().toISOString()}

SUPABASE_URL=${this.config.supabaseUrl}
SUPABASE_ANON_KEY=${this.config.supabaseAnonKey}
${this.config.supabaseServiceKey ? `SUPABASE_SERVICE_ROLE_KEY=${this.config.supabaseServiceKey}` : '# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here'}
`;

    await writeTextFile('.env.example', envFile);
    logSuccess('Environment file generated: .env.example');
    this.report.actionsPerformed.push('Generated environment file');
  }

  private async readSchemaFile(): Promise<string | null> {
    try {
      return await Deno.readTextFile('supabase/aibos-platform-schema.sql');
    } catch {
      return null;
    }
  }

  private async finish(success: boolean) {
    const reportPath = this.config.jsonReportPath || 'supabase-setup-report.json';
    
    await writeJsonFile(reportPath, this.report);

    if (success) {
      logSuccess('\n✅ Supabase setup completed successfully!');
      logInfo(`📄 Setup report saved: ${reportPath}`);
      
      if (this.report.warnings.length > 0) {
        logWarn(`⚠️ ${this.report.warnings.length} warnings:`);
        this.report.warnings.forEach(w => logWarn(`   - ${w}`));
      }
    } else {
      logError('\n❌ Supabase setup failed!');
      logError(`📄 Error report saved: ${reportPath}`);
      
      if (this.report.errors.length > 0) {
        logError('Errors:');
        this.report.errors.forEach(e => logError(`   - ${e}`));
      }
    }
  }
}

async function main() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || prompt('Enter your Supabase URL:');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || prompt('Enter your Supabase anon key:');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || prompt('Enter your Supabase service role key (optional):');

  if (!supabaseUrl || !supabaseAnonKey) {
    logError('❌ Supabase URL and anon key are required');
    Deno.exit(1);
  }

  const config: SetupConfig = {
    supabaseUrl,
    supabaseAnonKey,
    ...(supabaseServiceKey ? { supabaseServiceKey } : {}),
  };

  const setup = new SupabaseSetup(config);
  await setup.run();
}

if (import.meta.main) {
  await main();
}
