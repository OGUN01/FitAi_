const { createClient } = require("@supabase/supabase-js");

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error("SUPABASE_URL environment variable is required");
}
if (!supabaseAnonKey) {
  throw new Error("SUPABASE_ANON_KEY environment variable is required");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function queryDB() {
  try {
    // Count tables in public schema
    const { data: tables, error: tablesError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public");

    if (tablesError) {
      console.log("Tables error:", tablesError);
    } else {
      console.log("Number of tables:", tables.length);
      console.log(
        "Tables:",
        tables.map((t) => t.table_name),
      );
    }

    // Count users (profiles)
    const { count: userCount, error: userError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (userError) {
      console.log("Users error:", userError);
    } else {
      console.log("Number of user profiles:", userCount);
    }
  } catch (error) {
    console.log("Error:", error);
  }
}

queryDB();
