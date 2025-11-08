import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
    content: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    sourceReference: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
});

const knowledgeBaseSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    chunks: [chunkSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

knowledgeBaseSchema.index({ 'chunks.content': 'text' });

export default mongoose.model('KnowledgeBase', knowledgeBaseSchema);
