import Node from './Node';

function Canvas({ nodeSequence, selectedNode, onSelectNode, onUpdateNode, onDeleteNode, onMoveNode, onNodeDrag }) {
    const handleNodeClick = (node) => {
        onSelectNode(node);
    };

    const handleCanvasClick = (e) => {
        if (e.target.className.includes('canvas')) {
            onSelectNode(null);
        }
    };

    // Simple straight line connection between nodes
    const getConnectionLine = (fromNode, toNode) => {
        const nodeWidth = 320;
        const nodeHeight = 120;

        // Connect from center of first node to center of second node
        const x1 = fromNode.position.x + nodeWidth / 2;
        const y1 = fromNode.position.y + nodeHeight / 2;
        const x2 = toNode.position.x + nodeWidth / 2;
        const y2 = toNode.position.y + nodeHeight / 2;

        return { x1, y1, x2, y2 };
    };

    return (
        <div className="flex-1 relative bg-gray-900 overflow-auto canvas" onClick={handleCanvasClick}>
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                {/* Draw simple lines between sequential nodes */}
                {nodeSequence.map((node, idx) => {
                    if (idx === nodeSequence.length - 1) return null; // Last node has no next

                    const fromNode = node;
                    const toNode = nodeSequence[idx + 1];
                    const line = getConnectionLine(fromNode, toNode);

                    return (
                        <line
                            key={`${fromNode.id}-${toNode.id}`}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            stroke="#60a5fa"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    );
                })}
            </svg>

            {nodeSequence.map((node, index) => (
                <Node
                    key={node.id}
                    node={node}
                    index={index}
                    isSelected={selectedNode?.id === node.id}
                    onClick={() => handleNodeClick(node)}
                    onUpdate={onUpdateNode}
                    onDelete={onDeleteNode}
                    onDrag={onNodeDrag}
                    onMoveUp={index > 0 ? () => onMoveNode(index, index - 1) : null}
                    onMoveDown={index < nodeSequence.length - 1 ? () => onMoveNode(index, index + 1) : null}
                />
            ))}


        </div>
    );
}

export default Canvas;
