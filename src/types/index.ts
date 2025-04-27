export interface College {
    name: string;
    branch: string;
    category: string;
    percentile: number;
}

export interface UserInput {
    percentile: number;
    requiredBranch: string;
}

export interface PredictionResult {
    colleges: College[];
    message: string;
}

export interface UploadResponse {
    success: boolean;
    message: string;
    data?: College[];
}