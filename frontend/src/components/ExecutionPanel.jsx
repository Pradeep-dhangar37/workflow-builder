import { useState } from 'react';
import { API_BASE_URL } from '../config.js';

function ExecutionPanel({ result, isExecuting, onExecute, currentWorkflowId, nodeSequence }) {
    const [inputText, setInputText] = useState('');
    const [file, setFile] = useState(null);
    const [isExecutingLocal, setIsExecutingLocal] = useState(false);

    const handleExecute = async () => {
        if (!currentWorkflowId) {
            alert('Please save the workflow first');
            return;
        }

        console.log('🚀 Starting execution...');
        console.log('📋 Execution details:', {
            workflowId: currentWorkflowId,
            hasFile: !!file,
            hasInputText: !!inputText,
            inputTextLength: inputText?.length || 0,
            apiBaseUrl: API_BASE_URL
        });

        setIsExecutingLocal(true);
        try {
            const formData = new FormData();
            formData.append('workflowId', currentWorkflowId);

            if (file) {
                formData.append('file', file);
                console.log('📎 Uploading file:', file.name);
            } else if (inputText) {
                formData.append('inputText', inputText);
                console.log('📝 Sending text input:', inputText.substring(0, 50) + '...');
            } else {
                alert('Please provide input text or file');
                setIsExecutingLocal(false);
                return;
            }

            console.log('📤 Sending request to:', `${API_BASE_URL}/api/executions`);
            const response = await fetch(`${API_BASE_URL}/api/executions`, {
                method: 'POST',
                body: formData
            });

            console.log('📥 Response received:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Execution failed');
            }

            // Check for LLM errors and show user-friendly alerts
            if (result.finalOutput?.llmStatus) {
                const llmStatus = result.finalOutput.llmStatus;

                if (!llmStatus.used && llmStatus.error) {
                    // Show specific error alert
                    if (llmStatus.error.includes('No API key')) {
                        alert('⚠️ ChatGPT Not Used: No API key configured\n\nPlease configure your OpenAI API key in the RAG node settings.');
                    } else if (llmStatus.error.includes('No AI provider')) {
                        alert('⚠️ ChatGPT Not Used: No AI provider selected\n\nPlease set AI Provider to "openai" in the RAG node configuration.');
                    } else if (llmStatus.error.includes('Invalid API key format')) {
                        alert('⚠️ ChatGPT Not Used: Invalid API key format\n\nOpenAI API keys should start with "sk-". Please check your API key.');
                    } else if (llmStatus.error.includes('Authentication Error')) {
                        alert('⚠️ ChatGPT Error: Invalid API key\n\nYour API key is not valid or has been revoked. Please check your OpenAI account.');
                    } else if (llmStatus.error.includes('Quota Error')) {
                        alert('⚠️ ChatGPT Error: API quota exceeded\n\nYou have exceeded your OpenAI API usage limit. Please check your account billing.');
                    } else if (llmStatus.error.includes('Network Error')) {
                        alert('⚠️ ChatGPT Error: Network connection failed\n\nCannot reach OpenAI servers. Please check your internet connection.');
                    } else {
                        alert(`⚠️ ChatGPT Error: ${llmStatus.error}\n\nUsing fallback response instead.`);
                    }
                } else if (llmStatus.used) {
                    // Success message (optional - you can remove this if too noisy)
                    console.log('✅ ChatGPT successfully generated response using', llmStatus.provider, llmStatus.model);
                }
            }

            // Check for LLM errors and show user-friendly alerts
            if (result.finalOutput?.llmStatus && !result.finalOutput.llmStatus.used) {
                const llmStatus = result.finalOutput.llmStatus;

                if (llmStatus.error?.includes('No API key')) {
                    alert('⚠️ ChatGPT Not Used: No API key configured\n\nPlease configure your OpenAI API key in the RAG node settings.');
                } else if (llmStatus.error?.includes('No AI provider')) {
                    alert('⚠️ ChatGPT Not Used: No AI provider selected\n\nPlease set AI Provider to "openai" in the RAG node configuration.');
                } else if (llmStatus.error?.includes('Invalid API key format')) {
                    alert('⚠️ ChatGPT Not Used: Invalid API key format\n\nOpenAI API keys should start with "sk-". Please check your API key.');
                } else if (llmStatus.error?.includes('Authentication Error')) {
                    alert('⚠️ ChatGPT Error: Invalid API key\n\nYour API key is not valid or has been revoked. Please check your OpenAI account.');
                } else if (llmStatus.error?.includes('Quota Error')) {
                    alert('⚠️ ChatGPT Error: API quota exceeded\n\nYou have exceeded your OpenAI API usage limit. Please check your account billing.');
                } else if (llmStatus.error?.includes('Network Error')) {
                    alert('⚠️ ChatGPT Error: Network connection failed\n\nCannot reach OpenAI servers. Please check your internet connection.');
                } else if (llmStatus.error) {
                    alert(`⚠️ ChatGPT Error: ${llmStatus.error}\n\nUsing fallback response instead.`);
                }
            }

            onExecute(result);
            setInputText('');
            setFile(null);
        } catch (error) {
            alert('Execution failed: ' + error.message);
            onExecute({ error: error.message });
        } finally {
            setIsExecutingLocal(false);
        }
    };
    const executing = isExecuting || isExecutingLocal;

    return (
        <div className="w-[400px] bg-gray-800 border-l border-gray-700 p-5 overflow-y-auto">
            {/* Execute Form */}
            <div className="mb-6">
                <h3 className="m-0 mb-4 text-sm uppercase text-gray-400">Execute Workflow</h3>

                <div className="space-y-4">
                    {/* Input Text */}
                    <div>
                        <label className="block mb-2 text-sm text-gray-300">Input Text</label>
                        <textarea
                            rows={4}
                            placeholder="Enter text to process..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            disabled={!!file || executing}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 resize-none"
                        />
                    </div>

                    {/* OR Divider */}
                    <div className="text-center text-gray-400 text-sm">OR</div>

                    {/* File Upload */}
                    <div>
                        <label className="block mb-2 text-sm text-gray-300">Upload File (.txt)</label>
                        <input
                            type="file"
                            accept=".txt"
                            onChange={(e) => setFile(e.target.files[0])}
                            disabled={!!inputText || executing}
                            className="w-full text-sm text-gray-300 disabled:opacity-50"
                        />
                        {file && (
                            <div className="mt-2 text-xs text-teal-400">
                                📄 Selected: {file.name}
                            </div>
                        )}
                    </div>

                    {/* Execute Button */}
                    <button
                        onClick={handleExecute}
                        disabled={executing || (!inputText && !file) || !currentWorkflowId}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                        {executing ? 'Executing...' : 'Execute Workflow'}
                    </button>
                </div>
            </div>

            {/* Execution Status */}
            {executing && (
                <div className="mb-6">
                    <h3 className="m-0 mb-4 text-sm uppercase text-gray-400">Execution Status</h3>
                    <div className="flex flex-col items-center gap-4 py-6">
                        <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-sm text-gray-300">Executing workflow...</p>
                    </div>
                </div>
            )}

            {/* Results Section */}
            <div>
                <h3 className="m-0 mb-4 text-sm uppercase text-gray-400">Execution Results</h3>

                {!result && !executing && (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        No execution results yet. Run a workflow to see results here.
                    </div>
                )}

                {/* Debug info */}
                {result && (
                    <details className="mb-4 p-2 bg-gray-800 rounded text-xs">
                        <summary className="cursor-pointer text-gray-400">🔍 Debug: Result Structure</summary>
                        <pre className="mt-2 text-gray-300 overflow-auto">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </details>
                )}

                {/* Workflow Debug Info */}
                <details className="mb-4 p-2 bg-gray-800 rounded text-xs">
                    <summary className="cursor-pointer text-gray-400">⚙️ Debug: Current Workflow Config</summary>
                    <div className="mt-2 text-gray-300">
                        <div><strong>Workflow ID:</strong> {currentWorkflowId || 'Not saved'}</div>
                        <div><strong>API Base URL:</strong> {API_BASE_URL}</div>
                        <div className="mt-2"><strong>Nodes Configuration:</strong></div>
                        <pre className="text-xs overflow-auto">
                            {JSON.stringify(nodeSequence?.map(node => ({
                                id: node.id,
                                type: node.type,
                                config: node.config
                            })), null, 2)}
                        </pre>
                    </div>
                </details>

                {result?.error && (
                    <div className="p-4 rounded-md text-sm bg-red-900/30 border border-red-800">
                        <strong>Error:</strong> {result.error}
                    </div>
                )}

                {result && !result.error && (
                    <>
                        {/* Debug: Log the result structure */}
                        {/* Output Node Results Display - Check for Output node results */}
                        {(result.finalOutput?.type === 'output' ||
                            (result.finalOutput?.formatted && (result.finalOutput?.formatted.type === 'Query Result' || result.finalOutput?.formatted.type === 'Ingestion Result'))) && (
                                <div className="space-y-4">
                                    {/* Workflow Type Header */}
                                    {result.finalOutput.formatted.workflowType && (
                                        <div className="p-3 rounded bg-gray-700/50 border border-gray-600">
                                            <div className="text-xs uppercase text-gray-400">Workflow Type</div>
                                            <div className="text-sm text-white">{result.finalOutput.formatted.workflowType}</div>
                                        </div>
                                    )}

                                    {/* Query Workflow Results */}
                                    {result.finalOutput.formatted.type === 'Query Result' && (
                                        <>
                                            <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-700">
                                                <div className="text-xs uppercase text-blue-400 mb-2">Question</div>
                                                <div className="text-white text-sm leading-relaxed">
                                                    {result.finalOutput.formatted.question}
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-lg bg-green-900/30 border border-green-700">
                                                <div className="text-xs uppercase text-green-400 mb-2">Answer</div>
                                                <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                                                    {result.finalOutput.formatted.answer}
                                                </div>
                                            </div>

                                            {/* Conversation Context */}
                                            {result.finalOutput.formatted.conversationLength > 0 && (
                                                <div className="p-3 rounded bg-purple-900/30 border border-purple-700">
                                                    <div className="text-xs uppercase text-purple-400 mb-2">Conversation Context</div>
                                                    <div className="text-sm text-gray-300">
                                                        {result.finalOutput.formatted.conversationLength} messages in history
                                                    </div>
                                                    {result.finalOutput.formatted.previousQuestions && (
                                                        <div className="mt-2 text-xs text-gray-400">
                                                            Recent questions: {result.finalOutput.formatted.previousQuestions.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Source Chunks */}
                                            {result.finalOutput.formatted.sourceChunks && result.finalOutput.formatted.sourceChunks.length > 0 && (
                                                <details className="p-3 rounded bg-gray-700/50 border border-gray-600">
                                                    <summary className="text-xs uppercase text-gray-400 cursor-pointer hover:text-white">
                                                        📚 Retrieved Sources ({result.finalOutput.formatted.sourceChunks.length})
                                                    </summary>
                                                    <div className="mt-3 space-y-2">
                                                        {result.finalOutput.formatted.sourceChunks.map((chunk, idx) => (
                                                            <div key={idx} className="p-2 bg-gray-800 rounded text-xs text-gray-300">
                                                                <div className="text-gray-500 mb-1">Chunk {chunk.index}</div>
                                                                <div>{chunk.content}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            )}
                                        </>
                                    )}

                                    {/* Ingestion Workflow Results */}
                                    {result.finalOutput.formatted.type === 'Ingestion Result' && (
                                        <div className="p-4 rounded-lg bg-green-900/30 border border-green-700">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-2xl">✅</span>
                                                <span className="text-green-400 font-semibold">Document Ingestion Complete</span>
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div>
                                                    <span className="text-gray-400">Knowledge Base:</span>
                                                    <span className="text-white ml-2 font-medium">{result.finalOutput.formatted.knowledgeBase}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Chunks Added:</span>
                                                    <span className="text-teal-400 ml-2 font-bold">{result.finalOutput.formatted.chunksAdded}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Total Chunks:</span>
                                                    <span className="text-white ml-2">{result.finalOutput.formatted.totalChunks}</span>
                                                </div>
                                                {result.finalOutput.formatted.message && (
                                                    <div className="pt-2 border-t border-green-700 text-xs text-gray-300">
                                                        {result.finalOutput.formatted.message}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Text Format Display */}
                                    {result.finalOutput.format === 'text' && result.finalOutput.formatted.text && (
                                        <div className="p-4 rounded-lg bg-gray-800 border border-gray-600">
                                            <div className="text-xs uppercase text-gray-400 mb-2">Text Output</div>
                                            <pre className="text-sm text-white whitespace-pre-wrap font-mono">
                                                {result.finalOutput.formatted.text}
                                            </pre>
                                        </div>
                                    )}

                                    {/* Metadata */}
                                    {result.finalOutput.metadata && (
                                        <div className="p-3 rounded bg-gray-700/50 border border-gray-600">
                                            <div className="text-xs uppercase text-gray-400 mb-2">Processing Info</div>
                                            <div className="text-xs text-gray-300 space-y-1">
                                                <div>Processed: {new Date(result.finalOutput.metadata.processedAt).toLocaleString()}</div>
                                                <div>Format: {result.finalOutput.format || 'detailed'}</div>
                                                {result.finalOutput.metadata.dataSize && (
                                                    <div>Data Size: {result.finalOutput.metadata.dataSize} bytes</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        {/* Fallback for non-Output node results */}
                        {result.finalOutput && result.finalOutput.type !== 'output' && result.finalOutput?.question && result.finalOutput?.answer && (
                            <div className="space-y-4">
                                <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-700">
                                    <div className="text-xs uppercase text-blue-400 mb-2">Question</div>
                                    <div className="text-white text-sm leading-relaxed">
                                        {result.finalOutput.question}
                                    </div>
                                </div>
                                <div className="p-4 rounded-lg bg-green-900/30 border border-green-700">
                                    <div className="text-xs uppercase text-green-400 mb-2">Answer</div>
                                    <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                                        {result.finalOutput.answer}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Ingestion Workflow Display */}
                        {result.finalOutput?.knowledgeBase && result.finalOutput?.chunksAdded !== undefined && !result.finalOutput?.question && (
                            <div className="p-4 rounded-md text-sm bg-green-900/30 border border-green-800 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">✅</span>
                                    <span className="text-green-400 font-semibold">Successfully Stored!</span>
                                </div>

                                <div className="space-y-2">
                                    <div>
                                        <span className="text-gray-400">Knowledge Base:</span>
                                        <span className="text-white ml-2 font-medium">{result.finalOutput.knowledgeBase}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Chunks Added:</span>
                                        <span className="text-teal-400 ml-2 font-bold">{result.finalOutput.chunksAdded}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Total Chunks:</span>
                                        <span className="text-white ml-2">{result.finalOutput.totalChunks}</span>
                                    </div>
                                </div>

                                {result.finalOutput.message && (
                                    <div className="pt-3 border-t border-green-700 text-xs text-gray-300">
                                        {result.finalOutput.message}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Generic Display (fallback) */}
                        {!result.finalOutput?.question && !result.finalOutput?.knowledgeBase && (
                            <div className="p-4 rounded-md text-sm bg-green-900/30 border border-green-800">
                                <div className="mb-4">
                                    <strong className="block mb-1 text-teal-400">Status:</strong>
                                    {result.success ? '✅ Success' : '❌ Failed'}
                                </div>

                                {result.finalOutput && (
                                    <div className="mb-4">
                                        <strong className="block mb-1 text-teal-400">Output:</strong>
                                        <pre className="bg-gray-900 p-2.5 rounded overflow-x-auto text-xs leading-relaxed">
                                            {JSON.stringify(result.finalOutput, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Debug Info (collapsible) */}
                        <details className="mt-4">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                                🔍 Show Debug Info
                            </summary>
                            <pre className="mt-2 bg-gray-900 p-3 rounded overflow-x-auto text-xs leading-relaxed text-gray-400">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </details>
                    </>
                )}
            </div>
        </div>
    );


}

export default ExecutionPanel;
