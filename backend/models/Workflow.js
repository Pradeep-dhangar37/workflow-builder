import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: ['input', 'store', 'rag', 'memory', 'output']
    },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 }
    }
});

const workflowSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: { type: String },
    nodeSequence: [nodeSchema],
    // Keep legacy fields for backward compatibility
    nodes: [nodeSchema],
    connections: [{
        from: String,
        to: String
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Create case-insensitive unique index for workflow names
workflowSchema.index({ name: 1 }, {
    unique: true,
    collation: { locale: 'en', strength: 2 }
});

export default mongoose.model('Workflow', workflowSchema);
