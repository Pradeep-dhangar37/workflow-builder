import { useState, useEffect } from 'react';
import NodePalette from './NodePalette';
import Canvas from './Canvas';
import WorkflowControls from './WorkflowControls';
import ExecutionPanel from './ExecutionPanel';

function WorkflowBuilder() {
    const [nodeSequence, setNodeSequence] = useState([]);
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
        setNodeSequence(workflow.nodeSequence || []);
        setWorkflowName(workflow.name);
        setCurrentWorkflowId(workflow._id);
        setExecutionResult(null);
    };

    const createNewWorkflow = () => {
        setNodeSequence([]);
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
            position: { x: 100, y: nodeSequence.length * 120 + 50 }
        };
        setNodeSequence([...nodeSequence, newNode]);
    };

    const updateNodeConfig = (nodeId, config) => {
        setNodeSequence(nodeSequence.map(node =>
            node.id === nodeId ? { ...node, config } : node
        ));
    };

    const deleteNode = (nodeId) => {
        setNodeSequence(nodeSequence.filter(n => n.id !== nodeId));
        if (selectedNode?.id === nodeId) setSelectedNode(null);
    };

    const moveNode = (fromIndex, toIndex) => {
        const newSequence = [...nodeSequence];
        const [movedNode] = newSequence.splice(fromIndex, 1);
        newSequence.splice(toIndex, 0, movedNode);
        setNodeSequence(newSequence);
    };

    const handleNodeDrag = (nodeId, newPosition) => {
        setNodeSequence(nodeSequence.map(node =>
            node.id === nodeId ? { ...node, position: newPosition } : node
        ));
    };

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
            <div className="flex items-center gap-3 px-5 py-4 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700/50 shadow-lg">
                <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    placeholder="Workflow name..."
                    className="flex-1 px-4 py-2.5 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 placeholder-gray-400"
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
                    nodeSequence={nodeSequence}
                    currentWorkflowId={currentWorkflowId}
                    setCurrentWorkflowId={setCurrentWorkflowId}
                    onWorkflowSaved={loadWorkflows}
                />
            </div>

            <div className="flex-1 flex overflow-hidden">
                <NodePalette onAddNode={addNode} />

                <Canvas
                    nodeSequence={nodeSequence}
                    selectedNode={selectedNode}
                    onSelectNode={setSelectedNode}
                    onUpdateNode={updateNodeConfig}
                    onDeleteNode={deleteNode}
                    onMoveNode={moveNode}
                    onNodeDrag={handleNodeDrag}
                />

                <ExecutionPanel
                    result={executionResult}
                    isExecuting={isExecuting}
                    onExecute={setExecutionResult}
                    currentWorkflowId={currentWorkflowId}
                />
            </div>
        </div>
    );
}

export default WorkflowBuilder;
