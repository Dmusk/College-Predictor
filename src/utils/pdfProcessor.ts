// PDF processor utility based on the Jupyter notebook model
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { EventEmitter } from "events";

// Create an event emitter for progress updates
export const progressEmitter = new EventEmitter();

// Interface for college cutoff data
export interface CollegeData {
  college_id: string;
  college_name: string;
  branch_id: string;
  branch_name: string;
  status: string;
  category: string;
  rank: string;
  percentile: number;
}

/**
 * Process a PDF file using a Python script that runs the model
 * from the Jupyter notebook to extract college cutoff data
 */
export async function processPdfFile(
  pdfPath: string,
  fileId: string
): Promise<{
  data: CollegeData[];
  stats: {
    totalRecords: number;
    addedRecords: number;
    colleges: string[];
  };
}> {
  try {
    // Path to the Python script
    const scriptPath = path.join(process.cwd(), "scripts", "pdf_processor.py");

    // Define output path to data/output.json
    const outputPath = path.join(process.cwd(), "data", "temp_output.json");

    // Ensure data directory exists
    await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true });

    console.log(`Processing PDF file: ${pdfPath}`);
    console.log(`Using Python script: ${scriptPath}`);
    console.log(`Output will be saved to: ${outputPath}`);
    console.log(`File ID: ${fileId}`);

    // Emit initial progress event
    progressEmitter.emit("progress", {
      progress: 0,
      status: "Starting PDF processing...",
      fileId: fileId,
    });

    // Call Python script to process the PDF
    const pythonProcess = spawn("python", [scriptPath, pdfPath, outputPath]);

    return new Promise((resolve, reject) => {
      let dataString = "";
      let errorString = "";

      // Collect data from script
      pythonProcess.stdout.on("data", (data) => {
        const output = data.toString().trim();
        dataString += output;
        console.log(`Python stdout: ${output}`);

        // Check if this is a progress update
        const progressMatch = output.match(/PROGRESS:(\d+)/);
        if (progressMatch) {
          const progress = parseInt(progressMatch[1]);
          let status = "Processing PDF...";

          if (progress <= 50) {
            status = `Extracting text from PDF (${progress}%)`;
          } else if (progress < 100) {
            status = `Parsing data (${progress}%)`;
          } else {
            status = "Finalizing...";
          }

          progressEmitter.emit("progress", {
            progress,
            status,
            fileId: fileId,
          });
        }
      });

      // Collect errors from script
      pythonProcess.stderr.on("data", (data) => {
        errorString += data.toString();
        console.error(`Python stderr: ${data.toString().trim()}`);
      });

      // Handle completion
      pythonProcess.on("close", async (code) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}`);
          console.error(`Error output: ${errorString}`);
          progressEmitter.emit("progress", {
            progress: 0,
            status: "Error processing PDF",
            error: errorString,
            fileId: fileId,
          });
          return reject(
            new Error(
              `PDF processing script failed with code ${code}: ${errorString}`
            )
          );
        }

        try {
          console.log("Python script completed successfully");
          console.log(`Processing output from: ${outputPath}`);

          // Read processed data from output file
          const jsonData = await fs.readFile(outputPath, "utf-8");
          const parsedData: CollegeData[] = JSON.parse(jsonData);

          if (!parsedData || parsedData.length === 0) {
            console.error("No valid data extracted from PDF");
            progressEmitter.emit("progress", {
              progress: 0,
              status: "Error: No valid data found in PDF",
              error: "No valid data found in processed output",
              fileId: fileId,
            });
            return reject(new Error("No valid data found in processed output"));
          }

          console.log(`Parsed ${parsedData.length} records from output`);

          // Get unique colleges
          const collegeSet = new Set<string>();
          parsedData.forEach((item) => collegeSet.add(item.college_name));

          const stats = {
            totalRecords: parsedData.length,
            addedRecords: parsedData.length,
            colleges: Array.from(collegeSet),
          };

          console.log(`Found ${stats.colleges.length} unique colleges`);

          // Emit final progress event
          progressEmitter.emit("progress", {
            progress: 100,
            status: `Completed! Extracted ${stats.totalRecords} records from ${stats.colleges.length} colleges`,
            fileId: fileId,
          });

          // Clean up the temporary output file
          try {
            await fs.unlink(outputPath);
          } catch (unlinkError) {
            console.error("Error deleting temporary file:", unlinkError);
            // Non-fatal error, continue
          }

          resolve({
            data: parsedData,
            stats,
          });
        } catch (error) {
          console.error("Error processing PDF output:", error);
          progressEmitter.emit("progress", {
            progress: 0,
            status: "Error processing PDF output",
            error: error instanceof Error ? error.message : "Unknown error",
            fileId: fileId,
          });
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    progressEmitter.emit("progress", {
      progress: 0,
      status: "Error processing PDF",
      error: error instanceof Error ? error.message : "Unknown error",
      fileId: fileId,
    });
    throw error;
  }
}
