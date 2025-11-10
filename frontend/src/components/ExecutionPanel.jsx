import { useState } from 'react';
import { API_BASE_URL } from '../config.js';

function ExecutionPanel({ result, isExecuting, onExecute, currentWorkflowId }) {
    const [inputText, setInputText] = useState('');
    const [file, setFile] = useState(null);
    const [isExecutingLocal, setIsExecutingLocal] = useState(false);

    const handleExecute = async () => {
        if (!currentWorkflowId) {
            alert('Please save the workflow first');
            return;
        }

        setIsExecutingLocal(true);
        try {
            const formData = new FormData();
            formData.append('workflowId', currentWorkflowId);

            if (file) {
                formData.append('file', file);
            } else if (inputText) {
                formData.append('inputText', inputText);
            } else {
                alert('Please provide input text or file');
                setIsExecutingLocal(false);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/executions`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Execution failed');
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

                {result?.error && (
                    <div className="p-4 rounded-md text-sm bg-red-900/30 border border-red-800">
                        <strong>Error:</strong> {result.error}
                    </div>
                )}

                {result && !result.error && (
                    <>
                        {/* Query Workflow Display */}
                        {result.finalOutput?.question && result.finalOutput?.answer && (
                            <div className="space-y-4">
                                {/* Question */}
                                <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-700">
                                    <div className="text-xs uppercase text-blue-400 mb-2">Your Question</div>
                                    <div className="text-white text-sm leading-relaxed">
                                        {result.finalOutput.question}
                                    </div>
                                </div>

                                {/* Answer */}
                                <div className="p-4 rounded-lg bg-green-900/30 border border-green-700">
                                    <div className="text-xs uppercase text-green-400 mb-2">Answer</div>
                                    <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                                        {result.finalOutput.answer}
                                    </div>
                                </div>

                                {/* Session Info */}
                                {result.finalOutput.sessionId && (
                                    <div className="p-3 rounded bg-gray-700/50 border border-gray-600">
                                        <div className="text-xs text-gray-400">
                                            Session: <span className="text-teal-400">{result.finalOutput.sessionId}</span>
                                        </div>
                                        {result.finalOutput.formatted?.timestamp && (
                                            <div className="text-xs text-gray-400 mt-1">
                                                Time: {new Date(result.finalOutput.formatted.timestamp).toLocaleTimeString()}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Relevant Chunks */}
                                {result.finalOutput.chunks && result.finalOutput.chunks.length > 0 && (
                                    <details className="p-3 rounded bg-gray-700/50 border border-gray-600">
                                        <summary className="text-xs uppercase text-gray-400 cursor-pointer hover:text-white">
                                            📚 Source Chunks ({result.finalOutput.chunks.length})
                                        </summary>
                                        <div className="mt-3 space-y-2">
                                            {result.finalOutput.chunks.map((chunk, idx) => (
                                                <div key={idx} className="p-2 bg-gray-800 rounded text-xs text-gray-300">
                                                    <div className="text-gray-500 mb-1">Chunk {chunk.index}</div>
                                                    <div className="line-clamp-3">{chunk.content}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}
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
