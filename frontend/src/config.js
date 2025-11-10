// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// API endpoints
export const API_ENDPOINTS = {
    workflows: `${API_BASE_URL}/api/workflows`,
    knowledgeBases: `${API_BASE_URL}/api/knowledge-bases`,
    executions: `${API_BASE_URL}/api/executions`
};