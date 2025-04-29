import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import path from "path";
import { Client } from "pg";
import { processPdfFile, CollegeData } from "../../../../utils/pdfProcessor";
import { requireAdmin } from "../../../../utils/auth";

// Directory for temporary uploads
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function POST(request: NextRequest) {
  // Check admin authentication
  const admin = requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: "No fileId provided" },
        { status: 400 }
      );
    }

    // Find the file in the uploads directory
    const files = await readdir(UPLOAD_DIR);
    const pdfFile = files.find((file) => file.startsWith(fileId));

    if (!pdfFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const filePath = path.join(UPLOAD_DIR, pdfFile);

    // Process the PDF file using our Python script based on the notebook
    // Pass the fileId as the second parameter to track progress
    const { data: extractedData, stats } = await processPdfFile(
      filePath,
      fileId
    );

    if (!extractedData || extractedData.length === 0) {
      return NextResponse.json(
        { error: "No valid data could be extracted from the PDF" },
        { status: 400 }
      );
    }

    // Save data to NeonDB
    const dbStats = await saveDataToDatabase(extractedData);

    return NextResponse.json({
      success: true,
      message: "PDF processed and data saved to database",
      stats: dbStats,
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      {
        error:
          "Failed to process PDF: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}

// Save extracted data to database
async function saveDataToDatabase(data: CollegeData[]): Promise<{
  totalRecords: number;
  addedRecords: number;
  colleges: string[];
}> {
  const client = new Client({
    connectionString: process.env.NEONDB_URL,
  });

  try {
    await client.connect();

    // Create table if it doesn't exist
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

    const colleges = new Set<string>();
    let addedRecords = 0;

    // Insert data into database
    for (const record of data) {
      const {
        college_id,
        college_name,
        branch_id,
        branch_name,
        status,
        category,
        rank,
        percentile,
      } = record;

      try {
        await client.query(
          `INSERT INTO cutoff_data (college_id, college_name, branch_id, branch_name, status, category, rank, percentile)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT DO NOTHING`, // Avoid duplicates
          [
            college_id,
            college_name,
            branch_id,
            branch_name,
            status,
            category,
            rank,
            percentile,
          ]
        );

        addedRecords++;
        colleges.add(college_name);
      } catch (error) {
        console.error(`Error inserting record for ${college_name}:`, error);
        // Continue with other records even if one fails
      }
    }

    return {
      totalRecords: data.length,
      addedRecords,
      colleges: Array.from(colleges),
    };
  } finally {
    await client.end();
  }
}
