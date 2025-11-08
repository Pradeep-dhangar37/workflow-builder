import { useState } from 'react';

function WorkflowControls({
    workflowName,
    nodes,
    connections,
    onExecute,
    isExecuting,
    setIsExecuting,
    currentWorkflowId,
    setCurrentWorkflowId,
    onWorkflowSaved
}) {
    const [showExecuteModal, setShowExecuteModal] = useState(false);
    const [inputText, setInputText] = useState('');
    const [file, setFile] = useState(null);

    const handleSave = async () => {
        try {
            const workflow = {
                name: workflowName,
                nodes,
                connections
            };

            let response;
            if (currentWorkflowId) {
                // Update existing workflow
                response = await fetch(`http://localhost:3001/api/workflows/${currentWorkflowId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(workflow)
                });
            } else {
                // Create new workflow
                response = await fetch('http://localhost:3001/api/workflows', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(workflow)
                });
            }

            const data = await response.json();
            setCurrentWorkflowId(data._id);
            if (onWorkflowSaved) onWorkflowSaved();
            alert('Workflow saved successfully!');
        } catch (error) {
            alert('Failed to save workflow: ' + error.message);
        }
    };

    const handleExecute = async () => {
        if (!currentWorkflowId) {
            alert('Please save the workflow first');
            return;
        }

        setIsExecuting(true);
        try {
            const formData = new FormData();
            formData.append('workflowId', currentWorkflowId);

            if (file) {
                formData.append('file', file);
            } else if (inputText) {
                formData.append('inputText', inputText);
            } else {
                alert('Please provide input text or file');
                setIsExecuting(false);
                return;
            }

            const response = await fetch('http://localhost:3001/api/executions', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            onExecute(result);
            setShowExecuteModal(false);
            setInputText('');
            setFile(null);
        } catch (error) {
            alert('Execution failed: ' + error.message);
            onExecute({ error: error.message });
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <>
            <div className="flex gap-2.5">
                <button
                    className="px-5 py-2 bg-blue-700 border-none rounded text-white text-sm font-medium cursor-pointer transition-colors hover:bg-blue-600"
                    onClick={handleSave}
                >
                    💾 Save Workflow
                </button>
                <button
                    className="px-5 py-2 bg-teal-600 border-none rounded text-white text-sm font-medium cursor-pointer transition-colors hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setShowExecuteModal(true)}
                    disabled={isExecuting}
                >
                    ▶️ Execute
                </button>
            </div>

            {showExecuteModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]" onClick={() => setShowExecuteModal(false)}>
                    <div className="bg-gray-700 border border-gray-600 rounded-lg w-[500px] max-w-[90vw] max-h-[80vh] flex flex-col text-white" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-600">
                            <h3 className="m-0 text-base">Execute Workflow</h3>
                            <button className="bg-transparent border-none text-gray-400 text-2xl cursor-pointer p-0 w-8 h-8 hover:text-white transition-colors" onClick={() => setShowExecuteModal(false)}>×</button>
                        </div>

                        <div className="px-5 py-5 overflow-y-auto">
                            <div className="mb-5">
                                <label className="block mb-2 text-sm text-gray-300">Input Text</label>
                                <textarea
                                    rows="6"
                                    placeholder="Enter text to process..."
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    disabled={!!file}
                                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                />
                            </div>

                            <div className="text-center my-5 text-gray-400 text-sm relative">
                                <span className="relative z-10 bg-gray-700 px-3">OR</span>
                                <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-600 -z-0"></div>
                            </div>

                            <div className="mb-5">
                                <label className="block mb-2 text-sm text-gray-300">Upload File (.txt)</label>
                                <input
                                    type="file"
                                    accept=".txt"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    disabled={!!inputText}
                                    className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-700 file:text-white hover:file:bg-blue-600 file:cursor-pointer disabled:opacity-50"
                                />
                                {file && <div className="mt-2 text-xs text-teal-400">Selected: {file.name}</div>}
                            </div>
                        </div>

                        <div className="flex gap-2.5 justify-end px-5 py-4 border-t border-gray-600">
                            <button
                                className="px-5 py-2 border-none rounded text-sm cursor-pointer transition-colors bg-gray-600 text-gray-300 hover:bg-gray-500"
                                onClick={() => setShowExecuteModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-5 py-2 border-none rounded text-sm cursor-pointer transition-colors bg-blue-700 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleExecute}
                                disabled={isExecuting}
                            >
                                {isExecuting ? 'Executing...' : 'Execute'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default WorkflowControls;
