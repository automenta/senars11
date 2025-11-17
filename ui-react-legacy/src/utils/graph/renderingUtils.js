/**
 * Shared Rendering Utilities for Graph Visualization
 * Contains reusable drawing functions for nodes and links
 */

import {themeUtils} from '../../utils/themeUtils.js';

// Draw node with detailed information based on type
export const drawNodeWithDetails = (node, ctx, globalScale, selectedNode, NODE_TYPE_CONFIG) => {
    const label = node.term ?? node.id;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;

    // Calculate radius based on priority
    const baseRadius = 8 / globalScale; // Using same base as DEFAULT_NODE_SIZE
    const priorityRadius = node.priority ? (node.priority * 24 / globalScale) : baseRadius; // Using same max as MAX_NODE_SIZE
    const radius = Math.max(baseRadius, priorityRadius);

    // Draw main node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = NODE_TYPE_CONFIG[node.type]?.color ?? '#999';
    ctx.fill();

    // Highlight selected node
    if (selectedNode?.id === node.id) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
    }

    // Draw label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = themeUtils.get('TEXT.PRIMARY');
    ctx.fillText(label, node.x, node.y + fontSize * 1.2);

    // Draw priority indicator as border thickness
    if (node.priority != null) {
        const priority = Math.max(0, Math.min(1, node.priority));
        const borderWidth = Math.max(1, priority * 5) / globalScale;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + borderWidth, 0, 2 * Math.PI, false);
        ctx.strokeStyle = `rgba(255, 255, 255, ${priority})`;
        ctx.lineWidth = borderWidth;
        ctx.stroke();
    }

    // Draw node-specific information based on type
    switch (node.type) {
        case 'belief':
            drawBeliefInfo(ctx, node, radius, fontSize, globalScale);
            break;
        case 'goal':
            drawGoalInfo(ctx, node, radius, fontSize, globalScale);
            break;
        case 'question':
            drawQuestionInfo(ctx, node, radius, fontSize, globalScale);
            break;
    }
};

// Helper function to draw belief-specific information (frequency and confidence)
const drawBeliefInfo = (ctx, node, radius, fontSize, globalScale) => {
    if (!node.truth) return;

    const frequency = node.truth.frequency;
    const confidence = node.truth.confidence;

    // Draw frequency indicator as inner circle
    if (frequency != null) {
        const freqRadius = radius * 0.6;
        ctx.beginPath();
        ctx.arc(node.x, node.y, freqRadius, 0, 2 * Math.PI, false);
        ctx.strokeStyle = `rgba(255, 0, 0, ${frequency})`; // Red for frequency
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();

        // Add frequency text
        ctx.font = `${fontSize * 0.8}px Sans-Serif`;
        ctx.fillStyle = '#000';
        ctx.fillText(`${frequency.toFixed(2)}`, node.x, node.y - fontSize * 0.5);
    }

    // Draw confidence indicator
    if (confidence != null) {
        // Draw confidence as a small bar at the bottom
        const barWidth = 12 / globalScale;
        const barHeight = 4 / globalScale;
        const barX = node.x - barWidth / 2;
        const barY = node.y + radius + 2 / globalScale;

        // Background bar (gray)
        ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Confidence bar (blue)
        ctx.fillStyle = `rgba(0, 123, 255, ${confidence})`;
        ctx.fillRect(barX, barY, barWidth * confidence, barHeight);
    }
};

// Helper function to draw goal-specific information (desire and confidence)
const drawGoalInfo = (ctx, node, radius, fontSize, globalScale) => {
    if (!node.truth) return;

    const desire = node.truth.desire;
    const confidence = node.truth.confidence;

    if (desire != null) {
        // Draw desire as an outer ring around the goal node
        const desireRadius = radius * 1.3;
        ctx.beginPath();
        ctx.arc(node.x, node.y, desireRadius, 0, 2 * Math.PI, false);
        ctx.strokeStyle = `rgba(255, 0, 0, ${Math.abs(desire)})`; // Red for positive, blue for negative
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();

        // Add desire text
        ctx.font = `${fontSize * 0.8}px Sans-Serif`;
        ctx.fillStyle = '#000';
        ctx.fillText(`${desire.toFixed(2)}`, node.x, node.y + fontSize * 1.8);
    }

    if (confidence != null) {
        // Draw confidence as a small bar at the bottom
        const barWidth = 12 / globalScale;
        const barHeight = 4 / globalScale;
        const barX = node.x - barWidth / 2;
        const barY = node.y + radius + 6 / globalScale;

        // Background bar (gray)
        ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Confidence bar (red for goals)
        ctx.fillStyle = `rgba(220, 53, 69, ${confidence})`;
        ctx.fillRect(barX, barY, barWidth * confidence, barHeight);
    }
};

// Helper function to draw question-specific information (priority indicators)
const drawQuestionInfo = (ctx, node, radius, fontSize, globalScale) => {
    if (node.priority == null) return;

    // Draw question priority as a pulsing border effect
    const pulseOffset = (Date.now() % 1000) / 1000; // 0 to 1 over 1 second
    const pulseValue = Math.sin(pulseOffset * Math.PI * 2) * 0.5 + 0.5; // 0 to 1
    const pulseRadius = radius * (1.1 + 0.2 * pulseValue); // Pulsing radius

    ctx.beginPath();
    ctx.arc(node.x, node.y, pulseRadius, 0, 2 * Math.PI, false);
    ctx.strokeStyle = `rgba(111, 66, 193, ${0.3 + 0.7 * pulseValue})`; // Purple for questions
    ctx.lineWidth = 1 / globalScale;
    ctx.stroke();
};

// Draw link with detailed information
export const drawLinkWithDetails = (link, ctx, globalScale, LINK_TYPE_STYLES) => {
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);

    // Get style based on link type
    const style = LINK_TYPE_STYLES[link.type] ?? LINK_TYPE_STYLES.association;
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width / globalScale;

    // Apply dash pattern if specified
    if (style.dash) {
        ctx.setLineDash(style.dash);
    }

    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Draw arrow for directional relationships
    if (link.directional) {
        const angle = Math.atan2(link.target.y - link.source.y, link.target.x - link.source.x);
        const arrowSize = 5 / globalScale;

        ctx.beginPath();
        ctx.moveTo(link.target.x, link.target.y);
        ctx.lineTo(
            link.target.x - arrowSize * Math.cos(angle - Math.PI / 6),
            link.target.y - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            link.target.x - arrowSize * Math.cos(angle + Math.PI / 6),
            link.target.y - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
    }
};