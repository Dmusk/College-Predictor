'use client'
import Layout from '../components/Layout';
import Button from '../components/Button';

export default function Home() {
  return (
    <Layout>
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-blue-600 mb-6">
          Welcome to MHTCET College Predictor
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          Predict the best colleges based on your percentile and preferences.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={() => (window.location.href = '/predict')}>
            Predict Colleges
          </Button>
          <Button onClick={() => alert('Feature coming soon!')}>
            Learn More
          </Button>
        </div>
      </div>
    </Layout>
  );
}