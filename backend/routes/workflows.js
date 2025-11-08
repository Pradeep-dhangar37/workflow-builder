import express from 'express';
import Workflow from '../models/Workflow.js';

const router = express.Router();

// Get all workflows
router.get('/', async (req, res) => {
    try {
        const workflows = await Workflow.find().sort({ updatedAt: -1 });
        res.json(workflows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get workflow by ID
router.get('/:id', async (req, res) => {
    try {
        const workflow = await Workflow.findById(req.params.id);
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        res.json(workflow);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new workflow
router.post('/', async (req, res) => {
    try {
        const workflow = new Workflow(req.body);
        await workflow.save();
        res.status(201).json(workflow);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update workflow
router.put('/:id', async (req, res) => {
    try {
        const workflow = await Workflow.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true }
        );
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        res.json(workflow);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete workflow
router.delete('/:id', async (req, res) => {
    try {
        const workflow = await Workflow.findByIdAndDelete(req.params.id);
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        res.json({ message: 'Workflow deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
