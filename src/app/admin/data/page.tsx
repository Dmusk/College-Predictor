'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../../components/Layout';
import { Client } from 'pg';

interface CollegeData {
  id: number;
  college_id: string;
  college_name: string;
  branch_id: string;
  branch_name: string;
  status: string;
  category: string;
  rank: string;
  percentile: number;
  created_at: string;
}

export default function AdminDataPage() {
  const [user, setUser] = useState<{ username: string, role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CollegeData[]>([]);
  const [filteredData, setFilteredData] = useState<CollegeData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterCategory, setFilterCategory] = useState('');
  const [sortField, setSortField] = useState<keyof CollegeData>('college_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [categories, setCategories] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const router = useRouter();

  // Check authentication on page load
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();

        if (!response.ok || !data.authenticated) {
          router.replace('/admin/login');
          return;
        }

        setUser(data.user);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/admin/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  // Fetch college data
  useEffect(() => {
    if (!loading && user) {
      fetchCollegeData();
    }
  }, [loading, user]);

  const fetchCollegeData = async () => {
    setDataLoading(true);
    try {
      // Create an API endpoint to get college data
      const response = await fetch('/api/admin/data');

      if (!response.ok) {
        throw new Error('Failed to fetch college data');
      }

      const result = await response.json();

      if (result.data) {
        setData(result.data);

        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(result.data.map((item: CollegeData) => item.category))
        ) as string[];
        setCategories(uniqueCategories);

        // Apply initial filtering and pagination
        handleDataFiltering(result.data);
      }
    } catch (error) {
      console.error('Error fetching college data:', error);
      // Show an error message to the user
    } finally {
      setDataLoading(false);
    }
  };

  // Handle filtering, sorting and pagination whenever filters change
  useEffect(() => {
    handleDataFiltering(data);
  }, [searchTerm, filterCategory, sortField, sortDirection, currentPage, pageSize, data]);

  const handleDataFiltering = (dataToFilter: CollegeData[]) => {
    // Filter data based on search term and category
    let filtered = [...dataToFilter];

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.college_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.branch_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory) {
      filtered = filtered.filter(item => item.category === filterCategory);
    }

    // Sort data
    filtered.sort((a, b) => {
      if (a[sortField] < b[sortField]) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (a[sortField] > b[sortField]) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    // Calculate total pages
    setTotalPages(Math.ceil(filtered.length / pageSize));

    // Get current page data
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    setFilteredData(filtered.slice(start, end));
  };

  const handleSort = (field: keyof CollegeData) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-100 p-8">
          <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 border-b pb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-blue-500 hover:text-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">College Data</h1>
            </div>

            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <span className="text-gray-600">
                Logged in as <span className="font-medium">{user?.username}</span>
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm transition duration-200"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                placeholder="Search college or branch..."
                className="block w-full border border-gray-300 rounded-md py-2 px-3 text-sm"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category Filter
              </label>
              <select
                id="category"
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1); // Reset to first page on filter change
                }}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 text-sm"
              >
                <option key="all-categories" value="">All Categories</option>
                {categories.map((category, index) => (
                  <option key={`category-${index}-${category}`} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pageSize" className="block text-sm font-medium text-gray-700 mb-1">
                Items per page
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing page size
                }}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 text-sm"
              >
                <option key="page-size-10" value="10">10</option>
                <option key="page-size-20" value="20">20</option>
                <option key="page-size-50" value="50">50</option>
                <option key="page-size-100" value="100">100</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            {dataLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredData.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('college_name')}
                    >
                      College Name
                      {sortField === 'college_name' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('branch_name')}
                    >
                      Branch
                      {sortField === 'branch_name' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('category')}
                    >
                      Category
                      {sortField === 'category' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('percentile')}
                    >
                      Percentile
                      {sortField === 'percentile' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('rank')}
                    >
                      Rank
                      {sortField === 'rank' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('status')}
                    >
                      Status
                      {sortField === 'status' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item) => (
                    <tr key={`row-${item.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.college_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.branch_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.percentile}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.rank}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">No data found. {searchTerm || filterCategory ? 'Try adjusting your filters.' : ''}</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredData.length > 0 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-700">
                Showing {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
                {Math.min(currentPage * pageSize, data.length)} of {data.length} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md ${currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md ${currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}