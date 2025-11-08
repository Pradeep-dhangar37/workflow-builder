import fs from 'fs/promises';
import Workflow from '../models/Workflow.js';
import KnowledgeBase from '../models/KnowledgeBase.js';
import Conversation from '../models/Conversation.js';

// Split text into chunks of 200-300 words
function chunkText(text, minWords = 200, maxWords = 300) {
    const words = text.split(/\s+/);
    const chunks = [];
    let currentChunk = [];

    for (let i = 0; i < words.length; i++) {
        currentChunk.push(words[i]);

        if (currentChunk.length >= minWords &&
            (currentChunk.length >= maxWords || i === words.length - 1)) {
            chunks.push(currentChunk.join(' '));
            currentChunk = [];
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
    }

    return chunks;
}

export async function executeWorkflow({ workflowId, inputText, file, sessionId }) {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
        throw new Error('Workflow not found');
    }

    const results = {};
    let currentData = null;

    // Sort nodes by connections (simple linear flow)
    const sortedNodes = sortNodesByConnections(workflow.nodes, workflow.connections);

    for (const node of sortedNodes) {
        console.log(`Executing node: ${node.type} (${node.id})`);
        console.log('Current data before execution:', currentData);

        switch (node.type) {
            case 'input':
                currentData = await executeInputNode(node, inputText, file);
                console.log('Input node output:', currentData);
                break;

            case 'store':
                currentData = await executeStoreNode(node, currentData);
                console.log('Store node output:', currentData);
                break;

            case 'rag':
                currentData = await executeRAGNode(node, currentData, sessionId);
                console.log('RAG node output:', currentData);
                break;

            case 'memory':
                currentData = await executeMemoryNode(node, currentData, sessionId);
                console.log('Memory node output:', currentData);
                break;

            case 'output':
                currentData = await executeOutputNode(node, currentData);
                console.log('Output node output:', currentData);
                break;

            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }

        results[node.id] = currentData;
    }

    return {
        success: true,
        results,
        finalOutput: currentData
    };
}

async function executeInputNode(node, inputText, file) {
    if (file) {
        const content = await fs.readFile(file.path, 'utf-8');
        await fs.unlink(file.path); // Clean up uploaded file
        return { text: content, source: file.originalname };
    }

    if (inputText) {
        return { text: inputText, source: 'user_input' };
    }

    throw new Error('Input node requires either text or file');
}

async function executeStoreNode(node, inputData) {
    console.log('Store node received data:', inputData);
    console.log('Store node config:', node.config);

    if (!inputData) {
        throw new Error('Store node did not receive any input data. Make sure it is connected to an Input node.');
    }

    const { text, source } = inputData;
    const { knowledgeBaseName, createNew } = node.config;

    console.log('Knowledge base name from config:', knowledgeBaseName);

    if (!knowledgeBaseName || knowledgeBaseName.trim() === '') {
        throw new Error('Knowledge base name is required for Store node. Please configure the Store node with a KB name.');
    }

    // Find or create knowledge base
    let kb = await KnowledgeBase.findOne({ name: knowledgeBaseName });

    if (!kb) {
        if (createNew) {
            kb = new KnowledgeBase({
                name: knowledgeBaseName,
                description: `Created from workflow execution`,
                chunks: []
            });
        } else {
            throw new Error(`Knowledge base "${knowledgeBaseName}" not found`);
        }
    }

    // Split text into chunks
    const textChunks = chunkText(text);

    // Add chunks to knowledge base
    const startIndex = kb.chunks.length;
    const newChunks = textChunks.map((content, index) => ({
        content,
        chunkIndex: startIndex + index,
        sourceReference: source,
        metadata: {
            addedAt: new Date(),
            wordCount: content.split(/\s+/).length
        }
    }));

    kb.chunks.push(...newChunks);
    kb.updatedAt = new Date();
    await kb.save();

    return {
        success: true,
        knowledgeBase: knowledgeBaseName,
        chunksAdded: newChunks.length,
        totalChunks: kb.chunks.length,
        message: `Successfully stored ${newChunks.length} chunks in "${knowledgeBaseName}"`
    };
}

function sortNodesByConnections(nodes, connections) {
    console.log('Sorting nodes:', nodes.map(n => ({ id: n.id, type: n.type })));
    console.log('Connections:', connections);

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const sorted = [];
    const visited = new Set();

    // Find the starting node (node with no incoming connections)
    const hasIncoming = new Set(connections.map(c => c.to));
    console.log('Nodes with incoming connections:', Array.from(hasIncoming));

    const startNode = nodes.find(n => !hasIncoming.has(n.id));
    console.log('Start node:', startNode ? { id: startNode.id, type: startNode.type } : 'NONE');

    if (!startNode) {
        // If no connections, just return nodes in order (input first)
        if (connections.length === 0) {
            return nodes.sort((a, b) => {
                const order = { input: 0, store: 1, rag: 2, memory: 3, output: 4 };
                return (order[a.type] || 99) - (order[b.type] || 99);
            });
        }
        throw new Error('No starting node found in workflow');
    }

    // Simple traversal
    let current = startNode;
    while (current && !visited.has(current.id)) {
        sorted.push(current);
        visited.add(current.id);

        const nextConnection = connections.find(c => c.from === current.id);
        current = nextConnection ? nodeMap.get(nextConnection.to) : null;
    }

    console.log('Sorted nodes:', sorted.map(n => ({ id: n.id, type: n.type })));
    return sorted;
}


async function executeRAGNode(node, inputData, sessionId) {
    console.log('RAG node received data:', inputData);
    console.log('RAG node config:', node.config);

    if (!inputData || !inputData.text) {
        throw new Error('RAG node requires text input (question)');
    }

    const { text: question } = inputData;
    const { knowledgeBaseName, aiProvider, model, apiKey } = node.config;

    if (!knowledgeBaseName) {
        throw new Error('Knowledge base name is required for RAG node');
    }

    // 1. Retrieve relevant chunks from knowledge base
    const kb = await KnowledgeBase.findOne({ name: knowledgeBaseName });
    if (!kb) {
        throw new Error(`Knowledge base "${knowledgeBaseName}" not found`);
    }

    // Relevance-based keyword search with scoring
    const query = question.toLowerCase();

    // Extract meaningful keywords (remove common stop words)
    const stopWords = ['what', 'is', 'are', 'the', 'a', 'an', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'about', 'tell', 'me', 'explain'];
    const keywords = query
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));

    console.log('Search keywords:', keywords);

    // Score each chunk based on keyword matches
    const scoredChunks = kb.chunks.map(chunk => {
        const content = chunk.content.toLowerCase();
        let score = 0;

        keywords.forEach(keyword => {
            // Count occurrences of each keyword
            const regex = new RegExp(keyword, 'gi');
            const matches = (content.match(regex) || []).length;

            // Weight: more matches = higher score
            score += matches * 10;

            // Bonus: keyword appears in first 100 characters (likely more relevant)
            if (content.substring(0, 100).includes(keyword)) {
                score += 5;
            }
        });

        return { chunk, score };
    });

    // Sort by score (highest first) and take top 3
    const relevantChunks = scoredChunks
        .filter(item => item.score > 0) // Only chunks with matches
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.chunk);

    console.log('Chunk scores:', scoredChunks.map(s => ({ index: s.chunk.chunkIndex, score: s.score })));

    if (relevantChunks.length === 0) {
        return {
            question,
            answer: 'No relevant information found in the knowledge base.',
            chunks: [],
            source: 'no_match'
        };
    }

    // 2. Generate answer using LLM or simple text assembly
    let answer;
    if (apiKey && aiProvider) {
        // Use LLM (OpenAI example)
        answer = await generateAnswerWithLLM(question, relevantChunks, aiProvider, model, apiKey);
    } else {
        // Simple text assembly fallback
        answer = `Based on the knowledge base:\n\n${relevantChunks.map(c => c.content).join('\n\n')}`;
    }

    return {
        question,
        answer,
        chunks: relevantChunks.map(c => ({ content: c.content, index: c.chunkIndex })),
        source: 'rag'
    };
}

async function generateAnswerWithLLM(question, chunks, provider, model, apiKey) {
    if (provider === 'openai') {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey });

        const context = chunks.map(c => c.content).join('\n\n');
        const prompt = `Answer the following question based on the provided context:\n\nContext:\n${context}\n\nQuestion: ${question}\n\nAnswer:`;

        const response = await openai.chat.completions.create({
            model: model || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500
        });

        return response.choices[0].message.content;
    }

    // Fallback for other providers
    return `Answer based on context: ${chunks[0].content.substring(0, 200)}...`;
}

async function executeMemoryNode(node, inputData, sessionId) {
    console.log('Memory node received data:', inputData);

    if (!inputData || !inputData.question || !inputData.answer) {
        throw new Error('Memory node requires question and answer from RAG node');
    }

    const { question, answer } = inputData;
    const sid = node.config.sessionId || sessionId || `session_${Date.now()}`;

    // Find or create conversation
    let conversation = await Conversation.findOne({ sessionId: sid });
    if (!conversation) {
        conversation = new Conversation({
            sessionId: sid,
            messages: []
        });
    }

    // Add new messages
    conversation.messages.push(
        { role: 'user', content: question, timestamp: new Date() },
        { role: 'assistant', content: answer, timestamp: new Date() }
    );

    // Keep only last 10 exchanges (20 messages)
    if (conversation.messages.length > 20) {
        conversation.messages = conversation.messages.slice(-20);
    }

    conversation.updatedAt = new Date();
    await conversation.save();

    return {
        ...inputData,
        sessionId: sid,
        conversationHistory: conversation.messages,
        source: 'memory'
    };
}

async function executeOutputNode(node, inputData) {
    console.log('Output node received data:', inputData);

    if (!inputData) {
        throw new Error('Output node did not receive any data');
    }

    // Format the output for display
    return {
        type: 'output',
        data: inputData,
        formatted: {
            question: inputData.question || 'N/A',
            answer: inputData.answer || 'N/A',
            sessionId: inputData.sessionId || 'N/A',
            timestamp: new Date().toISOString()
        }
    };
}
