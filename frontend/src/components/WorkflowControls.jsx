import { useState } from 'react';
import { API_BASE_URL } from '../config.js';

function WorkflowControls({
    workflowName,
    nodeSequence,
    currentWorkflowId,
    setCurrentWorkflowId,
    onWorkflowSaved
}) {

    const handleSave = async () => {
        try {
            // Validate workflow name
            if (!workflowName || workflowName.trim() === '') {
                alert('Please enter a workflow name');
                return;
            }

            // Check for duplicate names (only for new workflows)
            if (!currentWorkflowId) {
                const existingWorkflowsResponse = await fetch(`${API_BASE_URL}/api/workflows`);
                const existingWorkflows = await existingWorkflowsResponse.json();

                const duplicateName = existingWorkflows.find(w =>
                    w.name.toLowerCase().trim() === workflowName.toLowerCase().trim()
                );

                if (duplicateName) {
                    alert(`A workflow with the name "${workflowName}" already exists. Please choose a different name.`);
                    return;
                }
            }

            const workflow = {
                name: workflowName.trim(),
                nodeSequence
            };

            let response;
            if (currentWorkflowId) {
                // Update existing workflow - check if name conflicts with other workflows
                const existingWorkflowsResponse = await fetch(`${API_BASE_URL}/api/workflows`);
                const existingWorkflows = await existingWorkflowsResponse.json();

                const duplicateName = existingWorkflows.find(w =>
                    w._id !== currentWorkflowId &&
                    w.name.toLowerCase().trim() === workflowName.toLowerCase().trim()
                );

                if (duplicateName) {
                    alert(`A workflow with the name "${workflowName}" already exists. Please choose a different name.`);
                    return;
                }

                response = await fetch(`${API_BASE_URL}/api/workflows/${currentWorkflowId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(workflow)
                });
            } else {
                // Create new workflow
                response = await fetch(`${API_BASE_URL}/api/workflows`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(workflow)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save workflow');
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

            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/executions`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Execution failed');
            }

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
        <div className="flex gap-3">
            <button
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 border-none rounded-lg text-white text-sm font-semibold cursor-pointer transition-colors"
                onClick={handleSave}
            >
                💾 Save Workflow
            </button>
        </div>
    );
}

export default WorkflowControls;
