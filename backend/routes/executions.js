import express from 'express';
import multer from 'multer';
import path from 'path';
import { executeWorkflow } from '../services/workflowExecutor.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only text files
        if (file.mimetype === 'text/plain' || path.extname(file.originalname).toLowerCase() === '.txt') {
            cb(null, true);
        } else {
            cb(new Error('Only .txt files are allowed'), false);
        }
    }
});

// Execute workflow
router.post('/', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        console.log('Execution request received:', {
            workflowId: req.body.workflowId,
            hasInputText: !!req.body.inputText,
            hasFile: !!req.file,
            fileName: req.file?.originalname
        });

        const { workflowId, inputText, sessionId } = req.body;
        const file = req.file;

        if (!workflowId) {
            return res.status(400).json({ error: 'Workflow ID is required' });
        }

        if (!inputText && !file) {
            return res.status(400).json({ error: 'Either input text or file is required' });
        }

        const result = await executeWorkflow({
            workflowId,
            inputText,
            file,
            sessionId
        });

        console.log('Execution completed successfully');
        res.json(result);
    } catch (error) {
        console.error('Execution error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
