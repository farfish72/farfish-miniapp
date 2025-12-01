/**
 * Migration Runner Script
 * 
 * Runs SQL migrations against Supabase database.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 * 
 * Usage:
 *   RUN_MIGRATIONS=yes npx tsx scripts/run-migrations.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RUN_MIGRATIONS = process.env.RUN_MIGRATIONS;

async function runMigrations() {
  if (RUN_MIGRATIONS !== "yes") {
    console.log("⏭️  RUN_MIGRATIONS is not set to 'yes'. Skipping migrations.");
    console.log("   Set RUN_MIGRATIONS=yes to enable automatic migrations.");
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  console.log("🚀 Starting migrations...");
  console.log(`   Database: ${SUPABASE_URL.replace(/\/\/.*@/, "//***@")}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Read migration file
  const migrationPath = join(process.cwd(), "migrations", "001_rpcs.sql");
  const migrationSQL = readFileSync(migrationPath, "utf-8");

  console.log("📄 Reading migration file: migrations/001_rpcs.sql");

  // Execute migration in a transaction
  try {
    console.log("🔄 Executing migration...");
    
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: migrationSQL,
    });

    if (error) {
      // Fallback: try direct SQL execution via REST API
      console.log("   Attempting direct SQL execution...");
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ sql: migrationSQL }),
      });

      if (!response.ok) {
        throw new Error(
          `Migration failed: ${response.status} ${response.statusText}\n` +
          `Note: Direct SQL execution via REST may not be available.\n` +
          `Please run migrations manually via Supabase Dashboard SQL Editor.`
        );
      }

      const result = await response.json();
      console.log("✅ Migration executed successfully via REST API");
      return;
    }

    console.log("✅ Migration executed successfully");
  } catch (error: any) {
    console.error("❌ Migration failed:");
    console.error(error.message);
    console.error("\n💡 Recommendation: Run migrations manually via Supabase Dashboard SQL Editor.");
    console.error("   Copy the contents of migrations/001_rpcs.sql and execute it.");
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("\n✨ Migration process completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Migration process failed:", error.message);
      process.exit(1);
    });
}

export default runMigrations;

