import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { writeFile } from "fs/promises";
import path from "path";
import { requireAdmin } from "../../../../utils/auth";

// Output JSON file path
const OUTPUT_JSON_PATH = path.join(process.cwd(), "data", "output.json");

export async function POST(request: NextRequest) {
  // Check admin authentication
  const admin = requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Starting data reset process...");

    // 1. Clear the output.json file first (this is known to work)
    await writeFile(OUTPUT_JSON_PATH, JSON.stringify([]));
    console.log("Successfully cleared output.json");

    // 2. Clear the database with enhanced error handling
    const dbClearResult = await clearDatabase();
    console.log("Database reset result:", dbClearResult);

    return NextResponse.json({
      success: true,
      message: "Database and output.json have been cleared successfully",
      details: {
        database: dbClearResult,
        outputJson: "Cleared",
      },
    });
  } catch (error) {
    console.error("Error resetting data:", error);
    return NextResponse.json(
      {
        error: "Failed to reset data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function clearDatabase() {
  const client = new Client({
    connectionString: process.env.NEONDB_URL,
  });

  try {
    console.log("Attempting to connect to database...");
    await client.connect();
    console.log("Successfully connected to database");

    // First check if we can actually connect and query the database
    try {
      const testResult = await client.query("SELECT NOW()");
      console.log("Database connection test successful:", testResult.rows[0]);
    } catch (testError) {
      console.error("Database connection test failed:", testError);
      throw new Error(
        `Database connection issue: ${
          testError instanceof Error ? testError.message : "Unknown error"
        }`
      );
    }

    // Check if the table exists
    console.log("Checking if cutoff_data table exists...");
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cutoff_data'
      );
    `);

    const tableExists = tableCheckResult.rows[0].exists;
    console.log(`Table exists: ${tableExists}`);

    if (tableExists) {
      // Get count before truncate for verification
      const countResult = await client.query(
        "SELECT COUNT(*) FROM cutoff_data"
      );
      const beforeCount = parseInt(countResult.rows[0].count);
      console.log(`Records before truncate: ${beforeCount}`);

      // Truncate the table to remove all records
      console.log("Truncating cutoff_data table...");
      await client.query("TRUNCATE TABLE cutoff_data CASCADE");

      // Verify the truncate worked
      const afterCountResult = await client.query(
        "SELECT COUNT(*) FROM cutoff_data"
      );
      const afterCount = parseInt(afterCountResult.rows[0].count);
      console.log(`Records after truncate: ${afterCount}`);

      if (afterCount > 0) {
        console.warn("Table was not completely truncated!");
        // Try with DELETE instead
        await client.query("DELETE FROM cutoff_data");
      }

      return {
        status: "Table cutoff_data truncated",
        recordsBefore: beforeCount,
        recordsAfter: afterCount,
      };
    } else {
      // Create an empty table
      console.log("Creating new cutoff_data table...");
      await client.query(`
        CREATE TABLE IF NOT EXISTS cutoff_data (
          id SERIAL PRIMARY KEY,
          college_id VARCHAR(50),
          college_name VARCHAR(255) NOT NULL,
          branch_id VARCHAR(50),
          branch_name VARCHAR(255) NOT NULL,
          status VARCHAR(100),
          category VARCHAR(50) NOT NULL,
          rank VARCHAR(50),
          percentile NUMERIC(10,7) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      return { status: "Table cutoff_data created empty" };
    }
  } catch (error) {
    console.error("Error clearing database:", error);
    throw error; // Re-throw to be caught by the calling function
  } finally {
    try {
      console.log("Closing database connection...");
      await client.end();
      console.log("Database connection closed");
    } catch (closeError) {
      console.error("Error closing database connection:", closeError);
    }
  }
}
