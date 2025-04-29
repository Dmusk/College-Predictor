import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { requireAdmin } from "../../../../utils/auth";

export async function GET(request: NextRequest) {
  // Check admin authentication
  const admin = requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = new Client({
      connectionString: process.env.NEONDB_URL,
    });

    await client.connect();
    console.log("Connected to database to fetch college data");

    // Check if the table exists
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cutoff_data'
      );
    `);

    const tableExists = tableCheckResult.rows[0].exists;

    if (!tableExists) {
      return NextResponse.json({
        data: [],
        message: "No data table exists yet. Upload data first.",
      });
    }

    // Fetch all college data
    const result = await client.query(`
      SELECT * FROM cutoff_data 
      ORDER BY college_name, branch_name
    `);

    await client.end();

    return NextResponse.json({
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error) {
    console.error("Error fetching college data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch college data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
