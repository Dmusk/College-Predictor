import React from 'react';

interface College {
    name: string;
    branch: string;
    percentile: number;
}

interface CollegeListProps {
    colleges: College[];
}

const CollegeList: React.FC<CollegeListProps> = ({ colleges }) => {
    return (
        <div className="mt-4">
            <h2 className="text-xl font-bold">Colleges List</h2>
            {colleges.length === 0 ? (
                <p>No colleges found based on the criteria.</p>
            ) : (
                <ul className="list-disc pl-5">
                    {colleges.map((college, index) => (
                        <li key={index} className="my-2">
                            <strong>{college.name}</strong> - {college.branch} (Percentile: {college.percentile})
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default CollegeList;