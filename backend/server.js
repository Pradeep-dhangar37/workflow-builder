import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import workflowRoutes from './routes/workflows.js';
import knowledgeBaseRoutes from './routes/knowledgeBases.js';
import executionRoutes from './routes/executions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:5173', // Local development
        'http://localhost:3000', // Alternative local port
        'https://workflow-builder-1.onrender.com', // Your frontend deployment
        'https://workflow-builder-1.onrender.com/' // With trailing slash
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));

// Log requests for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow-builder')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/workflows', workflowRoutes);
app.use('/api/knowledge-bases', knowledgeBaseRoutes);
app.use('/api/executions', executionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Workflow Builder API is running',
        timestamp: new Date().toISOString(),
        cors: 'enabled'
    });
});

// Handle preflight requests
app.options('*', cors(corsOptions));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
