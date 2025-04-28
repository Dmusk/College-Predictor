'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../../components/Layout';
import FileUpload from '../../../components/FileUpload';

interface UploadStats {
  totalRecords: number;
  addedRecords: number;
  colleges: string[];
}

export default function AdminDashboard() {
  const [user, setUser] = useState<{ username: string, role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [showUploadSection, setShowUploadSection] = useState(false);
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploadStatus('uploading');
    setUploadMessage('Uploading PDF file...');
    setUploadStats(null);

    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', file);

    try {
      // First upload the file
      const uploadResponse = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'File upload failed');
      }

      const uploadData = await uploadResponse.json();

      // Now process the uploaded PDF
      setUploadStatus('processing');
      setUploadMessage('Processing PDF with Gemini AI...');

      const processResponse = await fetch('/api/admin/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: uploadData.fileId,
        }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.error || 'PDF processing failed');
      }

      const processData = await processResponse.json();

      setUploadStatus('success');
      setUploadMessage('PDF processed successfully! Data has been added to the database.');
      setUploadStats(processData.stats);
    } catch (error) {
      console.error('Error during upload/process:', error);
      setUploadStatus('error');
      setUploadMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
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
        <div className="max-w-6xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 border-b pb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Admin Dashboard</h1>

            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                Welcome, <span className="font-medium">{user?.username}</span>
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm transition duration-200"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Admin Dashboard Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500 mb-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Upload PDF Data</h3>
              <p className="text-gray-600 text-center mb-4">Upload and process college cutoff data from PDF files</p>
              <button
                onClick={() => setShowUploadSection(!showUploadSection)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                {showUploadSection ? 'Hide Upload Form' : 'Upload PDF File'}
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mb-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-800 mb-2">View College Data</h3>
              <p className="text-gray-600 text-center mb-4">Browse and manage existing college cutoff data</p>
              <button
                onClick={() => router.push('/admin/data')}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                View Data
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-purple-500 mb-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Manage Data</h3>
              <p className="text-gray-600 text-center mb-4">Delete or modify specific college data entries</p>
              <button
                onClick={() => router.push('/admin/manage')}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                Manage Data
              </button>
            </div>
          </div>

          {/* PDF Upload Section */}
          {showUploadSection && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Upload College Data</h2>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <p className="mb-4 text-gray-600">
                  Upload a PDF file containing college cutoff data. The system will use Gemini AI to extract
                  the information and store it in the database.
                </p>

                <FileUpload
                  onFileSelected={handleFileUpload}
                  accept=".pdf"
                  label="Select PDF file"
                  disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
                />

                {uploadStatus !== 'idle' && (
                  <div className="mt-6">
                    {uploadStatus === 'uploading' || uploadStatus === 'processing' ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mr-3"></div>
                        <p className="text-blue-600">{uploadMessage}</p>
                      </div>
                    ) : uploadStatus === 'success' ? (
                      <div className="bg-green-100 text-green-700 p-4 rounded-md">
                        <p className="font-medium">{uploadMessage}</p>
                        {uploadStats && (
                          <div className="mt-3">
                            <p>Total records processed: {uploadStats.totalRecords}</p>
                            <p>Records added to database: {uploadStats.addedRecords}</p>
                            {uploadStats.colleges.length > 0 && (
                              <div className="mt-2">
                                <p className="font-medium">Colleges included:</p>
                                <ul className="list-disc list-inside mt-1">
                                  {uploadStats.colleges.slice(0, 5).map((college, idx) => (
                                    <li key={idx}>{college}</li>
                                  ))}
                                  {uploadStats.colleges.length > 5 && (
                                    <li>...and {uploadStats.colleges.length - 5} more</li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-red-100 text-red-700 p-4 rounded-md">
                        <p>{uploadMessage}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data Management Section - Simplified and moved to cards above */}
        </div>
      </div>
    </Layout>
  );
}