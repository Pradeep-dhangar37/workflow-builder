import { useState } from 'react';
import NodeConfig from './NodeConfig';

const NODE_ICONS = {
    input: '📥',
    store: '💾',
    rag: '🔍',
    memory: '🧠',
    output: '📤'
};

const NODE_COLORS = {
    input: 'bg-emerald-600',
    store: 'bg-blue-600',
    rag: 'bg-purple-600',
    memory: 'bg-orange-600',
    output: 'bg-cyan-600'
};

function Node({ node, isSelected, isConnecting, onClick, onConnectStart, onUpdate, onDelete, onDrag }) {
    const [showConfig, setShowConfig] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const baseClasses = "absolute w-80 bg-gray-800 border-2 rounded-lg transition-all duration-200 z-10 hover:shadow-lg select-none";
    const selectedClasses = isSelected ? "border-blue-400 shadow-lg" : "border-gray-600";
    const connectingClasses = isConnecting ? "border-teal-400" : "";
    const draggingClasses = isDragging ? "opacity-90 z-50 cursor-grabbing" : "cursor-grab";

    const handleMouseDown = (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            return; // Don't drag when clicking buttons
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const offset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        setIsDragging(true);
        setDragOffset(offset);
        onClick();

        // Add global mouse event listeners for smooth dragging
        const handleGlobalMouseMove = (moveEvent) => {
            const canvas = document.querySelector('.canvas');
            if (!canvas) return;

            const canvasRect = canvas.getBoundingClientRect();
            const newX = moveEvent.clientX - canvasRect.left - offset.x;
            const newY = moveEvent.clientY - canvasRect.top - offset.y;

            // Smooth position updates with bounds checking
            const boundedX = Math.max(0, Math.min(newX, canvasRect.width - 320));
            const boundedY = Math.max(0, Math.min(newY, canvasRect.height - 120));

            onDrag(node.id, { x: boundedX, y: boundedY });
        };

        const handleGlobalMouseUp = () => {
            setIsDragging(false);
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };

        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
    };

    return (
        <>
            <div
                className={`${baseClasses} ${selectedClasses} ${connectingClasses} ${draggingClasses}`}
                style={{
                    left: node.position.x,
                    top: node.position.y,
                    transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                    transition: isDragging ? 'none' : 'all 0.2s ease'
                }}
                onMouseDown={handleMouseDown}
            >
                <div className={`flex items-center gap-3 px-4 py-3 ${NODE_COLORS[node.type]} rounded-t-lg`}>
                    <span className="text-xl text-white">{NODE_ICONS[node.type]}</span>
                    <span className="flex-1 font-semibold text-sm text-white">{node.type.toUpperCase()}</span>
                    <button
                        className="bg-red-500 hover:bg-red-600 border-none text-white text-sm cursor-pointer w-6 h-6 flex items-center justify-center rounded transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(node.id);
                        }}
                    >
                        ×
                    </button>
                </div>

                <div className="px-4 py-3 min-h-[50px] bg-gray-700">
                    {node.type === 'store' && node.config?.knowledgeBaseName && (
                        <div className="text-xs text-gray-300 px-2 py-1 bg-gray-900 rounded">
                            <span className="text-blue-300">KB:</span> {node.config.knowledgeBaseName}
                        </div>
                    )}
                    {node.type === 'rag' && node.config?.knowledgeBaseName && (
                        <div className="text-xs text-gray-300 px-2 py-1 bg-gray-900 rounded space-y-1">
                            <div><span className="text-purple-300">KB:</span> {node.config.knowledgeBaseName}</div>
                            {node.config.aiProvider && <div><span className="text-pink-300">AI:</span> {node.config.aiProvider}</div>}
                        </div>
                    )}
                    {node.type === 'memory' && node.config?.sessionId && (
                        <div className="text-xs text-gray-300 px-2 py-1 bg-gray-900 rounded">
                            <span className="text-orange-300">Session:</span> {node.config.sessionId}
                        </div>
                    )}
                    {!((node.type === 'store' && node.config?.knowledgeBaseName) ||
                        (node.type === 'rag' && node.config?.knowledgeBaseName) ||
                        (node.type === 'memory' && node.config?.sessionId)) && (
                            <div className="text-xs text-gray-500 italic text-center py-2">
                                Click Config to set up this node
                            </div>
                        )}
                </div>

                <div className="flex gap-2 px-4 py-3 border-t border-gray-600 bg-gray-800 rounded-b-lg">
                    <button
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 border-none rounded text-white text-xs cursor-pointer transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowConfig(true);
                        }}
                    >
                        ⚙️ Config
                    </button>
                    <button
                        className="flex-1 px-3 py-2 bg-teal-600 hover:bg-teal-700 border-none rounded text-white text-xs cursor-pointer transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onConnectStart();
                        }}
                    >
                        🔗 Connect
                    </button>
                </div>
            </div>

            {showConfig && (
                <NodeConfig
                    node={node}
                    onClose={() => setShowConfig(false)}
                    onSave={(config) => {
                        onUpdate(node.id, config);
                        setShowConfig(false);
                    }}
                />
            )}
        </>
    );
}

export default Node;
