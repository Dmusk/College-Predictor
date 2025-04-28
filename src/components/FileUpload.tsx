import React, { useState, useRef } from "react";

interface FileUploadProps {
    onFileSelected: (file: File) => void;
    accept?: string;
    label?: string;
    disabled?: boolean;
}

export default function FileUpload({
    onFileSelected,
    accept = "*",
    label = "Choose a file",
    disabled = false,
}: FileUploadProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setSelectedFile(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFile) {
            onFileSelected(selectedFile);
        }
    };

    const handleClick = () => {
        // Trigger the hidden file input
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex-1">
                    <div
                        onClick={!disabled ? handleClick : undefined}
                        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${disabled
                                ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                                : "border-blue-300 hover:border-blue-500 bg-blue-50 hover:bg-blue-100"
                            }`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept={accept}
                            disabled={disabled}
                            className="hidden"
                        />
                        <div className="flex flex-col items-center justify-center py-3">
                            <svg
                                className={`w-8 h-8 mb-2 ${disabled ? "text-gray-400" : "text-blue-500"
                                    }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                            </svg>
                            <p
                                className={`text-sm ${disabled ? "text-gray-500" : "text-blue-600"
                                    }`}
                            >
                                {selectedFile ? selectedFile.name : label}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {selectedFile
                                    ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                                    : "Click to browse"}
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!selectedFile || disabled}
                    className={`px-4 py-2 rounded-md text-white ${!selectedFile || disabled
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600"
                        } transition duration-200 min-w-[120px]`}
                >
                    Upload
                </button>
            </div>
        </form>
    );
}