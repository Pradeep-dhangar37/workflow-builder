import express from 'express';
import KnowledgeBase from '../models/KnowledgeBase.js';

const router = express.Router();

// Get all knowledge bases
router.get('/', async (req, res) => {
    try {
        const kbs = await KnowledgeBase.find().select('-chunks');
        res.json(kbs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get knowledge base by ID
router.get('/:id', async (req, res) => {
    try {
        const kb = await KnowledgeBase.findById(req.params.id);
        if (!kb) {
            return res.status(404).json({ error: 'Knowledge base not found' });
        }
        res.json(kb);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create knowledge base
router.post('/', async (req, res) => {
    try {
        const kb = new KnowledgeBase(req.body);
        await kb.save();
        res.status(201).json(kb);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Search knowledge base
router.post('/:id/search', async (req, res) => {
    try {
        const { query } = req.body;
        const kb = await KnowledgeBase.findById(req.params.id);

        if (!kb) {
            return res.status(404).json({ error: 'Knowledge base not found' });
        }

        // Simple keyword search
        const results = kb.chunks.filter(chunk =>
            chunk.content.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
