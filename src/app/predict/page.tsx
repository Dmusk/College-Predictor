'use client'

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Button from '../../components/Button';

// Define proper types for the college data
interface CollegeDetails {
  location?: string;
  year?: string;
  fees?: number;
  placement_percentage?: number;
  avg_package?: number;
  highest_package?: number;
}

interface College {
  college_name: string;
  branch_name: string;
  category: string;
  percentile: string | number;
  details?: CollegeDetails;
}

export default function PredictPage() {
  const [percentile, setPercentile] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<College[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestionMessage, setSuggestionMessage] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<{ [key: string]: string }>({});
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState('');
  const [alternativeSuggestions, setAlternativeSuggestions] = useState<{
    colleges?: string[];
    branches?: string[];
    categories?: string[];
  }>({});

  useEffect(() => {
    const fetchOptions = async (retryCount = 0) => {
      setOptionsLoading(true);
      setOptionsError('');

      try {
        const response = await fetch('/api/options');

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData?.error || `API responded with status: ${response.status}`;

          // If we get a 500 error and have retries left, try again
          if (response.status === 500 && retryCount < 2) {
            console.log(`Database connection failed, retrying (${retryCount + 1}/3)...`);
            setTimeout(() => fetchOptions(retryCount + 1), 3000); // Wait 3 seconds before retrying
            return;
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();
        setColleges(data.colleges || []);
        setBranches(data.branches || []);
        setCategories(data.categories || []);
      } catch (error) {
        console.error('Failed to fetch options:', error);
        setOptionsError('Failed to load filter options. The database connection might be slow. Please wait a moment and refresh the page.');
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
    setSuggestionMessage('');
    setAlternativeSuggestions({});
    setSelectedCollege(null);

    // Track which filters are being applied
    const filters = {
      percentile,
      college_name: collegeName,
      branch_name: branchName,
      category: category
    };

    // Create a record of applied non-empty filters for better error messaging
    const activeFilters: { [key: string]: string } = {};
    if (percentile) activeFilters.percentile = percentile;
    if (collegeName) activeFilters.college = collegeName;
    if (branchName) activeFilters.branch = branchName;
    if (category) activeFilters.category = category;

    setAppliedFilters(activeFilters);

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });

      const data = await response.json();
      if (data.colleges && data.colleges.length > 0) {
        setResults(data.colleges);
      } else {
        setResults([]);

        // Try to fetch alternative suggestions by removing specific filters
        await fetchAlternativeSuggestions(filters);
      }
    } catch (error) {
      setErrorMessage('Failed to fetch predictions. Please try again.');
      console.error('Error predicting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAlternativeSuggestions = async (originalFilters: any) => {
    try {
      // If branch_name was specified, try without it
      if (originalFilters.branch_name) {
        const branchlessResponse = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...originalFilters,
            branch_name: ''
          }),
        });

        const branchlessData = await branchlessResponse.json();
        if (branchlessData.colleges && branchlessData.colleges.length > 0) {
          // Extract unique branches that do have results
          const availableBranches: string[] = Array.from(
            new Set(branchlessData.colleges.map((c: College) => c.branch_name))
          );
          setAlternativeSuggestions(prev => ({
            ...prev,
            branches: availableBranches.slice(0, 5)
          }));
        }
      }

      // If college_name was specified, try without it
      if (originalFilters.college_name) {
        const collegelessResponse = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...originalFilters,
            college_name: ''
          }),
        });

        const collegelessData = await collegelessResponse.json();
        if (collegelessData.colleges && collegelessData.colleges.length > 0) {
          // Extract unique colleges that do have results
          const availableColleges: string[] = Array.from(
            new Set(collegelessData.colleges.map((c: College) => c.college_name))
          );
          setAlternativeSuggestions(prev => ({
            ...prev,
            colleges: availableColleges.slice(0, 5)
          }));
        }
      }

      // If category was specified, try without it
      if (originalFilters.category) {
        const categorylessResponse = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...originalFilters,
            category: ''
          }),
        });

        const categorylessData = await categorylessResponse.json();
        if (categorylessData.colleges && categorylessData.colleges.length > 0) {
          // Extract unique categories that do have results
          const availableCategories: string[] = Array.from(
            new Set(categorylessData.colleges.map((c: College) => c.category))
          );
          setAlternativeSuggestions(prev => ({
            ...prev,
            categories: availableCategories.slice(0, 5)
          }));
        }
      }

      // Generate suggestion message based on what we found
      generateSuggestionMessage();
    } catch (error) {
      console.error("Error fetching alternative suggestions:", error);
    }
  };

  const generateSuggestionMessage = () => {
    const filterList = Object.entries(appliedFilters)
      .map(([key, value]) => `${key === 'percentile' ? value + '%' : value}`)
      .join(", ");

    setErrorMessage(`No colleges found for the specified filters: ${filterList}.`);

    // Prepare suggestions based on the alternatives we found
    const suggestions = [];

    if (alternativeSuggestions.branches?.length) {
      suggestions.push(`Try one of these branches instead: ${alternativeSuggestions.branches.join(", ")}.`);
    }

    if (alternativeSuggestions.colleges?.length) {
      suggestions.push(`Available colleges for your percentile: ${alternativeSuggestions.colleges.join(", ")}.`);
    }

    if (alternativeSuggestions.categories?.length) {
      suggestions.push(`Try these categories: ${alternativeSuggestions.categories.join(", ")}.`);
    }

    if (!suggestions.length && Object.keys(appliedFilters).length > 1) {
      suggestions.push("Try removing some filters to see more results.");
    }

    if (suggestions.length > 0) {
      setSuggestionMessage(suggestions.join(" "));
    }
  };

  const handleCollegeClick = (college: College) => {
    setSelectedCollege(college);
  };

  const closeDetails = () => {
    setSelectedCollege(null);
  };

  const clearFilters = () => {
    setCollegeName('');
    setBranchName('');
    setCategory('');
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

          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={handlePredict}
              disabled={isLoading || optionsLoading}
              className={`bg-blue-500 hover:bg-blue-600 text-white font-bold px-8 py-3 rounded-lg shadow-md transition duration-300 ${(isLoading || optionsLoading) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {isLoading ? 'Predicting...' : 'Predict Colleges'}
            </button>

            <button
              onClick={clearFilters}
              disabled={isLoading || optionsLoading || (!collegeName && !branchName && !category)}
              className={`bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold px-6 py-3 rounded-lg shadow-md transition duration-300 ${(isLoading || optionsLoading || (!collegeName && !branchName && !category)) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="mt-6">
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {errorMessage}
            </div>
          )}

          {suggestionMessage && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 mt-2">
              <p className="font-semibold">Suggestions:</p>
              <p>{suggestionMessage}</p>
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
                  <button
                    onClick={closeDetails}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}