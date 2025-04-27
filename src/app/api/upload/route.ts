import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import csvParser from 'csv-parser'; // Import CSV parser
import { saveToNeonDB } from '../../../utils/neondb';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing to handle file uploads
  },
};

const uploadHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error parsing the file' });
    }

    const file = files.file[0]; // Access the uploaded file

    try {
      const csvData: any[] = [];
      const fileStream = fs.createReadStream(file.filepath);

      // Parse the CSV file
      fileStream
        .pipe(csvParser())
        .on('data', (row) => {
          csvData.push({
            college_id: row['College ID'],
            college_name: row['College Name'],
            branch_id: row['Branch ID'],
            branch_name: row['Branch Name'],
            status: row['Status'],
            category: row['Category'],
            rank: parseInt(row['Rank'], 10),
            percentile: parseFloat(row['Percentile']),
          });
        })
        .on('end', async () => {
          try {
            // Save the extracted data to NeonDB
            await saveToNeonDB(csvData);
            res.status(200).json({ message: 'CSV data saved successfully' });
          } catch (error) {
            console.error('Error saving data to NeonDB:', error);
            res.status(500).json({ error: 'Error saving data to database' });
          }
        });
    } catch (error) {
      console.error('Error processing the CSV file:', error);
      res.status(500).json({ error: 'Error processing the CSV file' });
    }
  });
};

export default uploadHandler;