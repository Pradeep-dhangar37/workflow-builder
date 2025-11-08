import { useState, useEffect } from 'react';
import NodePalette from './NodePalette';
import Canvas from './Canvas';
import WorkflowControls from './WorkflowControls';
import ExecutionPanel from './ExecutionPanel';

function WorkflowBuilder() {
    const [nodes, setNodes] = useState([]);
    const [connections, setConnections] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [workflowName, setWorkflowName] = useState('New Workflow');
    const [executionResult, setExecutionResult] = useState(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [workflows, setWorkflows] = useState([]);
    const [currentWorkflowId, setCurrentWorkflowId] = useState(null);

    // Load workflows on mount
    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/workflows');
            const data = await response.json();
            setWorkflows(data);
        } catch (error) {
            console.error('Failed to load workflows:', error);
        }
    };

    const loadWorkflow = (workflow) => {
        setNodes(workflow.nodes);
        setConnections(workflow.connections);
        setWorkflowName(workflow.name);
        setCurrentWorkflowId(workflow._id);
        setExecutionResult(null);
    };

    const createNewWorkflow = () => {
        setNodes([]);
        setConnections([]);
        setWorkflowName('New Workflow');
        setCurrentWorkflowId(null);
        setExecutionResult(null);
    };

    const deleteWorkflow = async () => {
        if (!currentWorkflowId) {
            alert('No workflow selected to delete');
            return;
        }

        if (!confirm(`Delete workflow "${workflowName}"?`)) {
            return;
        }

        try {
            await fetch(`http://localhost:3001/api/workflows/${currentWorkflowId}`, {
                method: 'DELETE'
            });

            createNewWorkflow();
            loadWorkflows();
            alert('Workflow deleted successfully');
        } catch (error) {
            alert('Failed to delete workflow: ' + error.message);
        }
    };

    const addNode = (type) => {
        const newNode = {
            id: `node_${Date.now()}`,
            type,
            config: {},
            position: { x: 100, y: nodes.length * 120 + 50 }
        };
        setNodes([...nodes, newNode]);
    };

    const updateNodeConfig = (nodeId, config) => {
        setNodes(nodes.map(node =>
            node.id === nodeId ? { ...node, config } : node
        ));
    };

    const deleteNode = (nodeId) => {
        setNodes(nodes.filter(n => n.id !== nodeId));
        setConnections(connections.filter(c => c.from !== nodeId && c.to !== nodeId));
        if (selectedNode?.id === nodeId) setSelectedNode(null);
    };

    const connectNodes = (fromId, toId) => {
        // Check if connection already exists
        const exists = connections.some(c => c.from === fromId && c.to === toId);
        if (exists) {
            alert('Connection already exists!');
            return;
        }

        // Check if it would create a cycle
        if (fromId === toId) {
            alert('Cannot connect a node to itself!');
            return;
        }

        // Add new connection (allow multiple connections from same node)
        setConnections([...connections, { from: fromId, to: toId }]);
    };

    const handleNodeDrag = (nodeId, newPosition) => {
        setNodes(nodes.map(node =>
            node.id === nodeId ? { ...node, position: newPosition } : node
        ));
    };

    return (
        <div className="h-screen flex flex-col bg-gray-900 text-white">
            <div className="flex items-center gap-3 px-5 py-4 bg-gray-800 border-b border-gray-700">
                <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    placeholder="Workflow name..."
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-base focus:outline-none focus:border-blue-500"
                />

                {workflows.length > 0 && (
                    <select
                        value={currentWorkflowId || ''}
                        onChange={(e) => {
                            if (e.target.value) {
                                const workflow = workflows.find(w => w._id === e.target.value);
                                if (workflow) loadWorkflow(workflow);
                            }
                        }}
                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500 min-w-[200px]"
                    >
                        <option value="" className="bg-gray-800 text-white">Load workflow...</option>
                        {workflows.map(w => (
                            <option key={w._id} value={w._id} className="bg-gray-800 text-white">{w.name}</option>
                        ))}
                    </select>
                )}

                <button
                    onClick={createNewWorkflow}
                    className="px-4 py-2 bg-green-600 border-none rounded text-white text-sm font-medium cursor-pointer transition-colors hover:bg-green-500"
                    title="Create new workflow"
                >
                    ➕ New
                </button>

                {currentWorkflowId && (
                    <button
                        onClick={deleteWorkflow}
                        className="px-4 py-2 bg-red-600 border-none rounded text-white text-sm font-medium cursor-pointer transition-colors hover:bg-red-500"
                        title="Delete current workflow"
                    >
                        🗑️ Delete
                    </button>
                )}

                <WorkflowControls
                    workflowName={workflowName}
                    nodes={nodes}
                    connections={connections}
                    onExecute={setExecutionResult}
                    isExecuting={isExecuting}
                    setIsExecuting={setIsExecuting}
                    currentWorkflowId={currentWorkflowId}
                    setCurrentWorkflowId={setCurrentWorkflowId}
                    onWorkflowSaved={loadWorkflows}
                />
            </div>

            <div className="flex-1 flex overflow-hidden">
                <NodePalette onAddNode={addNode} />

                <Canvas
                    nodes={nodes}
                    connections={connections}
                    selectedNode={selectedNode}
                    onSelectNode={setSelectedNode}
                    onUpdateNode={updateNodeConfig}
                    onDeleteNode={deleteNode}
                    onConnect={connectNodes}
                    onNodeDrag={handleNodeDrag}
                />

                <ExecutionPanel
                    result={executionResult}
                    isExecuting={isExecuting}
                />
            </div>
        </div>
    );
}

export default WorkflowBuilder;
