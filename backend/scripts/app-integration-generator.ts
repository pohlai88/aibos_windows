#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

import { supabase } from '../modules/supabase-client.ts';
import { writeTextFile } from '../modules/filesystem.ts';
import { logInfo, logWarn, logSuccess } from '../modules/logging.ts';

interface ScaffoldConfig {
  appsRoot: string;
  dryRun: boolean;
}

function promptInput(message: string): string {
  return prompt(message) ?? '';
}

function exitWithError(message: string): never {
  console.error(`\n❌ ${message}`);
  Deno.exit(1);
}

async function main() {
  const start = Date.now();

  const config: ScaffoldConfig = {
    appsRoot: 'apps',
    dryRun: Deno.args.includes('--dry-run')
  };

  logInfo('🚀 AIBOS App Integration Generator');

  // Gather app details
  const name = promptInput('App Name:');
  const slug = promptInput('App Slug (unique, lowercase, hyphens):');
  const description = promptInput('Short Description:');
  const categorySlug = promptInput('Category slug (e.g. productivity, utilities):');
  const authorEmail = promptInput('Author Email (optional):');

  // Check for duplicate slugs
  const { data: existing, error: slugError } = await supabase
    .from('apps')
    .select('id')
    .eq('slug', slug)
    .single();

  if (slugError && slugError.code !== 'PGRST116') {
    await exitWithError(`Supabase error checking slug: ${slugError.message}`);
  }

  if (existing) {
    await exitWithError(`App with slug "${slug}" already exists.`);
  }

  // Find category
  const { data: category, error: categoryError } = await supabase
    .from('app_categories')
    .select('id')
    .eq('slug', categorySlug)
    .single();

  if (categoryError || !category) {
    await exitWithError(`Category "${categorySlug}" not found.`);
  }

  // Lookup author
  let authorId = null;
  if (authorEmail) {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', authorEmail)
      .single();

    if (user) {
      authorId = user.id;
      logSuccess(`Found author: ${authorEmail}`);
    } else {
      logWarn(`Author "${authorEmail}" not found. Proceeding without author_id.`);
    }
  }

  // Register app
  let app;
  if (!config.dryRun) {
    if (!category) {
      await exitWithError(`Category not found.`);
    }
    const categoryId = category!.id;
    const { data, error } = await supabase
      .from('apps')
      .insert({
        name,
        slug,
        description,
        category_id: categoryId,
        author_id: authorId,
        status: 'draft',
        is_free: true,
        is_featured: false,
        is_verified: false
      })
      .select()
      .single();

    if (error) {
      await exitWithError(`Failed to register app: ${error.message}`);
    }

    app = data;
    logSuccess(`App registered in Supabase: ID ${app.id}`);
  } else {
    logWarn('Dry-run mode: skipping Supabase insertion.');
    app = { id: 'dry-run-id' };
  }

  const appDir = `${config.appsRoot}/${slug}`;

  if (!config.dryRun) {
    await Deno.mkdir(appDir, { recursive: true });
    logSuccess(`Created app directory: ${appDir}`);
  }

  // Supabase service file
  const serviceCode = `
import { supabase } from '../../modules/supabase-client.ts';

export async function getAppData(tenantId: string) {
  const { data, error } = await supabase
    .from('app_data')
    .select('*')
    .eq('app_id', '${app.id}')
    .eq('tenant_id', tenantId);
  if (error) throw error;
  return data;
}
`;

  const typeDefs = `
export interface AppData {
  id: string;
  tenant_id: string;
  key: string;
  value: any;
  created_at: string;
}
`;

  const readme = `
# ${name}

${description}

## Supabase Integration

- App ID: ${app.id}
- Slug: ${slug}
- Category: ${categorySlug}

This app is scaffolded for direct integration with the AIBOS platform.

### Row-Level Security

Ensure this policy exists:

\`\`\`sql
CREATE POLICY "Tenant can access own app data"
  ON app_data
  FOR SELECT
  USING (tenant_id = auth.uid());
\`\`\`
`;

  if (!config.dryRun) {
    await writeTextFile(`${appDir}/supabase-service.ts`, serviceCode);
    await writeTextFile(`${appDir}/index.ts`, `export * from './supabase-service.ts';`);
    await writeTextFile(`${appDir}/types.ts`, typeDefs);
    await writeTextFile(`${appDir}/README.md`, readme);
    logSuccess('Scaffold files written.');
  } else {
    logWarn('Dry-run mode: would write scaffold files.');
  }

  const duration = Date.now() - start;
  logSuccess(`App integration scaffolded in ${duration}ms`);
}

if (import.meta.main) {
  await main();
}
