// Check if onboarding tables exist in Supabase
const https = require('https');

const SUPABASE_URL = 'https://uaaqipfytzrjomofsbwd.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhYXFpcGZ5dHpyam9tb2ZzYndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNjg0MjgsImV4cCI6MjA2Mzk0NDQyOH0.XrDpeFjCT_LN7N-7V2OoU8FY0B5wCLQHXXyOTGnfyeU';

const tablesToCheck = [
  'profiles',
  'diet_preferences',
  'body_analysis',
  'workout_preferences',
  'advanced_review',
  'onboarding_progress'
];

async function checkTable(tableName) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'uaaqipfytzrjomofsbwd.supabase.co',
      path: `/rest/v1/${tableName}?limit=0`,
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Table "${tableName}" EXISTS`);
          resolve({ table: tableName, exists: true });
        } else if (res.statusCode === 404 || (res.statusCode >= 400 && data.includes('relation') && data.includes('does not exist'))) {
          console.log(`❌ Table "${tableName}" DOES NOT EXIST`);
          resolve({ table: tableName, exists: false });
        } else {
          console.log(`⚠️  Table "${tableName}": Status ${res.statusCode} - ${data.substring(0, 100)}`);
          resolve({ table: tableName, exists: false, error: data });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Error checking "${tableName}":`, error.message);
      resolve({ table: tableName, exists: false, error: error.message });
    });

    req.setTimeout(10000, () => {
      console.log(`⏱️  Timeout checking "${tableName}"`);
      req.destroy();
      resolve({ table: tableName, exists: false, error: 'timeout' });
    });

    req.end();
  });
}

async function main() {
  console.log('🔍 Checking Onboarding Tables in Supabase...\n');
  console.log(`Project: ${SUPABASE_URL}\n`);

  const results = [];
  for (const table of tablesToCheck) {
    const result = await checkTable(table);
    results.push(result);
  }

  console.log('\n📊 Summary:');
  const existing = results.filter(r => r.exists);
  const missing = results.filter(r => !r.exists);

  console.log(`✅ Existing tables: ${existing.length}/${tablesToCheck.length}`);
  if (existing.length > 0) {
    existing.forEach(r => console.log(`   - ${r.table}`));
  }

  console.log(`❌ Missing tables: ${missing.length}/${tablesToCheck.length}`);
  if (missing.length > 0) {
    missing.forEach(r => console.log(`   - ${r.table}`));
  }

  if (missing.length > 0) {
    console.log('\n🚨 ACTION REQUIRED: Create missing database tables!');
  } else {
    console.log('\n✅ All onboarding tables exist!');
  }
}

main();
