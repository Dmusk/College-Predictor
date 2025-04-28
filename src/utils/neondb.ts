import { Client } from 'pg';

// Define types for the data structures
interface CollegeData {
  college_id: string;
  college_name: string;
  branch_id: string;
  branch_name: string;
  status: string;
  category: string;
  rank: number;
  percentile: number;
}

interface MHTCETData {
  percentile: number;
  category: string;
  college: string;
  branch: string;
}

export const saveToNeonDB = async (data: CollegeData[]) => {
  const client = new Client({
    connectionString: process.env.NEONDB_URL,
  });

  await client.connect();

  try {
    for (const row of data) {
      await client.query(
        `INSERT INTO colleges (college_id, college_name, branch_id, branch_name, status, category, rank, percentile)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          row.college_id,
          row.college_name,
          row.branch_id,
          row.branch_name,
          row.status,
          row.category,
          row.rank,
          row.percentile,
        ]
      );
    }
  } finally {
    await client.end();
  }
};

export const saveDataToNeonDB = async (data: MHTCETData) => {
  const client = new Client({
    connectionString: process.env.NEONDB_URL,
  });
  
  try {
    await client.connect();
    const query = 'INSERT INTO mhtcet_data (percentile, category, college, branch) VALUES ($1, $2, $3, $4)';
    const values = [data.percentile, data.category, data.college, data.branch];
    await client.query(query, values);
  } catch (error) {
    console.error('Error saving data to NeonDB:', error);
  } finally {
    await client.end();
  }
};

export const getCollegesByPercentile = async (percentile: number) => {
  const client = new Client({
    connectionString: process.env.NEONDB_URL,
  });
  
  try {
    await client.connect();
    const query = 'SELECT * FROM mhtcet_data WHERE percentile BETWEEN $1 AND $2';
    const values = [percentile - 10, percentile + 10];
    const result = await client.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('Error retrieving colleges from NeonDB:', error);
    return [];
  } finally {
    await client.end();
  }
};