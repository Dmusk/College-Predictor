'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const ResultPage = () => {
    const router = useRouter();
    const { percentile, branch } = router.query;
    const [colleges, setColleges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                    setColleges(data.colleges);
                    setLoading(false);
                })
                .catch((error) => {
                    setError(error.message);
                    setLoading(false);
                });
        }
    }, [percentile, branch]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">College Predictions</h1>
            {colleges.length > 0 ? (
                <ul className="list-disc pl-5">
                    {colleges.map((college, index) => (
                        <li key={index} className="mb-2">
                            {college.name} - {college.branch} ({college.percentile})
                        </li>
                    ))}
                </ul>
            ) : (
                <div>No colleges found for the given criteria.</div>
            )}
        </div>
    );
};

export default ResultPage;