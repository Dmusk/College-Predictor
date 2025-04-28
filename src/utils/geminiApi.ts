import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_URL = process.env.GEMINI_API_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize the Google Generative AI SDK
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-pro-vision"; // This model supports both text and image inputs

// Interface for the college data we expect to extract
export interface CollegeData {
  college_name: string;
  branch_name: string;
  category: string;
  percentile: number;
}

export const convertPdfToData = async (pdfFile: File) => {
  const formData = new FormData();
  formData.append("file", pdfFile);

  try {
    const response = await axios.post(`${GEMINI_API_URL}/convert`, formData, {
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error converting PDF:", error);
    throw new Error("Failed to convert PDF");
  }
};

/**
 * Predict colleges based on percentile and branch.
 * @param percentile - The student's percentile.
 * @param branch - The desired branch.
 * @returns A list of predicted colleges.
 */
export const predictColleges = async (percentile: number, branch: string) => {
  try {
    const response = await axios.post(
      `${GEMINI_API_URL}/predict`,
      {
        percentile,
        branch,
      },
      {
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error predicting colleges:", error);
    throw new Error("Failed to predict colleges");
  }
};

export async function extractDataFromPDF(
  pdfPath: string,
  pdfBase64: string
): Promise<CollegeData[]> {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Create prompt for Gemini to extract college cutoff data from a PDF
    const prompt = `
      You are a data extraction assistant. You are given a PDF of college admission cutoff data.
      Extract the following information from the PDF:
      1. College name
      2. Branch/Course name
      3. Category (e.g., OPEN, OBC, SC, ST, etc.)
      4. Percentile cutoff

      Format the data as a valid JSON array of objects with these fields:
      - college_name (string)
      - branch_name (string)
      - category (string)
      - percentile (number)

      If you can't extract a specific field for a row, use null for that field.
      Don't include any additional text in your response, just the JSON array.
    `;

    // PDF data as base64
    const imagePart = {
      inlineData: {
        data: pdfBase64,
        mimeType: "application/pdf",
      },
    };

    // Generate content with the PDF
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Extract JSON array from the response
    let jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON data from Gemini response");
    }

    const jsonStr = jsonMatch[0];
    const data = JSON.parse(jsonStr) as CollegeData[];

    // Filter out invalid records
    return data.filter(
      (record) =>
        record.college_name &&
        record.branch_name &&
        record.category &&
        typeof record.percentile === "number"
    );
  } catch (error) {
    console.error("Error in Gemini API call:", error);
    throw new Error(
      `Failed to process PDF with Gemini: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
