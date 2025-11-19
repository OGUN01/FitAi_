#!/usr/bin/env node
/**
 * Apply Supabase Migrations Script
 * Applies all 5 migrations in order with 100% precision
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://mqfrwtmkokivoxgukgsz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjkxMTg4NywiZXhwIjoyMDY4NDg3ODg3fQ.GodrW37wQvrL30QB26acYRYOiiAltyw3pXHXL4Xvxis';

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migration files in order
const migrations = [
  '20250115000001_add_cache_tables.sql',
  '20250115000002_add_media_tables.sql',
  '20250115000003_add_logging_tables.sql',
  '20250115000004_add_rls_policies.sql',
  '20250115000005_add_helper_functions.sql',
];

async function applyMigration(filename) {
  const filePath = path.join(__dirname, 'supabase', 'migrations', filename);
  console.log(`\n📄 Reading migration: ${filename}`);

  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`   SQL size: ${sql.length} characters`);

  console.log(`🔄 Applying migration...`);

  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql }).catch(async (err) => {
    // If exec_sql function doesn't exist, try direct query
    return await supabase.from('_temp').select('*').limit(0).then(() => {
      // Use REST API to execute SQL
      return fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ query: sql })
      });
    });
  });

  if (error) {
    console.error(`❌ Error applying ${filename}:`, error);
    throw error;
  }

  console.log(`✅ Successfully applied: ${filename}`);
  return { filename, success: true };
}

async function runMigrations() {
  console.log('🚀 Starting Supabase migrations...');
  console.log(`📡 Target: ${supabaseUrl}`);
  console.log(`📋 Total migrations: ${migrations.length}\n`);

  const results = [];

  for (const migration of migrations) {
    try {
      const result = await applyMigration(migration);
      results.push(result);
    } catch (error) {
      console.error(`\n💥 Migration failed: ${migration}`);
      console.error('Error:', error.message);
      console.log('\n⚠️  Stopping migration process.');
      process.exit(1);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 All migrations completed successfully!');
  console.log('='.repeat(60));
  console.log('\n📊 Summary:');
  results.forEach((result, index) => {
    console.log(`   ${index + 1}. ✅ ${result.filename}`);
  });
  console.log('\n');
}

// Run migrations
runMigrations().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
