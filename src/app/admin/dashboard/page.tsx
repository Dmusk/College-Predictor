'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../../components/Layout';
import FileUpload from '../../../components/FileUpload';

interface UploadStats {
  recordsExtracted: number;
  recordsSaved: number;
  colleges: number;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<{ username: string, role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState('');
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

  const handleFileUpload = async (file: File): Promise<{ fileId?: string }> => {
    if (!file) return {};

    setUploadStatus('uploading');
    setUploadMessage('Uploading and processing PDF file. This may take a moment...');
    setUploadStats(null);

    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Upload the file and process it in one step
      const uploadResponse = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'File upload failed');
      }

      const uploadData = await uploadResponse.json();

      if (uploadData.success) {
        // We no longer need to set uploadStatus here as the progress updates
        // will be handled by the FileUpload component via server-sent events

        // Return the fileId for progress tracking
        return { fileId: uploadData.fileId };
      } else {
        throw new Error(uploadData.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error during upload/process:', error);
      setUploadStatus('error');
      setUploadMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      throw error;
    }
  };

  const handleResetData = async () => {
    // Ask for confirmation first
    const confirmReset = window.confirm(
      'This will delete all college data from the database and clear output.json. This action cannot be undone. Are you sure?'
    );

    if (!confirmReset) return;

    setResetStatus('loading');
    setResetMessage('Resetting database and output.json...');

    try {
      const response = await fetch('/api/admin/reset', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset data');
      }

      const result = await response.json();

      setResetStatus('success');
      setResetMessage('Database and output.json have been cleared successfully!');

      // Reset after 3 seconds
      setTimeout(() => {
        setResetStatus('idle');
        setResetMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error resetting data:', error);
      setResetStatus('error');
      setResetMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);

      // Reset error after 5 seconds
      setTimeout(() => {
        setResetStatus('idle');
        setResetMessage('');
      }, 5000);
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mb-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Reset Data</h3>
              <p className="text-gray-600 text-center mb-4">Clear database and output.json file to start fresh</p>
              <button
                onClick={handleResetData}
                disabled={resetStatus === 'loading'}
                className={`${resetStatus === 'loading'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600'
                  } text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200`}
              >
                {resetStatus === 'loading' ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resetting...
                  </span>
                ) : (
                  'Reset All Data'
                )}
              </button>

              {/* Reset Status Messages */}
              {resetStatus === 'success' && (
                <div className="mt-2 text-sm font-medium text-green-600">{resetMessage}</div>
              )}

              {resetStatus === 'error' && (
                <div className="mt-2 text-sm font-medium text-red-600">{resetMessage}</div>
              )}
            </div>
          </div>

          {/* PDF Upload Section */}
          {showUploadSection && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Upload College Data</h2>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <p className="mb-4 text-gray-600">
                  Upload a PDF file containing college cutoff data. The system will automatically extract
                  the information, save it to output.json, and store it in the database.
                </p>

                <FileUpload
                  onFileSelected={handleFileUpload}
                  accept=".pdf"
                  label="Select PDF file"
                  disabled={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}