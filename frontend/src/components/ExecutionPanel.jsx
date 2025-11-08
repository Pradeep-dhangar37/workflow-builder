function ExecutionPanel({ result, isExecuting }) {
    if (isExecuting) {
        return (
            <div className="w-[400px] bg-gray-800 border-l border-gray-700 p-5 overflow-y-auto">
                <h3 className="m-0 mb-4 text-sm uppercase text-gray-400">Execution Status</h3>
                <div className="flex flex-col items-center gap-4 py-10 px-5">
                    <div className="w-10 h-10 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                    <p>Executing workflow...</p>
                </div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="w-[400px] bg-gray-800 border-l border-gray-700 p-5 overflow-y-auto">
                <h3 className="m-0 mb-4 text-sm uppercase text-gray-400">Execution Results</h3>
                <div className="p-5 text-center text-gray-500 text-sm">
                    No execution results yet. Run a workflow to see results here.
                </div>
            </div>
        );
    }

    if (result.error) {
        return (
            <div className="w-[400px] bg-gray-800 border-l border-gray-700 p-5 overflow-y-auto">
                <h3 className="m-0 mb-4 text-sm uppercase text-gray-400">Execution Results</h3>
                <div className="p-4 rounded-md text-sm bg-red-900/30 border border-red-800">
                    <strong>Error:</strong> {result.error}
                </div>
            </div>
        );
    }

    // Check if this is a query workflow (has question/answer)
    const isQueryWorkflow = result.finalOutput?.question && result.finalOutput?.answer;
    const isIngestionWorkflow = result.finalOutput?.knowledgeBase && result.finalOutput?.chunksAdded !== undefined;

    return (
        <div className="w-[400px] bg-gray-800 border-l border-gray-700 p-5 overflow-y-auto">
            <h3 className="m-0 mb-4 text-sm uppercase text-gray-400">
                {isQueryWorkflow ? '💬 Answer' : '📊 Execution Results'}
            </h3>

            {/* Query Workflow Display */}
            {isQueryWorkflow && (
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
            {isIngestionWorkflow && !isQueryWorkflow && (
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
            {!isQueryWorkflow && !isIngestionWorkflow && (
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
        </div>
    );
}

export default ExecutionPanel;
