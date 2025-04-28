'use client'

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { College } from '@/types';

// Create a component that uses useSearchParams inside Suspense
function ResultContent() {
    const searchParams = useSearchParams();
    const percentile = searchParams.get('percentile');
    const branch = searchParams.get('branch');

    const [colleges, setColleges] = useState<College[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (percentile && branch) {
            fetch(`/api/predict?percentile=${percentile}&branch=${branch}`)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then((data) => {
                    setColleges(data.colleges || []);
                    setLoading(false);
                })
                .catch((error) => {
                    setError(error.message);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [percentile, branch]);

    if (loading) {
        return <div className="container mx-auto p-4">Loading results...</div>;
    }

    if (error) {
        return <div className="container mx-auto p-4">Error: {error}</div>;
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">College Predictions</h1>
            {colleges.length > 0 ? (
                <ul className="list-disc pl-5">
                    {colleges.map((college, index) => (
                        <li key={index} className="mb-2">
                            {college.name} - {college.branch} ({college.percentile}%)
                        </li>
                    ))}
                </ul>
            ) : (
                <div>No colleges found for the given criteria.</div>
            )}
        </div>
    );
}

// Main page component with Suspense boundary
const ResultPage = () => {
    return (
        <div className="container mx-auto p-4">
            <Suspense fallback={<div>Loading parameters...</div>}>
                <ResultContent />
            </Suspense>
        </div>
    );
};

export default ResultPage;