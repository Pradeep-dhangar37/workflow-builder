import { useState, useEffect } from 'react';

function NodeConfig({ node, onClose, onSave }) {
    const [config, setConfig] = useState(node.config || {});
    const [knowledgeBases, setKnowledgeBases] = useState([]);

    useEffect(() => {
        if (node.type === 'store' || node.type === 'rag') {
            fetchKnowledgeBases();
        }
    }, [node.type]);

    const fetchKnowledgeBases = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/knowledge-bases');
            const data = await response.json();
            setKnowledgeBases(data);
        } catch (error) {
            console.error('Failed to fetch knowledge bases:', error);
        }
    };

    const handleSave = () => {
        onSave(config);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]" onClick={onClose}>
            <div className="bg-gray-700 border border-gray-600 rounded-lg w-[500px] max-w-[90vw] max-h-[80vh] flex flex-col text-white" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-600">
                    <h3 className="m-0 text-base">Configure {node.type.toUpperCase()} Node</h3>
                    <button className="bg-transparent border-none text-gray-400 text-2xl cursor-pointer p-0 w-8 h-8 hover:text-white transition-colors" onClick={onClose}>×</button>
                </div>

                <div className="px-5 py-5 overflow-y-auto">
                    {node.type === 'store' && (
                        <>
                            <div className="mb-5">
                                <label className="block mb-2 text-sm text-gray-300">Knowledge Base</label>
                                <select
                                    value={config.knowledgeBaseName || ''}
                                    onChange={(e) => setConfig({ ...config, knowledgeBaseName: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select or create new...</option>
                                    {knowledgeBases.map(kb => (
                                        <option key={kb._id} value={kb.name}>{kb.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-5">
                                <label className="block mb-2 text-sm text-gray-300">Or Create New Knowledge Base</label>
                                <input
                                    type="text"
                                    placeholder="Enter new KB name"
                                    value={config.knowledgeBaseName || ''}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        knowledgeBaseName: e.target.value,
                                        createNew: true
                                    })}
                                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="mb-5">
                                <label className="flex items-center text-sm text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.createNew || false}
                                        onChange={(e) => setConfig({ ...config, createNew: e.target.checked })}
                                        className="mr-2"
                                    />
                                    Create new if doesn't exist
                                </label>
                            </div>
                        </>
                    )}

                    {node.type === 'rag' && (
                        <>
                            <div className="mb-5">
                                <label className="block mb-2 text-sm text-gray-300">Knowledge Base to Query</label>
                                <div className="flex gap-2">
                                    <select
                                        value={config.knowledgeBaseName || ''}
                                        onChange={(e) => setConfig({ ...config, knowledgeBaseName: e.target.value })}
                                        className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="">Select knowledge base...</option>
                                        {knowledgeBases.map(kb => (
                                            <option key={kb._id} value={kb.name}>{kb.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={fetchKnowledgeBases}
                                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 border-none rounded text-white text-sm cursor-pointer transition-colors"
                                        title="Refresh knowledge bases list"
                                    >
                                        🔄
                                    </button>
                                </div>
                            </div>

                            <div className="mb-5">
                                <label className="block mb-2 text-sm text-gray-300">Or Enter Knowledge Base Name Manually</label>
                                <input
                                    type="text"
                                    placeholder="Enter KB name (e.g., test-kb)"
                                    value={config.knowledgeBaseName || ''}
                                    onChange={(e) => setConfig({ ...config, knowledgeBaseName: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-400 mt-1">Use the same name as in your Store node</p>
                            </div>

                            <div className="mb-5">
                                <label className="block mb-2 text-sm text-gray-300">AI Provider</label>
                                <select
                                    value={config.aiProvider || 'openai'}
                                    onChange={(e) => setConfig({ ...config, aiProvider: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                >
                                    <option value="openai">OpenAI (ChatGPT)</option>
                                    <option value="google">Google (Gemini)</option>
                                    <option value="anthropic">Anthropic (Claude)</option>
                                </select>
                            </div>

                            <div className="mb-5">
                                <label className="block mb-2 text-sm text-gray-300">Model</label>
                                <input
                                    type="text"
                                    placeholder="e.g., gpt-4, gpt-3.5-turbo"
                                    value={config.model || ''}
                                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="mb-5">
                                <label className="block mb-2 text-sm text-gray-300">API Key</label>
                                <input
                                    type="password"
                                    placeholder="Enter API key"
                                    value={config.apiKey || ''}
                                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </>
                    )}

                    {node.type === 'memory' && (
                        <div className="mb-5">
                            <label className="block mb-2 text-sm text-gray-300">Session ID (optional)</label>
                            <input
                                type="text"
                                placeholder="Auto-generated if empty"
                                value={config.sessionId || ''}
                                onChange={(e) => setConfig({ ...config, sessionId: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-400 mt-2">Leave empty to auto-generate a session ID</p>
                        </div>
                    )}

                    {node.type === 'input' && (
                        <div className="px-3 py-3 bg-gray-600 rounded text-sm text-gray-400">
                            Input node accepts text or file during execution.
                            No configuration needed.
                        </div>
                    )}

                    {node.type === 'output' && (
                        <div className="px-3 py-3 bg-gray-600 rounded text-sm text-gray-400">
                            Output node displays the final result.
                            No configuration needed.
                        </div>
                    )}
                </div>

                <div className="flex gap-2.5 justify-end px-5 py-4 border-t border-gray-600">
                    <button className="px-5 py-2 border-none rounded text-sm cursor-pointer transition-colors bg-gray-600 text-gray-300 hover:bg-gray-500" onClick={onClose}>Cancel</button>
                    <button className="px-5 py-2 border-none rounded text-sm cursor-pointer transition-colors bg-blue-700 text-white hover:bg-blue-600" onClick={handleSave}>Save</button>
                </div>
            </div>
        </div>
    );
}

export default NodeConfig;
