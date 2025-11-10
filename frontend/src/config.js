// API Configuration with fallback
const getApiBaseUrl = () => {
    // Check if we're in production and environment variable is not set
    if (process.env.NODE_ENV === 'production' && !process.env.REACT_APP_API_URL) {
        return 'https://workflow-builder-2rj3.onrender.com';
    }
    return process.env.REACT_APP_API_URL || 'http://localhost:3001';
};

export const API_BASE_URL = getApiBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
    workflows: `${API_BASE_URL}/api/workflows`,
    knowledgeBases: `${API_BASE_URL}/api/knowledge-bases`,
    executions: `${API_BASE_URL}/api/executions`
};

// Debug logging
console.log('API Configuration:', {
    NODE_ENV: process.env.NODE_ENV,
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
    API_BASE_URL: API_BASE_URL
});