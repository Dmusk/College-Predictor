import React, { useState, useRef, useEffect } from "react";

interface FileUploadProps {
    onFileSelected: (file: File) => Promise<{ fileId?: string }>;
    accept?: string;
    label?: string;
    disabled?: boolean;
}

interface ProgressState {
    progress: number;
    status: string;
    error?: string;
}

export default function FileUpload({
    onFileSelected,
    accept = "*",
    label = "Choose a file",
    disabled = false,
}: FileUploadProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [fileId, setFileId] = useState<string | null>(null);
    const [progress, setProgress] = useState<ProgressState | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Set up event source for progress updates
    useEffect(() => {
        if (fileId) {
            // Close any existing connection
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            // Create a new connection
            const eventSource = new EventSource(`/api/admin/upload?fileId=${fileId}`);

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setProgress(data);

                    // If processing is complete or errored, close the connection
                    if (data.progress === 100 || data.error) {
                        setTimeout(() => {
                            eventSource.close();
                        }, 1000); // Give time to display final message

                        // Reset the upload state after completion
                        if (data.progress === 100) {
                            setTimeout(() => {
                                setIsUploading(false);
                                setSelectedFile(null);
                                if (fileInputRef.current) {
                                    fileInputRef.current.value = '';
                                }
                            }, 3000); // Keep the success message visible for 3 seconds
                        } else if (data.error) {
                            setIsUploading(false);
                        }
                    }
                } catch (error) {
                    console.error("Error parsing progress event:", error);
                }
            };

            eventSource.onerror = () => {
                console.error("EventSource failed");
                eventSource.close();
            };

            eventSourceRef.current = eventSource;

            // Cleanup on unmount
            return () => {
                eventSource.close();
            };
        }
    }, [fileId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setSelectedFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFile) {
            setIsUploading(true);
            setProgress({ progress: 0, status: "Starting upload..." });

            try {
                const response = await onFileSelected(selectedFile);
                if (response?.fileId) {
                    setFileId(response.fileId);
                }
            } catch (error) {
                console.error("Upload failed:", error);
                setProgress({
                    progress: 0,
                    status: "Upload failed",
                    error: error instanceof Error ? error.message : "Unknown error"
                });
                setIsUploading(false);
            }
        }
    };

    const handleClick = () => {
        // Trigger the hidden file input
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Get color based on progress
    const getProgressColor = () => {
        if (!progress) return 'bg-blue-500';
        if (progress.error) return 'bg-red-500';
        if (progress.progress < 30) return 'bg-blue-500';
        if (progress.progress < 70) return 'bg-blue-600';
        return 'bg-green-500';
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex-1">
                    <div
                        onClick={!disabled && !isUploading ? handleClick : undefined}
                        className={`border-2 border-dashed rounded-lg p-4 text-center ${disabled || isUploading
                                ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                                : "border-blue-300 hover:border-blue-500 bg-blue-50 hover:bg-blue-100 cursor-pointer"
                            }`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept={accept}
                            disabled={disabled || isUploading}
                            className="hidden"
                        />
                        <div className="flex flex-col items-center justify-center py-3">
                            <svg
                                className={`w-8 h-8 mb-2 ${disabled || isUploading ? "text-gray-400" : "text-blue-500"
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
                                className={`text-sm ${disabled || isUploading ? "text-gray-500" : "text-blue-600"
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
                    disabled={!selectedFile || disabled || isUploading}
                    className={`px-4 py-2 rounded-md text-white ${!selectedFile || disabled || isUploading
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600"
                        } transition duration-200 min-w-[120px]`}
                >
                    Upload
                </button>
            </div>

            {/* Progress bar */}
            {isUploading && progress && (
                <div className="mt-4">
                    <div className="mb-2 flex justify-between items-center">
                        <div className="text-sm font-medium text-gray-700">{progress.status}</div>
                        <div className="text-sm font-medium text-gray-700">
                            {progress.progress}%
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className={`h-2.5 rounded-full ${getProgressColor()}`}
                            style={{ width: `${progress.progress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Error message */}
            {progress?.error && (
                <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p>{progress.error}</p>
                </div>
            )}
        </form>
    );
}