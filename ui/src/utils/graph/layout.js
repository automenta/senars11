/**
 * Graph layout algorithms
 */

// Apply force-directed layout using D3 physics simulation
export const applyForceDirectedLayout = (graphData) => {
  // This would typically be handled by react-force-graph internally
  // For now, return the data as-is since the graph library handles the physics
  return graphData;
};

// Apply hierarchical layout
export const applyHierarchicalLayout = (graphData) => {
  const { nodes, links } = graphData;
  const updatedNodes = [...nodes];
  
  // Simple hierarchical layout based on node connections
  // Group nodes by type and arrange them in levels
  const conceptNodes = updatedNodes.filter(n => n.type === 'concept');
  const taskNodes = updatedNodes.filter(n => n.type === 'task');
  const otherNodes = updatedNodes.filter(n => !['concept', 'task'].includes(n.type));
  
  // Position concept nodes on the left
  conceptNodes.forEach((node, index) => {
    node.x = 100;
    node.y = 100 + index * 80;
  });
  
  // Position task nodes in the middle
  taskNodes.forEach((node, index) => {
    node.x = 400;
    node.y = 100 + index * 80;
  });
  
  // Position other nodes on the right
  otherNodes.forEach((node, index) => {
    node.x = 700;
    node.y = 100 + index * 80;
  });
  
  return { nodes: updatedNodes, links };
};

// Apply circular layout
export const applyCircularLayout = (graphData) => {
  const { nodes, links } = graphData;
  const updatedNodes = [...nodes];
  
  const centerX = 400;
  const centerY = 300;
  const radius = Math.min(300, 10 * Math.sqrt(nodes.length));
  
  updatedNodes.forEach((node, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI;
    node.x = centerX + radius * Math.cos(angle);
    node.y = centerY + radius * Math.sin(angle);
  });
  
  return { nodes: updatedNodes, links };
};

// Apply clustered layout by node type
export const applyClusteredLayout = (graphData) => {
  const { nodes, links } = graphData;
  const updatedNodes = [...nodes];
  
  // Group by type
  const nodesByType = {};
  updatedNodes.forEach(node => {
    if (!nodesByType[node.type]) {
      nodesByType[node.type] = [];
    }
    nodesByType[node.type].push(node);
  });
  
  // Position clusters in different areas
  const clusterPositions = {
    concept: { x: 100, y: 100 },
    task: { x: 500, y: 100 },
    belief: { x: 100, y: 400 },
    goal: { x: 500, y: 400 },
    question: { x: 300, y: 250 }
  };
  
  Object.entries(nodesByType).forEach(([type, typeNodes]) => {
    const clusterPos = clusterPositions[type] || { x: 300, y: 300 };
    
    typeNodes.forEach((node, index) => {
      // Position nodes in a small cluster around the type position
      const offset = index * 30;
      node.x = clusterPos.x + (offset % 120) - 60;
      node.y = clusterPos.y + Math.floor(offset / 120) * 30;
    });
  });
  
  return { nodes: updatedNodes, links };
};