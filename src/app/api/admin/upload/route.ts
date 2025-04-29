import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { mkdir, writeFile as fsWriteFile } from "fs/promises";
import { requireAdmin } from "../../../../utils/auth";
import {
  processPdfFile,
  CollegeData,
  progressEmitter,
} from "../../../../utils/pdfProcessor";
import { Client } from "pg";

// Directory for temporary uploads
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
// Output JSON file path
const OUTPUT_JSON_PATH = path.join(process.cwd(), "data", "output.json");

// Keep track of file upload progress by fileId
const progressTracker = new Map<
  string,
  { progress: number; status: string; error?: string }
>();

// Ensure uploads directory exists
async function ensureUploadDir() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    // Also ensure data directory exists
    await mkdir(path.join(process.cwd(), "data"), { recursive: true });
  } catch (error) {
    console.error("Error creating directory:", error);
  }
}

// Handle progress events
progressEmitter.on(
  "progress",
  (data: {
    progress: number;
    status: string;
    fileId?: string;
    error?: string;
  }) => {
    const fileId = data.fileId || "current";
    progressTracker.set(fileId, {
      progress: data.progress,
      status: data.status,
      error: data.error,
    });
    console.log(`Progress for ${fileId}: ${data.progress}% - ${data.status}`);
  }
);

// SSE endpoint for progress updates
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const fileId = url.searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "No fileId provided" }, { status: 400 });
  }

  // Create a readable stream that emits progress events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Initial progress update
      const progress = progressTracker.get(fileId) || {
        progress: 0,
        status: "Waiting to start...",
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
      );

      // Setup event listener for this file
      const updateHandler = (data: {
        progress: number;
        status: string;
        fileId?: string;
        error?: string;
      }) => {
        if (!fileId || data.fileId === fileId) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );

          // If we're at 100% or error, close the stream
          if (data.progress === 100 || data.error) {
            setTimeout(() => {
              controller.close();
              progressEmitter.removeListener("progress", updateHandler);
            }, 1000); // Give a little time for the client to receive the final message
          }
        }
      };

      progressEmitter.on("progress", updateHandler);

      // Clean up when client disconnects
      request.signal.addEventListener("abort", () => {
        progressEmitter.removeListener("progress", updateHandler);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  // Check admin authentication
  const admin = requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure uploads directory exists
    await ensureUploadDir();

    // Parse form data from the request
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Generate a unique file ID and path
    const fileId = randomUUID();
    const fileName = `${fileId}-${file.name}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Convert file to buffer and save it
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, fileBuffer);

    // Set initial progress
    progressTracker.set(fileId, {
      progress: 0,
      status: "File uploaded, starting processing...",
    });

    // Return initial response immediately
    const response = NextResponse.json({
      success: true,
      fileName,
      fileId,
      filePath,
      message: "File uploaded successfully, processing started",
    });

    // Process the PDF file asynchronously (don't await)
    // Pass the fileId to the processPdfFile function
    processPdfFile(filePath, fileId)
      .then(async ({ data: extractedData, stats }) => {
        if (extractedData && extractedData.length > 0) {
          // Save to output.json
          await fsWriteFile(
            OUTPUT_JSON_PATH,
            JSON.stringify(extractedData, null, 2)
          );

          // Save to NeonDB
          const dbStats = await saveDataToDatabase(extractedData);

          // Update progress tracker with completion status
          progressTracker.set(fileId, {
            progress: 100,
            status: `Completed! ${stats.totalRecords} records extracted and saved.`,
          });

          // Keep the progress tracker for a while and then clean up
          setTimeout(() => {
            progressTracker.delete(fileId);
          }, 3600000); // 1 hour
        } else {
          progressTracker.set(fileId, {
            progress: 0,
            status: "Error: No valid data extracted",
            error: "No valid data could be extracted",
          });
        }
      })
      .catch((error) => {
        console.error("Error processing PDF:", error);
        progressTracker.set(fileId, {
          progress: 0,
          status: "Error processing PDF",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });

    return response;
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
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
