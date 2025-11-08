import express from 'express';
import multer from 'multer';
import { executeWorkflow } from '../services/workflowExecutor.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Execute workflow
router.post('/', upload.single('file'), async (req, res) => {
    try {
        const { workflowId, inputText, sessionId } = req.body;
        const file = req.file;

        const result = await executeWorkflow({
            workflowId,
            inputText,
            file,
            sessionId
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
