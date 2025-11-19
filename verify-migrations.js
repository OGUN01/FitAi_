const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mqfrwtmkokivoxgukgsz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjkxMTg4NywiZXhwIjoyMDY4NDg3ODg3fQ.GodrW37wQvrL30QB26acYRYOiiAltyw3pXHXL4Xvxis';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verify() {
  console.log('🔍 Verifying FitAI Migrations...\n');

  // Check tables
  console.log('📊 Checking Tables:');
  const tables = ['workout_cache', 'meal_cache', 'exercise_media', 'diet_media', 'api_logs', 'generation_history'];

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (!error) {
      console.log(`   ✅ ${table.padEnd(20)} (${count} rows)`);
    } else {
      console.log(`   ❌ ${table.padEnd(20)} - ${error.message}`);
    }
  }

  // Check cache stats function
  console.log('\n📈 Testing Helper Functions:');
  const { data: stats, error: statsError } = await supabase.rpc('get_cache_stats');
  if (!statsError && stats) {
    console.log('   ✅ get_cache_stats() working');
    stats.forEach(s => console.log(`      - ${s.table_name}: ${s.total_entries} entries`));
  } else {
    console.log('   ⚠️  get_cache_stats() - ' + (statsError?.message || 'checking...'));
  }

  console.log('\n✅ Migration verification complete!\n');
}

verify();
