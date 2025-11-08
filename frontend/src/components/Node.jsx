import { useState } from 'react';
import NodeConfig from './NodeConfig';

const NODE_ICONS = {
    input: '📥',
    store: '💾',
    rag: '🔍',
    memory: '🧠',
    output: '📤'
};

function Node({ node, isSelected, isConnecting, onClick, onConnectStart, onUpdate, onDelete, onDragStart, onDrag, onDragEnd }) {
    const [showConfig, setShowConfig] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const baseClasses = "absolute w-80 bg-gray-700 border-2 rounded-lg cursor-move transition-all z-10 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/30";
    const selectedClasses = isSelected ? "border-blue-500 shadow-lg shadow-blue-500/50" : "border-gray-600";
    const connectingClasses = isConnecting ? "border-teal-400 animate-pulse" : "";
    const draggingClasses = isDragging ? "opacity-80 shadow-2xl z-50" : "";

    const handleMouseDown = (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            return; // Don't drag when clicking buttons
        }

        setIsDragging(true);
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        onClick();
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        const canvas = e.currentTarget.parentElement;
        const canvasRect = canvas.getBoundingClientRect();

        const newX = e.clientX - canvasRect.left - dragOffset.x;
        const newY = e.clientY - canvasRect.top - dragOffset.y;

        onDrag(node.id, { x: Math.max(0, newX), y: Math.max(0, newY) });
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
        }
    };

    return (
        <>
            <div
                className={`${baseClasses} ${selectedClasses} ${connectingClasses} ${draggingClasses}`}
                style={{ left: node.position.x, top: node.position.y }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div className="flex items-center gap-2.5 px-3 py-3 bg-gray-600 rounded-t-md">
                    <span className="text-xl">{NODE_ICONS[node.type]}</span>
                    <span className="flex-1 font-semibold text-sm">{node.type.toUpperCase()}</span>
                    <button
                        className="bg-transparent border-none text-gray-400 text-xl cursor-pointer w-6 h-6 flex items-center justify-center hover:text-red-400 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(node.id);
                        }}
                    >
                        ×
                    </button>
                </div>

                <div className="px-3 py-3 min-h-[40px]">
                    {node.type === 'store' && node.config.knowledgeBaseName && (
                        <div className="text-xs text-gray-400 px-2 py-1 bg-gray-900 rounded">
                            KB: {node.config.knowledgeBaseName}
                        </div>
                    )}
                    {node.type === 'rag' && node.config.knowledgeBaseName && (
                        <div className="text-xs text-gray-400 px-2 py-1 bg-gray-900 rounded">
                            KB: {node.config.knowledgeBaseName}
                            {node.config.aiProvider && <div>AI: {node.config.aiProvider}</div>}
                        </div>
                    )}
                    {node.type === 'memory' && node.config.sessionId && (
                        <div className="text-xs text-gray-400 px-2 py-1 bg-gray-900 rounded">
                            Session: {node.config.sessionId}
                        </div>
                    )}
                </div>

                <div className="flex gap-2 px-3 py-3 border-t border-gray-600">
                    <button
                        className="flex-1 px-3 py-1.5 bg-blue-700 border-none rounded text-white text-xs cursor-pointer transition-colors hover:bg-blue-600"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowConfig(true);
                        }}
                    >
                        ⚙️ Config
                    </button>
                    <button
                        className="flex-1 px-3 py-1.5 bg-teal-600 border-none rounded text-white text-xs cursor-pointer transition-colors hover:bg-teal-500"
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
