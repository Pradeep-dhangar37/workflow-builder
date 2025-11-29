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

// Calculate similarity between two strings (0-1, where 1 is identical)
function calculateSimilarity(str1, str2) {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
}

// Check for semantic matches (related words)
function checkSemanticMatch(keyword, content) {
    const semanticMap = {
        'name': ['called', 'named', 'known as', 'i am', 'my name', 'sir', 'mr', 'mrs', 'ms', 'dr'],
        'teacher': ['sir', 'professor', 'instructor', 'tutor', 'teaches', 'class', 'lecture'],
        'age': ['years old', 'born', 'birthday', 'old am i'],
        'work': ['job', 'career', 'employed', 'company', 'office'],
        'live': ['home', 'address', 'residence', 'located', 'based'],
        'like': ['love', 'enjoy', 'prefer', 'favorite', 'fond'],
        'eat': ['food', 'meal', 'diet', 'consume', 'taste'],
        'language': ['programming', 'code', 'coding', 'develop'],
        'family': ['brother', 'sister', 'parent', 'mother', 'father'],
        'subject': ['math', 'science', 'english', 'history', 'class', 'course', 'studying', 'study'],
        'math': ['mathematics', 'calculus', 'algebra', 'geometry', 'arithmetic'],
        'class': ['lecture', 'lesson', 'course', 'session', 'tomorrow', 'today'],
        'studying': ['study', 'learning', 'preparing', 'reading', 'class', 'subject']
    };

    const relatedWords = semanticMap[keyword.toLowerCase()] || [];
    let matches = 0;

    relatedWords.forEach(related => {
        if (content.toLowerCase().includes(related)) {
            matches++;
        }
    });

    return matches;
}

// Validate API key format based on provider
function validateApiKey(apiKey, provider) {
    if (!apiKey) return false;

    switch (provider) {
        case 'openai':
            return apiKey.startsWith('sk-');
        case 'google':
            return apiKey.startsWith('AIza');
        case 'anthropic':
            return apiKey.startsWith('sk-ant-');
        default:
            // For unknown providers, just check if key exists and has reasonable length
            return apiKey.length > 10;
    }
}

export async function executeWorkflow({ workflowId, inputText, file, sessionId }) {
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
        throw new Error('Workflow not found');
    }

    const results = {};
    let currentData = null;

    // Execute nodes in sequential order (no sorting needed!)
    for (let i = 0; i < workflow.nodeSequence.length; i++) {
        const node = workflow.nodeSequence[i];
        console.log(`Executing node ${i + 1}/${workflow.nodeSequence.length}: ${node.type} (${node.id})`);
        console.log(`\n=== Executing ${node.type.toUpperCase()} Node (${node.id}) ===`);
        console.log('Input data:', JSON.stringify(currentData, null, 2));

        switch (node.type) {
            case 'input':
                currentData = await executeInputNode(node, inputText, file);
                break;

            case 'store':
                currentData = await executeStoreNode(node, currentData);
                break;

            case 'rag':
                currentData = await executeRAGNode(node, currentData, sessionId);
                break;

            case 'memory':
                currentData = await executeMemoryNode(node, currentData, sessionId);
                break;

            case 'output':
                currentData = await executeOutputNode(node, currentData);
                break;

            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }

        console.log('Output data:', JSON.stringify(currentData, null, 2));
        console.log('=== Node execution completed ===\n');

        results[node.id] = currentData;
    }

    return {
        success: true,
        results,
        finalOutput: currentData
    };
}

async function executeInputNode(node, inputText, file) {
    console.log('ExecuteInputNode called with:', { hasFile: !!file, hasInputText: !!inputText });

    if (file) {
        try {
            console.log('Processing file:', file);
            const content = await fs.readFile(file.path, 'utf-8');
            await fs.unlink(file.path); // Clean up uploaded file
            console.log('File processed successfully, content length:', content.length);
            return { text: content, source: file.originalname };
        } catch (error) {
            console.error('Error processing file:', error);
            throw new Error(`Failed to process file: ${error.message}`);
        }
    }

    if (inputText) {
        console.log('Processing input text, length:', inputText.length);
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

    // Check if this looks like a question rather than content to store
    const isQuestion = /^(what|who|when|where|why|how|is|are|can|could|would|should|do|does|did|will)\s/i.test(text.trim()) ||
        text.trim().endsWith('?');

    if (isQuestion && text.trim().length < 100) {
        console.log('⚠️ Detected short question, skipping storage to avoid false matches in RAG');
        return {
            success: true,
            knowledgeBase: knowledgeBaseName,
            chunksAdded: 0,
            totalChunks: 'unchanged',
            message: `Skipped storing question "${text}" to prevent false matches in search`,
            // Pass through the original text for the next node
            text: text,
            source: source,
            workflowType: 'ingestion',
            skipped: true,
            reason: 'question_detected'
        };
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
            wordCount: content.split(/\s+/).length,
            contentType: isQuestion ? 'question' : 'document'
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
        message: `Successfully stored ${newChunks.length} chunks in "${knowledgeBaseName}"`,
        // Pass through the original text for the next node (useful for mixed workflows)
        text: text,
        source: source,
        // Add workflow type indicator
        workflowType: 'ingestion'
    };
}




async function executeRAGNode(node, inputData, sessionId) {
    console.log('\n🔍 === RAG NODE EXECUTION START ===');
    console.log('📥 RAG node received data:', JSON.stringify(inputData, null, 2));
    console.log('⚙️ RAG node config:', JSON.stringify(node.config, null, 2));

    if (!inputData) {
        throw new Error('RAG node requires input data');
    }

    // Handle different input formats
    let question;
    if (inputData.text) {
        question = inputData.text;
    } else if (typeof inputData === 'string') {
        question = inputData;
    } else if (inputData.message) {
        question = inputData.message;
    } else if (inputData.success && inputData.text) {
        // Data from Store node - use the original text as question
        question = inputData.text;
    } else if (inputData.success && inputData.knowledgeBase) {
        // Store node output without text - skip RAG and pass through
        console.log('RAG node: Received store output without text, passing through...');
        return {
            ...inputData,
            message: 'Documents stored successfully. RAG node skipped - no question provided.',
            source: 'rag_skipped'
        };
    } else {
        throw new Error('RAG node requires text input (question). Received: ' + JSON.stringify(inputData));
    }
    const { knowledgeBaseName, aiProvider, model, apiKey } = node.config || {};

    console.log('🔧 Configuration extracted:', {
        knowledgeBaseName: knowledgeBaseName || 'NOT SET',
        aiProvider: aiProvider || 'NOT SET',
        model: model || 'NOT SET',
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0,
        apiKeyStart: apiKey ? apiKey.substring(0, 10) + '...' : 'NO API KEY'
    });

    if (!knowledgeBaseName) {
        console.error('❌ ERROR: Knowledge base name is required for RAG node');
        throw new Error('Knowledge base name is required for RAG node. Please configure the RAG node with a knowledge base name.');
    }

    // 1. Retrieve relevant chunks from knowledge base
    console.log(`🗄️ Searching for knowledge base: "${knowledgeBaseName}"`);
    const kb = await KnowledgeBase.findOne({ name: knowledgeBaseName });
    if (!kb) {
        console.error(`❌ ERROR: Knowledge base "${knowledgeBaseName}" not found`);
        throw new Error(`Knowledge base "${knowledgeBaseName}" not found. Please make sure the knowledge base exists or create it first using a Store node.`);
    }
    console.log(`✅ Knowledge base found with ${kb.chunks.length} chunks`);

    // Improved relevance-based keyword search with better scoring
    const query = question.toLowerCase();

    // Extract meaningful keywords (smarter stop word filtering)
    const stopWords = ['what', 'is', 'are', 'the', 'a', 'an', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'about', 'tell', 'me', 'explain', 'please', 'help', 'find', 'show', 'give'];

    // Keep important words even if short (like "I", "my", "am")
    const importantShortWords = ['i', 'my', 'am', 'go', 'be', 'he', 'we', 'it'];

    const keywords = query
        .split(/\s+/)
        .filter(word => {
            const cleanWord = word.toLowerCase();
            return (word.length > 2 && !stopWords.includes(cleanWord)) ||
                importantShortWords.includes(cleanWord);
        });

    console.log('🔍 Search keywords extracted:', keywords);

    if (keywords.length === 0) {
        console.log('❌ No meaningful keywords found in question');
        return {
            question,
            answer: 'Please provide a more specific question with meaningful keywords.',
            chunks: [],
            source: 'no_keywords',
            llmStatus: {
                used: false,
                error: 'No meaningful keywords in question',
                provider: aiProvider || 'none',
                model: model || 'default',
                hasApiKey: !!apiKey,
                apiKeyValid: validateApiKey(apiKey, aiProvider)
            }
        };
    }

    // Score each chunk based on keyword matches with improved algorithm
    const scoredChunks = kb.chunks.map(chunk => {
        const content = chunk.content.toLowerCase();
        let score = 0;
        let keywordMatches = 0;

        // Skip chunks that are questions themselves to avoid self-matches
        const isQuestionChunk = /^(what|who|when|where|why|how|is|are|can|could|would|should|do|does|did|will)\s/i.test(content.trim()) ||
            content.trim().endsWith('?');

        // Skip very short chunks that are likely questions
        const isTooShort = content.trim().length < 50;

        // Skip chunks that are too similar to the current question
        const similarity = calculateSimilarity(question.toLowerCase(), content);
        const isTooSimilar = similarity > 0.8;

        if (isQuestionChunk || isTooShort || isTooSimilar) {
            console.log(`⏭️ Skipping chunk ${chunk.chunkIndex}: ${isQuestionChunk ? 'question' : isTooShort ? 'too short' : 'too similar'} - "${content.substring(0, 50)}..."`);
            return {
                chunk,
                score: 0,
                keywordMatches: 0,
                relevanceThreshold: 0,
                isRelevant: false,
                skipReason: isQuestionChunk ? 'question' : isTooShort ? 'too_short' : 'too_similar'
            };
        }

        keywords.forEach(keyword => {
            // Count exact word matches (not partial)
            const wordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const exactMatches = (content.match(wordRegex) || []).length;

            if (exactMatches > 0) {
                keywordMatches++;
                // Weight: more matches = higher score
                score += exactMatches * 15;

                // Bonus: keyword appears in first 100 characters (likely more relevant)
                if (content.substring(0, 100).includes(keyword)) {
                    score += 10;
                }

                // Bonus: keyword appears in title-like position (first 50 chars)
                if (content.substring(0, 50).includes(keyword)) {
                    score += 5;
                }
            }

            // Also check for partial matches but with lower weight
            const partialMatches = (content.match(new RegExp(keyword, 'gi')) || []).length - exactMatches;
            if (partialMatches > 0) {
                score += partialMatches * 3;
            }

            // Semantic matching - check for related words
            const semanticMatches = checkSemanticMatch(keyword, content);
            if (semanticMatches > 0) {
                score += semanticMatches * 8; // Medium weight for semantic matches
            }
        });

        // Very lenient relevance requirements for better matching
        const relevanceThreshold = 1; // At least 1 keyword should match
        const minimumScore = 5; // Very low minimum score threshold for maximum recall
        const isRelevant = keywordMatches >= relevanceThreshold && score >= minimumScore;

        return {
            chunk,
            score: isRelevant ? score : 0,
            keywordMatches,
            relevanceThreshold,
            isRelevant
        };
    });

    // Sort by score (highest first) and take top 3 relevant chunks
    const relevantChunks = scoredChunks
        .filter(item => item.isRelevant && item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.chunk);

    console.log('📊 Chunk relevance analysis:', {
        totalChunks: kb.chunks.length,
        keywordsSearched: keywords.length,
        chunksWithMatches: scoredChunks.filter(s => s.score > 0).length,
        relevantChunks: relevantChunks.length,
        topScores: scoredChunks
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(s => ({
                index: s.chunk.chunkIndex,
                score: s.score,
                matches: s.keywordMatches,
                relevant: s.isRelevant,
                skipReason: s.skipReason || 'none',
                preview: s.chunk.content.substring(0, 80) + '...'
            }))
    });

    // Determine response strategy based on chunk relevance
    if (relevantChunks.length === 0) {
        console.log('❌ No relevant chunks found in knowledge base');

        // Check if we should fall back to direct LLM search or return "not found"
        const shouldUseLLMFallback = aiProvider && apiKey && apiKey.startsWith('sk-');

        if (shouldUseLLMFallback) {
            console.log('🤖 No relevant chunks found, using direct LLM search...');

            try {
                // Use LLM without knowledge base context for general questions
                const directAnswer = await generateDirectAnswerWithLLM(question, aiProvider, model, apiKey);

                return {
                    question,
                    answer: `No relevant information found in the knowledge base.\n\nGeneral answer: ${directAnswer}`,
                    chunks: [],
                    source: 'llm_direct',
                    llmStatus: {
                        used: true,
                        error: null,
                        provider: aiProvider,
                        model: model || 'gpt-3.5-turbo',
                        hasApiKey: true,
                        apiKeyValid: true,
                        mode: 'direct_search'
                    }
                };
            } catch (error) {
                console.error('❌ Direct LLM search failed:', error.message);
                return {
                    question,
                    answer: 'No relevant information found in the knowledge base, and direct search is currently unavailable.',
                    chunks: [],
                    source: 'no_match',
                    llmStatus: {
                        used: false,
                        error: `Direct LLM search failed: ${error.message}`,
                        provider: aiProvider,
                        model: model || 'gpt-3.5-turbo',
                        hasApiKey: !!apiKey,
                        apiKeyValid: validateApiKey(apiKey, aiProvider)
                    }
                };
            }
        } else {
            console.log('💡 No LLM configured for fallback, returning not found message');
            return {
                question,
                answer: 'No relevant information found in the knowledge base for your question.',
                chunks: [],
                source: 'no_match',
                llmStatus: {
                    used: false,
                    error: 'No relevant chunks found and no LLM configured for fallback',
                    provider: aiProvider || 'none',
                    model: model || 'default',
                    hasApiKey: !!apiKey,
                    apiKeyValid: validateApiKey(apiKey, aiProvider)
                }
            };
        }
    }

    console.log(`✅ Found ${relevantChunks.length} relevant chunks, proceeding with context-based LLM generation`)

    // 2. Generate answer using LLM or simple text assembly
    console.log('\n🤖 === LLM GENERATION PHASE ===');
    console.log('🔍 Configuration validation:', {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0,
        apiKeyValid: apiKey ? (validateApiKey(apiKey, aiProvider) ? `Looks valid (${aiProvider} format)` : `Invalid format for ${aiProvider}`) : 'No API key',
        aiProvider: aiProvider || 'NOT SET',
        model: model || 'NOT SET (will use default)',
        chunksFound: relevantChunks.length
    });

    let answer;

    // Detailed validation
    if (!apiKey) {
        console.log('❌ REASON: No API key provided');
        console.log('💡 SOLUTION: Configure the RAG node with your OpenAI API key');
        answer = `⚠️ No API key configured. Using fallback response.\n\nBased on the knowledge base:\n\n${relevantChunks.map(c => c.content).join('\n\n')}`;
    } else if (!aiProvider) {
        console.log('❌ REASON: No AI provider specified');
        console.log('💡 SOLUTION: Set AI Provider to "openai" in RAG node configuration');
        answer = `⚠️ No AI provider configured. Using fallback response.\n\nBased on the knowledge base:\n\n${relevantChunks.map(c => c.content).join('\n\n')}`;
    } else if (!validateApiKey(apiKey, aiProvider)) {
        console.log('❌ REASON: Invalid API key format');
        console.log('🔍 DEBUG: API Key details:', {
            provider: aiProvider,
            keyLength: apiKey ? apiKey.length : 0,
            keyStart: apiKey ? apiKey.substring(0, 10) : 'NO KEY',
            keyType: typeof apiKey,
            startsWithAIza: apiKey ? apiKey.startsWith('AIza') : false
        });
        console.log(`💡 SOLUTION: ${aiProvider} API keys should have the correct format`);
        if (aiProvider === 'openai') {
            console.log('💡 OpenAI API keys should start with "sk-"');
        } else if (aiProvider === 'google') {
            console.log('💡 Google API keys should start with "AIza"');
        } else if (aiProvider === 'anthropic') {
            console.log('💡 Anthropic API keys should start with "sk-ant-"');
        }
        answer = `⚠️ Invalid API key format for ${aiProvider}. Using fallback response.\n\nBased on the knowledge base:\n\n${relevantChunks.map(c => c.content).join('\n\n')}`;
    } else {
        console.log(`✅ All validations passed! Using ${aiProvider} API`);
        console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
        console.log(`🎯 Model: ${model || 'gpt-3.5-turbo (default)'}`);
        console.log(`📝 Question: "${question}"`);
        console.log(`📚 Using ${relevantChunks.length} chunks for context`);

        try {
            console.log('🚀 Calling LLM API...');
            answer = await generateAnswerWithLLM(question, relevantChunks, aiProvider, model, apiKey);
            console.log('✅ LLM response generated successfully!');
            console.log(`📤 Response length: ${answer.length} characters`);
        } catch (error) {
            console.error('❌ LLM API call failed!');
            console.error('🔍 Error details:', {
                name: error.name,
                message: error.message,
                code: error.code,
                status: error.status,
                stack: error.stack?.split('\n')[0] // First line of stack trace
            });

            // Specific error handling
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                console.log('💡 LIKELY CAUSE: Invalid API key');
                answer = `⚠️ API Authentication Error: Invalid API key.\n\nPlease check your OpenAI API key and try again.\n\nFallback - Based on the knowledge base:\n\n${relevantChunks.map(c => c.content).join('\n\n')}`;
            } else if (error.message.includes('429') || error.message.includes('quota')) {
                console.log('💡 LIKELY CAUSE: API quota exceeded or rate limit');
                answer = `⚠️ API Quota Error: Rate limit or quota exceeded.\n\nPlease check your OpenAI account usage.\n\nFallback - Based on the knowledge base:\n\n${relevantChunks.map(c => c.content).join('\n\n')}`;
            } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
                console.log('💡 LIKELY CAUSE: Network connectivity issue');
                answer = `⚠️ Network Error: Cannot reach OpenAI API.\n\nPlease check your internet connection.\n\nFallback - Based on the knowledge base:\n\n${relevantChunks.map(c => c.content).join('\n\n')}`;
            } else {
                console.log('💡 UNKNOWN ERROR - Full details logged above');
                answer = `⚠️ LLM Error: ${error.message}\n\nFallback - Based on the knowledge base:\n\n${relevantChunks.map(c => c.content).join('\n\n')}`;
            }
        }
    }

    const result = {
        question,
        answer,
        chunks: relevantChunks.map(c => ({ content: c.content, index: c.chunkIndex })),
        source: 'rag',
        knowledgeBase: knowledgeBaseName,
        workflowType: 'query',
        // Add error information for frontend alerts
        llmStatus: {
            used: !!(apiKey && aiProvider && !answer.includes('⚠️')),
            error: answer.includes('⚠️') ? answer.split('\n')[0] : null,
            provider: aiProvider || 'none',
            model: model || 'default',
            hasApiKey: !!apiKey,
            apiKeyValid: validateApiKey(apiKey, aiProvider)
        }
    };

    console.log('\n📋 === RAG NODE EXECUTION SUMMARY ===');
    console.log('✅ RAG node completed successfully');
    console.log('📊 Final result:', {
        questionLength: question.length,
        answerLength: answer.length,
        chunksReturned: result.chunks.length,
        knowledgeBase: knowledgeBaseName,
        usedLLM: !!(apiKey && aiProvider && !answer.includes('⚠️'))
    });
    console.log('🔍 === RAG NODE EXECUTION END ===\n');

    return result;
}

// Generate answer using LLM with knowledge base context
async function generateAnswerWithLLM(question, chunks, provider, model, apiKey) {
    console.log('\n🔧 === CONTEXT-BASED LLM API CALL ===');

    const context = chunks.map(c => c.content).join('\n\n');
    const prompt = `Answer the following question based ONLY on the provided context. If the context doesn't contain enough information to answer the question, say so clearly.

Context:
${context}

Question: ${question}

Answer:`;

    console.log('📋 Context-based prompt details:', {
        contextLength: context.length,
        promptLength: prompt.length,
        chunksUsed: chunks.length,
        questionLength: question.length
    });

    return await callLLMAPI(prompt, provider, model, apiKey, 'context-based');
}

// Generate direct answer using LLM without knowledge base context
async function generateDirectAnswerWithLLM(question, provider, model, apiKey) {
    console.log('\n🔧 === DIRECT LLM API CALL ===');

    const prompt = `Answer the following question directly and concisely:

Question: ${question}

Answer:`;

    console.log('📋 Direct prompt details:', {
        promptLength: prompt.length,
        questionLength: question.length,
        mode: 'direct_search'
    });

    return await callLLMAPI(prompt, provider, model, apiKey, 'direct');
}

// Unified LLM API calling function
async function callLLMAPI(prompt, provider, model, apiKey, mode) {

    try {
        if (provider === 'openai') {
            console.log(`🤖 Initializing OpenAI client for ${mode} mode...`);
            console.log('🔑 API Key validation:', {
                keyStart: apiKey.substring(0, 10),
                keyEnd: apiKey.substring(apiKey.length - 4),
                keyLength: apiKey.length,
                startsWithSk: apiKey.startsWith('sk-'),
                hasProj: apiKey.includes('proj')
            });

            const OpenAI = (await import('openai')).default;
            const openai = new OpenAI({
                apiKey: apiKey.trim() // Remove any whitespace
            });

            const requestModel = model || 'gpt-3.5-turbo';
            console.log('📤 Sending request to OpenAI API...');
            console.log('🎯 Request parameters:', {
                model: requestModel,
                promptLength: prompt.length,
                maxTokens: mode === 'direct' ? 300 : 500,
                temperature: mode === 'direct' ? 0.3 : 0.7,
                messagesCount: 1,
                mode: mode
            });

            const startTime = Date.now();
            const response = await openai.chat.completions.create({
                model: requestModel,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: mode === 'direct' ? 300 : 500,
                temperature: mode === 'direct' ? 0.3 : 0.7
            });
            const endTime = Date.now();

            console.log('📥 OpenAI response received successfully!');
            console.log('⏱️ Response time:', `${endTime - startTime}ms`);
            console.log('📊 Response details:', {
                choices: response.choices?.length || 0,
                finishReason: response.choices?.[0]?.finish_reason,
                usage: response.usage,
                model: response.model,
                responseLength: response.choices?.[0]?.message?.content?.length || 0,
                mode: mode
            });

            const generatedAnswer = response.choices[0].message.content;
            console.log(`✅ Generated ${mode} answer preview:`, generatedAnswer.substring(0, 100) + '...');

            return generatedAnswer;
        }

        if (provider === 'google') {
            console.log(`🤖 Using Google Gemini API for ${mode} mode...`);

            // Use environment variable as fallback for Google API key


            // Use correct model names for Gemini
            const geminiModel = model || 'gemini-2.5-flash';
            console.log('🎯 Using Gemini model:', geminiModel);

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        maxOutputTokens: mode === 'direct' ? 300 : 500,
                        temperature: mode === 'direct' ? 0.3 : 0.7
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Google API Error Response:', errorText);
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
                }
                throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            console.log('📥 Gemini response received:', {
                hasCandidates: !!data.candidates,
                candidatesLength: data.candidates?.length || 0,
                hasContent: !!(data.candidates?.[0]?.content),
                model: geminiModel
            });

            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const content = data.candidates[0].content;
                console.log('📋 Content structure:', JSON.stringify(content, null, 2));

                // Check if content has parts array
                if (content.parts && content.parts[0] && content.parts[0].text) {
                    return content.parts[0].text;
                } else if (content.text) {
                    // Some responses might have text directly
                    return content.text;
                } else {
                    console.error('❌ No text found in content:', content);
                    throw new Error('No text content found in Gemini response');
                }
            } else {
                console.error('❌ Invalid Gemini response format:', JSON.stringify(data, null, 2));
                throw new Error('Invalid response format from Gemini API');
            }
        }

        if (provider === 'anthropic') {
            console.log(`🤖 Using Anthropic Claude API for ${mode} mode...`);
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model || 'claude-3-sonnet-20240229',
                    max_tokens: mode === 'direct' ? 300 : 500,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Claude API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.content[0].text;
        }

        // Fallback for unsupported providers
        throw new Error(`Unsupported AI provider: ${provider}`);

    } catch (error) {
        console.error(`❌ LLM API Error (${provider}, ${mode} mode):`, error);
        throw error; // Re-throw to be handled by calling function
    }
}

async function executeMemoryNode(node, inputData, sessionId) {
    console.log('Memory node received data:', inputData);

    if (!inputData) {
        throw new Error('Memory node requires input data');
    }

    // Handle different input formats
    if (inputData.question && inputData.answer) {
        // Standard RAG output
        const { question, answer } = inputData;
    } else if (inputData.success && inputData.knowledgeBase) {
        // Store node output - skip memory and pass through
        console.log('Memory node: Received store output, passing through...');
        return {
            ...inputData,
            message: inputData.message + ' Memory node skipped - no conversation to store.',
            source: 'memory_skipped'
        };
    } else {
        // Pass through other data types
        console.log('Memory node: No question/answer found, passing through data...');
        return {
            ...inputData,
            source: 'memory_passthrough'
        };
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

    const config = node.config || {};
    const outputFormat = config.format || 'detailed'; // detailed, summary, json, text
    const includeMetadata = config.includeMetadata !== false; // default true
    const customFields = config.customFields || [];

    // Different output formatting based on configuration
    let formattedOutput;

    switch (outputFormat) {
        case 'summary':
            formattedOutput = createSummaryOutput(inputData, config);
            break;
        case 'json':
            formattedOutput = createJsonOutput(inputData, config);
            break;
        case 'text':
            formattedOutput = createTextOutput(inputData, config);
            break;
        case 'detailed':
        default:
            formattedOutput = createDetailedOutput(inputData, config);
            break;
    }

    return {
        type: 'output',
        format: outputFormat,
        data: inputData,
        formatted: formattedOutput,
        metadata: includeMetadata ? {
            processedAt: new Date().toISOString(),
            nodeId: node.id,
            workflowStep: 'final_output',
            dataSize: JSON.stringify(inputData).length
        } : undefined
    };
}

// Helper functions for different output formats
function createDetailedOutput(inputData, config) {
    const output = {
        timestamp: new Date().toISOString(),
        workflowType: determineWorkflowType(inputData)
    };

    // Query Workflow Output (Input -> RAG -> Memory -> Output)
    if (inputData.question && inputData.answer) {
        output.type = 'Query Result';
        output.question = inputData.question;
        output.answer = inputData.answer;
        output.sessionId = inputData.sessionId || 'N/A';
        output.source = inputData.source || 'rag';

        // Include retrieved chunks if available
        if (inputData.chunks && inputData.chunks.length > 0) {
            output.sourceChunks = inputData.chunks.map(chunk => ({
                content: chunk.content.substring(0, 100) + '...',
                index: chunk.index
            }));
        }

        // Include conversation context
        if (inputData.conversationHistory) {
            output.conversationLength = inputData.conversationHistory.length;
            output.previousQuestions = inputData.conversationHistory
                .filter(msg => msg.role === 'user')
                .slice(-3) // Last 3 questions
                .map(msg => msg.content.substring(0, 50) + '...');
        }
    }
    // Ingestion Workflow Output (Input -> Store)
    else if (inputData.knowledgeBase && inputData.chunksAdded !== undefined) {
        output.type = 'Ingestion Result';
        output.knowledgeBase = inputData.knowledgeBase;
        output.chunksAdded = inputData.chunksAdded;
        output.totalChunks = inputData.totalChunks;
        output.message = inputData.message || 'Documents successfully processed and stored';
        output.source = inputData.source || 'store';
    }
    // Generic processing result
    else {
        output.type = 'Processing Result';
        output.result = 'Workflow completed successfully';
        output.data = inputData;
    }

    return output;
}

function determineWorkflowType(inputData) {
    if (inputData.question && inputData.answer) {
        return 'Query Workflow (Input -> RAG -> Memory -> Output)';
    } else if (inputData.knowledgeBase && inputData.chunksAdded !== undefined) {
        return 'Ingestion Workflow (Input -> Store -> Output)';
    } else {
        return 'Custom Workflow';
    }
}

function createSummaryOutput(inputData, config) {
    const summary = {
        timestamp: new Date().toISOString(),
        workflowType: determineWorkflowType(inputData)
    };

    // Query Workflow Summary
    if (inputData.question && inputData.answer) {
        summary.type = 'Query Result';
        summary.question = inputData.question.length > 100 ?
            inputData.question.substring(0, 100) + '...' : inputData.question;
        summary.answer = inputData.answer.length > 200 ?
            inputData.answer.substring(0, 200) + '...' : inputData.answer;
        summary.hasConversationHistory = !!(inputData.conversationHistory && inputData.conversationHistory.length > 0);
        summary.sourceChunksCount = inputData.chunks ? inputData.chunks.length : 0;
    }
    // Ingestion Workflow Summary
    else if (inputData.knowledgeBase && inputData.chunksAdded !== undefined) {
        summary.type = 'Ingestion Complete';
        summary.knowledgeBase = inputData.knowledgeBase;
        summary.chunksAdded = inputData.chunksAdded;
        summary.status = 'Success';
    }
    // Generic Summary
    else {
        summary.type = 'Processing Complete';
        summary.status = 'Success';
        summary.result = 'Workflow executed successfully';
    }

    return summary;
}

function createJsonOutput(inputData, config) {
    // Clean JSON output without extra formatting
    const cleanData = { ...inputData };
    delete cleanData.conversationHistory; // Remove verbose history
    return cleanData;
}

function createTextOutput(inputData, config) {
    let textOutput = '';
    const customTitle = config.title || '';

    if (customTitle) {
        textOutput += `${customTitle}\n${'='.repeat(customTitle.length)}\n\n`;
    }

    // Query Workflow Text Output
    if (inputData.question && inputData.answer) {
        textOutput += `QUESTION:\n${inputData.question}\n\n`;
        textOutput += `ANSWER:\n${inputData.answer}\n\n`;

        if (inputData.sessionId) {
            textOutput += `Session ID: ${inputData.sessionId}\n`;
        }

        if (inputData.chunks && inputData.chunks.length > 0) {
            textOutput += `\nSource Information:\n`;
            textOutput += `- Retrieved ${inputData.chunks.length} relevant chunks\n`;
        }

        if (inputData.conversationHistory && inputData.conversationHistory.length > 0) {
            textOutput += `- Conversation history: ${inputData.conversationHistory.length} messages\n`;
        }
    }
    // Ingestion Workflow Text Output
    else if (inputData.knowledgeBase && inputData.chunksAdded !== undefined) {
        textOutput += `DOCUMENT INGESTION COMPLETE\n\n`;
        textOutput += `Knowledge Base: ${inputData.knowledgeBase}\n`;
        textOutput += `Chunks Added: ${inputData.chunksAdded}\n`;
        textOutput += `Total Chunks: ${inputData.totalChunks || 'N/A'}\n`;
        textOutput += `Status: Success\n`;

        if (inputData.message) {
            textOutput += `\nDetails: ${inputData.message}\n`;
        }
    }
    // Generic Text Output
    else {
        textOutput += `WORKFLOW EXECUTION COMPLETE\n\n`;
        textOutput += `Status: Success\n`;
        textOutput += `Completed at: ${new Date().toISOString()}\n`;
    }

    textOutput += `\nProcessed at: ${new Date().toLocaleString()}`;

    return { text: textOutput };
}
