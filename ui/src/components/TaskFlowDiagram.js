import React, {useCallback, useEffect, useRef, useState} from 'react';
import useUiStore from '../stores/uiStore.js';
import {getTaskColor, getTaskText} from '../utils/taskUtils.js';

const TaskFlowDiagram = () => {
    const canvasRef = useRef(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [hoveredTask, setHoveredTask] = useState(null);

    const tasks = useUiStore(state => state.tasks);
    const reasoningSteps = useUiStore(state => state.reasoningSteps);

    // Function to create a flow of task processing based on reasoning steps
    const getTaskFlow = useCallback(() => {
        // Create a flow by connecting tasks based on reasoning steps that connect them
        const flow = [];

        // Process reasoning steps to find input/output connections
        reasoningSteps.forEach((step, stepIndex) => {
            if (step.input && step.result) {
                // Find tasks that match the input and result
                const inputTasks = tasks.filter(task =>
                    step.input.includes(task.term) || (task.term && step.input.includes(task.term))
                );

                const resultTasks = tasks.filter(task =>
                    step.result.includes(task.term) || (task.term && step.result.includes(task.term))
                );

                // Create connections between input and result tasks
                inputTasks.forEach(inputTask => {
                    resultTasks.forEach(resultTask => {
                        flow.push({
                            from: inputTask,
                            to: resultTask,
                            step: step,
                            id: `flow-${stepIndex}-${inputTask.id}-${resultTask.id}`
                        });
                    });
                });
            }
        });

        return flow;
    }, [tasks, reasoningSteps]);

    // Draw the task flow diagram
    const drawFlow = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Get the task flow
        const flow = getTaskFlow();
        if (flow.length === 0) {
            ctx.font = '14px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('No task processing chains to display', width / 2, height / 2);
            return;
        }

        // Extract unique tasks from the flow
        const uniqueTasks = [...new Set(flow.flatMap(f => [f.from, f.to]))];

        // Calculate positions in a horizontal flow layout
        // Group tasks by processing stage
        const stages = {};

        // Simple heuristic: group by timestamp or create stages based on flow
        uniqueTasks.forEach(task => {
            const timestamp = task.creationTime || Date.now();
            const stageKey = Math.floor(timestamp / 10000); // Group by 10-second intervals as a simple heuristic

            if (!stages[stageKey]) {
                stages[stageKey] = [];
            }
            stages[stageKey].push(task);
        });

        // Convert stages to array and sort by key to determine order
        const sortedStages = Object.entries(stages)
            .sort(([a], [b]) => parseInt(a) - parseInt(b));

        // Calculate positions based on stages
        const taskPositions = {};
        const stageCount = sortedStages.length;

        sortedStages.forEach(([stageKey, stageTasks], stageIndex) => {
            const ySpacing = height / (stageTasks.length + 1);
            stageTasks.forEach((task, taskIndex) => {
                taskPositions[task.id] = {
                    x: (width / (stageCount + 1)) * (stageIndex + 1),
                    y: ySpacing * (taskIndex + 1),
                    task: task
                };
            });
        });

        // Draw connections between tasks
        flow.forEach(transition => {
            const fromPos = taskPositions[transition.from.id];
            const toPos = taskPositions[transition.to.id];

            if (fromPos && toPos) {
                // Draw arrow from source to destination
                ctx.beginPath();
                ctx.moveTo(fromPos.x, fromPos.y);
                ctx.lineTo(toPos.x, toPos.y);

                // Style based on selection
                if (selectedTask && (selectedTask.id === transition.from.id || selectedTask.id === transition.to.id)) {
                    ctx.strokeStyle = '#dc3545'; // Red for selected
                    ctx.lineWidth = 3;
                } else if (hoveredTask && (hoveredTask.id === transition.from.id || hoveredTask.id === transition.to.id)) {
                    ctx.strokeStyle = '#28a745'; // Green for hovered
                    ctx.lineWidth = 2;
                } else {
                    ctx.strokeStyle = '#007bff'; // Blue for normal
                    ctx.lineWidth = 1;
                }

                ctx.stroke();

                // Draw arrowhead
                const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
                const arrowSize = 8;
                ctx.fillStyle = ctx.strokeStyle;
                ctx.beginPath();
                ctx.moveTo(toPos.x, toPos.y);
                ctx.lineTo(
                    toPos.x - arrowSize * Math.cos(angle - Math.PI / 6),
                    toPos.y - arrowSize * Math.sin(angle - Math.PI / 6)
                );
                ctx.lineTo(
                    toPos.x - arrowSize * Math.cos(angle + Math.PI / 6),
                    toPos.y - arrowSize * Math.sin(angle + Math.PI / 6)
                );
                ctx.closePath();
                ctx.fill();
            }
        });

        // Draw task nodes
        Object.values(taskPositions).forEach(pos => {
            const task = pos.task;
            const isSelected = selectedTask && selectedTask.id === task.id;
            const isHovered = hoveredTask && hoveredTask.id === task.id;

            // Draw node circle
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, isSelected ? 18 : 15, 0, 2 * Math.PI);

            // Set color based on task type
            ctx.fillStyle = getTaskColor(task.type);

            ctx.fill();

            // Draw border
            ctx.strokeStyle = isSelected ? '#dc3545' : (isHovered ? '#28a745' : '#666');
            ctx.lineWidth = isSelected ? 3 : (isHovered ? 2 : 1);
            ctx.stroke();

            // Draw task text
            ctx.font = '10px Arial';
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Shorten task term if too long
            const text = getTaskText(task.term, 8);
            ctx.fillText(text, pos.x, pos.y + 25);
        });
    }, [getTaskFlow, selectedTask, hoveredTask]);

    // Handle canvas click for task selection
    const handleCanvasClick = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Get task positions again to check for clicks
        const flow = getTaskFlow();
        const uniqueTasks = [...new Set(flow.flatMap(f => [f.from, f.to]))];

        const stages = {};
        uniqueTasks.forEach(task => {
            const timestamp = task.creationTime || Date.now();
            const stageKey = Math.floor(timestamp / 10000);
            if (!stages[stageKey]) {
                stages[stageKey] = [];
            }
            stages[stageKey].push(task);
        });

        const sortedStages = Object.entries(stages)
            .sort(([a], [b]) => parseInt(a) - parseInt(b));

        const taskPositions = {};
        const stageCount = sortedStages.length;

        sortedStages.forEach(([stageKey, stageTasks], stageIndex) => {
            const height = canvas.height;
            const ySpacing = height / (stageTasks.length + 1);
            stageTasks.forEach((task, taskIndex) => {
                taskPositions[task.id] = {
                    x: (canvas.width / (stageCount + 1)) * (stageIndex + 1),
                    y: ySpacing * (taskIndex + 1),
                    task: task
                };
            });
        });

        // Check if click is near a task
        for (const [id, pos] of Object.entries(taskPositions)) {
            const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
            if (distance <= 20) { // 20px radius
                setSelectedTask(pos.task);
                return;
            }
        }

        // If no task was clicked, deselect
        setSelectedTask(null);
    }, [getTaskFlow]);

    // Handle mouse move for hover effects
    const handleMouseMove = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Get task positions to check for hover
        const flow = getTaskFlow();
        const uniqueTasks = [...new Set(flow.flatMap(f => [f.from, f.to]))];

        const stages = {};
        uniqueTasks.forEach(task => {
            const timestamp = task.creationTime || Date.now();
            const stageKey = Math.floor(timestamp / 10000);
            if (!stages[stageKey]) {
                stages[stageKey] = [];
            }
            stages[stageKey].push(task);
        });

        const sortedStages = Object.entries(stages)
            .sort(([a], [b]) => parseInt(a) - parseInt(b));

        const taskPositions = {};
        const stageCount = sortedStages.length;

        sortedStages.forEach(([stageKey, stageTasks], stageIndex) => {
            const height = canvas.height;
            const ySpacing = height / (stageTasks.length + 1);
            stageTasks.forEach((task, taskIndex) => {
                taskPositions[task.id] = {
                    x: (canvas.width / (stageCount + 1)) * (stageIndex + 1),
                    y: ySpacing * (taskIndex + 1),
                    task: task
                };
            });
        });

        // Check if mouse is near a task
        for (const [id, pos] of Object.entries(taskPositions)) {
            const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
            if (distance <= 20) { // 20px radius
                setHoveredTask(pos.task);
                canvas.style.cursor = 'pointer';
                return;
            }
        }

        setHoveredTask(null);
        canvas.style.cursor = 'default';
    }, [getTaskFlow]);

    // Redraw when tasks or reasoning steps change
    useEffect(() => {
        drawFlow();
    }, [drawFlow]);

    // Setup event listeners
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('mousemove', handleMouseMove);

        return () => {
            canvas.removeEventListener('click', handleCanvasClick);
            canvas.removeEventListener('mousemove', handleMouseMove);
        };
    }, [handleCanvasClick, handleMouseMove]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            drawFlow();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [drawFlow]);

    return React.createElement('div', null,
        // Task details panel when a task is selected
        selectedTask && React.createElement('div',
            {
                style: {
                    marginBottom: '1rem',
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                }
            },
            React.createElement('h4', {style: {margin: '0 0 0.5rem 0', color: '#007bff'}}, 'Selected Task'),
            React.createElement('div', {
                    style: {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '1rem'
                    }
                },
                React.createElement('div', null,
                    React.createElement('strong', null, 'Term:'),
                    React.createElement('div', null, selectedTask.term || 'N/A')
                ),
                React.createElement('div', null,
                    React.createElement('strong', null, 'Type:'),
                    React.createElement('div', null, selectedTask.type || 'N/A')
                ),
                selectedTask.truth && React.createElement('div', null,
                    React.createElement('strong', null, 'Truth:'),
                    React.createElement('div', null, JSON.stringify(selectedTask.truth))
                ),
                selectedTask.budget && React.createElement('div', null,
                    React.createElement('strong', null, 'Budget:'),
                    React.createElement('div', null,
                        `Priority: ${(selectedTask.budget.priority || 0).toFixed(3)}, ` +
                        `Durability: ${(selectedTask.budget.durability || 0).toFixed(3)}`
                    )
                )
            )
        ),

        // Canvas for the flow diagram
        React.createElement('div',
            {style: {width: '100%', height: '400px', border: '1px solid #ddd', borderRadius: '4px'}},
            React.createElement('canvas',
                {
                    ref: canvasRef,
                    width: 800,
                    height: 400,
                    style: {width: '100%', height: '100%', display: 'block'}
                }
            )
        )
    );
};

export default TaskFlowDiagram;