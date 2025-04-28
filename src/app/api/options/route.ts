import { NextResponse } from "next/server";
import { Client } from "pg";

export async function GET() {
  const client = new Client({
    connectionString: process.env.NEONDB_URL,
  });

  try {
    // Connect with timeout - increased to 15 seconds for serverless database cold starts
    await Promise.race([
      client.connect(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Database connection timeout")),
          15000
        )
      ),
    ]);

    try {
      const collegesQuery =
        "SELECT DISTINCT college_name FROM cutoff_data ORDER BY college_name ASC";
      const branchesQuery =
        "SELECT DISTINCT branch_name FROM cutoff_data ORDER BY branch_name ASC";
      const categoriesQuery =
        "SELECT DISTINCT category FROM cutoff_data ORDER BY category ASC";

      // Run queries with individual try/catch blocks
      let colleges = [],
        branches = [],
        categories = [];

      try {
        const collegesResult = await client.query(collegesQuery);
        colleges = collegesResult.rows.map((row) => row.college_name);
      } catch (err) {
        console.error("Error fetching colleges:", err);
      }

      try {
        const branchesResult = await client.query(branchesQuery);
        branches = branchesResult.rows.map((row) => row.branch_name);
      } catch (err) {
        console.error("Error fetching branches:", err);
      }

      try {
        const categoriesResult = await client.query(categoriesQuery);
        categories = categoriesResult.rows.map((row) => row.category);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }

      return NextResponse.json({ colleges, branches, categories });
    } catch (error) {
      console.error("Error in data fetching:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch options",
          colleges: [],
          branches: [],
          categories: [],
        },
        { status: 500 }
      );
    }
  } catch (connError) {
    console.error("Database connection error:", connError);
    return NextResponse.json(
      {
        error: "Database connection failed. Please try again later.",
        message: connError instanceof Error ? connError.message : String(connError),
        colleges: [],
        branches: [],
        categories: [],
      },
      { status: 500 }
    );
  } finally {
    try {
      await client.end();
    } catch (endError) {
      console.error("Error closing database connection:", endError);
    }
  }
}
