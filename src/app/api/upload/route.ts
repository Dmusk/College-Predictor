import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";
import csvParser from "csv-parser";
import * as fs from "fs";
import { saveToNeonDB } from "../../../utils/neondb";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), "uploads");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error("Error creating directory:", error);
    }

    // Create a unique filename
    const filePath = join(uploadDir, `${Date.now()}_${file.name}`);

    // Convert the file to a Buffer and write it to the filesystem
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Process the CSV file
    try {
      const csvData: any[] = [];

      // Set up the file stream and parser
      const fileStream = fs.createReadStream(filePath);

      // Return a promise that resolves when CSV processing is complete
      const processCSV = new Promise<any[]>((resolve, reject) => {
        fileStream
          .pipe(csvParser())
          .on("data", (row) => {
            csvData.push({
              college_id: row["College ID"],
              college_name: row["College Name"],
              branch_id: row["Branch ID"],
              branch_name: row["Branch Name"],
              status: row["Status"],
              category: row["Category"],
              rank: parseInt(row["Rank"], 10) || 0,
              percentile: parseFloat(row["Percentile"]) || 0,
            });
          })
          .on("end", () => resolve(csvData))
          .on("error", reject);
      });

      // Wait for CSV processing to complete
      const processedData = await processCSV;

      // Save to database
      await saveToNeonDB(processedData);

      // Clean up the temporary file
      fs.unlink(filePath, (err) => {
        if (err) console.error("Error deleting temporary file:", err);
      });

      return NextResponse.json({
        message: "CSV data processed and saved successfully",
        count: processedData.length,
      });
    } catch (error) {
      console.error("Error processing CSV:", error);
      return NextResponse.json(
        { error: "Error processing CSV file" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Error uploading file" },
      { status: 500 }
    );
  }
}
