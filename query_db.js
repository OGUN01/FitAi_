const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mqfrwtmkokivoxgukgsz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTE4ODcsImV4cCI6MjA2ODQ4Nzg4N30.8As2juloSC89Pjql1_85757e8z4uGUqQHuzhVCY7M08';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function queryDB() {
  try {
    // Count tables in public schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.log('Tables error:', tablesError);
    } else {
      console.log('Number of tables:', tables.length);
      console.log('Tables:', tables.map(t => t.table_name));
    }

    // Count users (profiles)
    const { count: userCount, error: userError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (userError) {
      console.log('Users error:', userError);
    } else {
      console.log('Number of user profiles:', userCount);
    }

  } catch (error) {
    console.log('Error:', error);
  }
}

queryDB();
