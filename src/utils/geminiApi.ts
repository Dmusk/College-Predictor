import axios from 'axios';

const GEMINI_API_URL = process.env.GEMINI_API_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const convertPdfToData = async (pdfFile: File) => {
    const formData = new FormData();
    formData.append('file', pdfFile);

    try {
        const response = await axios.post(`${GEMINI_API_URL}/convert`, formData, {
            headers: {
                'Authorization': `Bearer ${GEMINI_API_KEY}`,
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error converting PDF:', error);
        throw new Error('Failed to convert PDF');
    }
};

/**
 * Predict colleges based on percentile and branch.
 * @param percentile - The student's percentile.
 * @param branch - The desired branch.
 * @returns A list of predicted colleges.
 */
export const predictColleges = async (percentile: number, branch: string) => {
    try {
        const response = await axios.post(`${GEMINI_API_URL}/predict`, {
            percentile,
            branch,
        }, {
            headers: {
                'Authorization': `Bearer ${GEMINI_API_KEY}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error predicting colleges:', error);
        throw new Error('Failed to predict colleges');
    }
};