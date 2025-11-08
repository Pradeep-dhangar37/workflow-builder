const NODE_TYPES = [
    { type: 'input', label: 'Input', icon: '📥', description: 'Text or file input' },
    { type: 'store', label: 'Store', icon: '💾', description: 'Store chunks in KB' },
    { type: 'rag', label: 'RAG', icon: '🔍', description: 'Retrieve & Generate answer' },
    { type: 'memory', label: 'Memory', icon: '🧠', description: 'Store conversation history' },
    { type: 'output', label: 'Output', icon: '📤', description: 'Display final result' }
];

function NodePalette({ onAddNode }) {
    return (
        <div className="w-52 bg-gray-800 border-r border-gray-700 p-5 overflow-y-auto">
            <h3 className="m-0 mb-4 text-sm uppercase text-gray-400">Node Types</h3>
            <div className="flex flex-col gap-2.5">
                {NODE_TYPES.map(({ type, label, icon, description }) => (
                    <div
                        key={type}
                        className="flex items-center gap-2.5 px-3 py-3 bg-gray-700 border border-gray-600 rounded-md cursor-pointer transition-all hover:bg-gray-600 hover:border-blue-500 hover:translate-x-1"
                        onClick={() => onAddNode(type)}
                        title={description}
                    >
                        <span className="text-xl">{icon}</span>
                        <span className="text-sm font-medium">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default NodePalette;
