'use client'

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Button from '../../components/Button';

export default function PredictPage() {
  const [percentile, setPercentile] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState('');

  useEffect(() => {
    const fetchOptions = async () => {
      setOptionsLoading(true);
      setOptionsError('');

      try {
        const response = await fetch('/api/options');

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const text = await response.text();

        // Check if response is empty
        if (!text) {
          throw new Error('Empty response from API');
        }

        // Try to parse JSON
        try {
          const data = JSON.parse(text);
          setColleges(data.colleges || []);
          setBranches(data.branches || []);
          setCategories(data.categories || []);
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError, 'Raw response:', text);
          throw new Error('Invalid JSON response from API');
        }
      } catch (error) {
        console.error('Failed to fetch options:', error);
        setOptionsError('Failed to load filter options. Please refresh the page.');
      } finally {
        setOptionsLoading(false);
      }
    };

    fetchOptions();
  }, []);

  const handlePredict = async () => {
    if (!percentile) {
      setErrorMessage('Percentile is required');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSelectedCollege(null);

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentile,
          college_name: collegeName,
          branch_name: branchName,
          category: category
        }),
      });

      const data = await response.json();
      if (data.colleges && data.colleges.length > 0) {
        setResults(data.colleges);
      } else {
        setResults([]);
        setErrorMessage('No colleges found for the given criteria.');
      }
    } catch (error) {
      setErrorMessage('Failed to fetch predictions. Please try again.');
      console.error('Error predicting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollegeClick = (college) => {
    setSelectedCollege(college);
  };

  const closeDetails = () => {
    setSelectedCollege(null);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-gray-700 mb-8 text-center">College Predictor</h2>

        {/* Options Error Message */}
        {optionsError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {optionsError}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Search Filters</h3>

          {optionsLoading ? (
            <div className="py-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Loading options...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Percentile (Required)
                </label>
                <input
                  type="number"
                  placeholder="Enter your percentile"
                  value={percentile}
                  onChange={(e) => setPercentile(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  disabled={categories.length === 0}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat, index) => (
                    <option key={index} value={cat} className="text-gray-800">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  College (Optional)
                </label>
                <select
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  disabled={colleges.length === 0}
                >
                  <option value="">Any College</option>
                  {colleges.map((college, index) => (
                    <option key={index} value={college} className="text-gray-800">
                      {college}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Branch (Optional)
                </label>
                <select
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  disabled={branches.length === 0}
                >
                  <option value="">Any Branch</option>
                  {branches.map((branch, index) => (
                    <option key={index} value={branch} className="text-gray-800">
                      {branch}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <Button
              onClick={handlePredict}
              disabled={isLoading || optionsLoading}
              className="px-8 py-3"
            >
              {isLoading ? 'Predicting...' : 'Predict Colleges'}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="mt-6">
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {errorMessage}
            </div>
          )}

          {results.length > 0 ? (
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-700 mb-4">Prediction Results</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 uppercase text-sm leading-normal">
                      <th className="py-3 px-6 text-left">College Name</th>
                      <th className="py-3 px-6 text-left">Branch</th>
                      <th className="py-3 px-6 text-center">Category</th>
                      <th className="py-3 px-6 text-center">Percentile</th>
                      <th className="py-3 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 text-sm">
                    {results.map((college, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="py-3 px-6 text-left whitespace-nowrap">
                          <div className="font-medium">{college.college_name}</div>
                        </td>
                        <td className="py-3 px-6 text-left">
                          {college.branch_name}
                        </td>
                        <td className="py-3 px-6 text-center">
                          <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-xs">
                            {college.category}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-center font-medium">
                          {college.percentile}%
                        </td>
                        <td className="py-3 px-6 text-center">
                          <button
                            onClick={() => handleCollegeClick(college)}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-xs"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            !errorMessage && !isLoading && (
              <div className="bg-white shadow-lg rounded-lg p-8 text-center">
                <p className="text-gray-500">Enter your criteria and click 'Predict Colleges' to see results.</p>
              </div>
            )
          )}
        </div>

        {/* College Details Modal */}
        {selectedCollege && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-gray-700">College Details</h3>
                  <button
                    onClick={closeDetails}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <h4 className="text-xl font-bold text-blue-700 mb-2">{selectedCollege.college_name}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Branch</p>
                    <p className="font-medium">{selectedCollege.branch_name}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="font-medium">{selectedCollege.category}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Required Percentile</p>
                    <p className="font-medium">{selectedCollege.percentile}%</p>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h5 className="font-semibold text-lg mb-3">Additional Information</h5>

                  {selectedCollege.details ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Location</p>
                        <p className="font-medium">{selectedCollege.details.location || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Year</p>
                        <p className="font-medium">{selectedCollege.details.year || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Annual Fees</p>
                        <p className="font-medium">
                          {selectedCollege.details.fees ? `₹${selectedCollege.details.fees.toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Placement Percentage</p>
                        <p className="font-medium">
                          {selectedCollege.details.placement_percentage ? `${selectedCollege.details.placement_percentage}%` : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Average Package</p>
                        <p className="font-medium">
                          {selectedCollege.details.avg_package ? `₹${selectedCollege.details.avg_package.toLocaleString()} LPA` : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Highest Package</p>
                        <p className="font-medium">
                          {selectedCollege.details.highest_package ? `₹${selectedCollege.details.highest_package.toLocaleString()} LPA` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Detailed information not available for this college.</p>
                  )}
                </div>

                <div className="mt-6 text-center">
                  <Button onClick={closeDetails}>Close</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}