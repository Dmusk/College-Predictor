# MHTCET College Predictor

A modern web application built with Next.js that helps students predict suitable colleges based on their MHT-CET percentile and branch preferences.

## Project Overview

This application allows students to:
- Predict colleges based on their percentile score
- Filter results by branch and other preferences
- Upload and analyze MHT-CET score cards
- View comprehensive college recommendations

## Technology Stack

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **APIs**: Custom API routes for prediction and data processing
- **AI Integration**: Google's Gemini API for data analysis
- **Database**: NeonDB (PostgreSQL)

## Environment Variables

Before running this project, you need to set up the following environment variables in a `.env` file at the root of your project:

```
# Gemini API Configuration
GEMINI_API_URL=your_gemini_api_url
GEMINI_API_KEY=your_gemini_api_key

# NeonDB Configuration
NEONDB_URL=your_neondb_connection_string
```

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/yourusername/college-predictor.git
cd college-predictor
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with the required environment variables (see above)

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application

## Project Structure

- `/src/app`: Main application pages and API routes
  - `/api`: Backend API endpoints for predictions and data processing
  - `/predict`: College prediction page
  - `/result`: Results display page
- `/src/components`: Reusable UI components
- `/src/utils`: Utility functions for Gemini API and NeonDB integration
- `/src/types`: TypeScript type definitions

## Features

- **College Prediction**: Uses historical data to predict suitable colleges based on percentile
- **PDF Analysis**: Upload your MHT-CET score card for personalized predictions
- **Database Integration**: Stores and retrieves college data from NeonDB
- **Responsive Design**: Works on both desktop and mobile devices

## Database Schema

The application uses two main tables in the NeonDB database:

1. `colleges` - Stores college and branch information
2. `mhtcet_data` - Stores MHT-CET percentile data linked to colleges and branches

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [NeonDB Documentation](https://neon.tech/docs/introduction)

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
