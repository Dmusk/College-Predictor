import React, { useState } from 'react';

const FileUpload: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [message, setMessage] = useState<string>('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setMessage('');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setMessage('Please select a PDF file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setMessage('File uploaded successfully!');
            } else {
                setMessage('File upload failed. Please try again.');
            }
        } catch (error) {
            setMessage('An error occurred during the upload.');
        }
    };

    return (
        <div className="flex flex-col items-center">
            <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="mb-4"
            />
            <button
                onClick={handleUpload}
                className="bg-blue-500 text-white px-4 py-2 rounded"
            >
                Upload PDF
            </button>
            {message && <p className="mt-4 text-red-500">{message}</p>}
        </div>
    );
};

export default FileUpload;