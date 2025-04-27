import { NextResponse } from "next/server";
import { Client } from "pg";

export async function POST(request: Request) {
  const body = await request.json();
  const { percentile, college_name, branch_name, category } = body;

  if (!percentile) {
    return NextResponse.json(
      { error: "Percentile is required" },
      { status: 400 }
    );
  }

  const client = new Client({
    connectionString: process.env.NEONDB_URL,
  });

  await client.connect();

  try {
    // Query to fetch colleges within the percentile range
    const query = `
      SELECT DISTINCT college_name, branch_name, category, percentile
      FROM cutoff_data
      WHERE percentile BETWEEN $1 AND $2
      ${college_name ? "AND college_name ILIKE $3" : ""}
      ${branch_name ? "AND branch_name ILIKE $4" : ""}
      ${category ? "AND category = $5" : ""}
      ORDER BY percentile DESC
    `;

    const values: (string | number)[] = [
      parseFloat(percentile) - 10, // Lower bound
      parseFloat(percentile) + 10, // Upper bound
    ];

    if (college_name) values.push(`%${college_name}%`);
    if (branch_name) values.push(`%${branch_name}%`);
    if (category) values.push(category);

    const result = await client.query(query, values);

    // Get detailed info for each college result
    const collegesWithDetails = await Promise.all(
      result.rows.map(async (college) => {
        try {
          // This query would ideally fetch from your college_details table
          // Modify this based on your actual database structure
          const detailsQuery = `
          SELECT 
            location,
            year,
            fees,
            placement_percentage,
            avg_package,
            highest_package
          FROM college_details
          WHERE college_name = $1 AND branch_name = $2
          LIMIT 1
        `;

          const detailsResult = await client.query(detailsQuery, [
            college.college_name,
            college.branch_name,
          ]);

          // Return college with details if available
          return {
            ...college,
            details: detailsResult.rows[0] || null,
          };
        } catch (error) {
          console.error(
            `Error fetching details for ${college.college_name}:`,
            error
          );
          return college; // Return the college without details in case of error
        }
      })
    );

    return NextResponse.json({
      colleges: collegesWithDetails,
      total: collegesWithDetails.length,
    });
  } catch (error) {
    console.error("Error predicting colleges:", error);
    return NextResponse.json(
      { error: "Failed to predict colleges" },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
