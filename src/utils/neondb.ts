import { Client } from 'pg';

export const saveToNeonDB = async (data: any[]) => {
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

export const saveDataToNeonDB = async (data) => {
  try {
    await client.connect();
    const query = 'INSERT INTO mhtcet_data (percentile, category, college, branch) VALUES ($1, $2, $3, $4)';
    const values = [data.percentile, data.category, data.college, data.branch];
    await client.query(query, values);
  } catch (error) {
    console.error('Error saving data to NeonDB:', error);
  } finally {
    await client.disconnect();
  }
};

export const getCollegesByPercentile = async (percentile) => {
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
    await client.disconnect();
  }
};