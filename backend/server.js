import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import workflowRoutes from './routes/workflows.js';
import knowledgeBaseRoutes from './routes/knowledgeBases.js';
import executionRoutes from './routes/executions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
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

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Workflow Builder API is running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
