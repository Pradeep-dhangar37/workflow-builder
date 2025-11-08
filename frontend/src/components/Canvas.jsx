import { useState } from 'react';
import Node from './Node';

function Canvas({ nodes, connections, selectedNode, onSelectNode, onUpdateNode, onDeleteNode, onConnect, onNodeDrag }) {
    const [connectingFrom, setConnectingFrom] = useState(null);

    const handleNodeClick = (node) => {
        if (connectingFrom) {
            if (connectingFrom.id !== node.id) {
                onConnect(connectingFrom.id, node.id);
            }
            setConnectingFrom(null);
        } else {
            onSelectNode(node);
        }
    };

    const handleConnectStart = (node) => {
        setConnectingFrom(node);
    };

    const handleCanvasClick = (e) => {
        if (e.target.className.includes('canvas')) {
            onSelectNode(null);
            setConnectingFrom(null);
        }
    };

    // Calculate smooth curved path for connections
    const getConnectionPath = (fromNode, toNode) => {
        const x1 = fromNode.position.x + 320; // Right edge of node
        const y1 = fromNode.position.y + 60;  // Middle of node
        const x2 = toNode.position.x;         // Left edge of target
        const y2 = toNode.position.y + 60;    // Middle of target

        // Calculate control points for smooth S-curve
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const curve = Math.min(distance * 0.4, 150);

        const cx1 = x1 + curve;
        const cy1 = y1;
        const cx2 = x2 - curve;
        const cy2 = y2;

        return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    };

    return (
        <div className="flex-1 relative bg-gray-900 overflow-auto canvas" onClick={handleCanvasClick}>
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                <defs>
                    {/* Arrow marker */}
                    <marker
                        id="arrowhead"
                        markerWidth="14"
                        markerHeight="14"
                        refX="13"
                        refY="7"
                        orient="auto"
                    >
                        <polygon points="0 0, 14 7, 0 14" fill="#60a5fa" />
                    </marker>
                </defs>

                {connections.map((conn, idx) => {
                    const fromNode = nodes.find(n => n.id === conn.from);
                    const toNode = nodes.find(n => n.id === conn.to);
                    if (!fromNode || !toNode) return null;

                    const path = getConnectionPath(fromNode, toNode);

                    return (
                        <g key={idx}>
                            {/* Outer glow */}
                            <path
                                d={path}
                                stroke="#3b82f6"
                                strokeWidth="10"
                                fill="none"
                                opacity="0.2"
                            />
                            {/* Middle glow */}
                            <path
                                d={path}
                                stroke="#60a5fa"
                                strokeWidth="6"
                                fill="none"
                                opacity="0.4"
                            />
                            {/* Main line */}
                            <path
                                d={path}
                                stroke="#60a5fa"
                                strokeWidth="3"
                                fill="none"
                                strokeLinecap="round"
                                markerEnd="url(#arrowhead)"
                            />
                        </g>
                    );
                })}
            </svg>

            {nodes.map(node => (
                <Node
                    key={node.id}
                    node={node}
                    isSelected={selectedNode?.id === node.id}
                    isConnecting={connectingFrom?.id === node.id}
                    onClick={() => handleNodeClick(node)}
                    onConnectStart={() => handleConnectStart(node)}
                    onUpdate={onUpdateNode}
                    onDelete={onDeleteNode}
                    onDrag={onNodeDrag}
                />
            ))}

            {connectingFrom && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-8 py-4 rounded-lg text-base z-50 animate-pulse">
                    Click on another node to connect
                </div>
            )}
        </div>
    );
}

export default Canvas;
