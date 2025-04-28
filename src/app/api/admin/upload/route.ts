import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { mkdir } from "fs/promises";
import { requireAdmin } from "../../../../utils/auth";

// Directory for temporary uploads
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
async function ensureUploadDir() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating upload directory:", error);
  }
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

    // Return response with file path and ID
    return NextResponse.json({
      success: true,
      fileName,
      fileId,
      filePath,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
