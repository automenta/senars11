/**
 * Cell Renderer Utility for SeNARS REPL
 * Provides shared functionality for rendering cells in both session history and REPL output
 */

import { getPunctuationClass } from './punctuationUtils.js';

/**
 * Create a DOM element for a history cell
 * @param {string} sessionId - Session identifier
 * @param {Object} cell - Cell data
 * @returns {HTMLElement} Cell element
 */
export function createCellElement(sessionId, cell) {
  // Create a container for the cell
  const cellContainer = document.createElement('div');
  cellContainer.className = 'history-cell';
  cellContainer.style.width = '100%';
  cellContainer.dataset.cellId = cell.id; // Store cell ID for later reference
  
  // Create line element based on cell type
  const lineElement = document.createElement('div');
  lineElement.className = 'output-line';
  
  if (cell.type === 'input') {
    lineElement.classList.add('input-line');
    lineElement.textContent = `${sessionId}> ${cell.content}`;
  } else {
    lineElement.textContent = cell.content.text || '';
    
    // Apply punctuation styling if available
    if (cell.content.punctuation) {
      const punctClass = getPunctuationClass(cell.content.punctuation);
      lineElement.classList.add(punctClass);
    }
    
    // Add truth bar if available
    if (cell.content.truth) {
      const truthBar = document.createElement('meter');
      truthBar.className = 'truth-bar';
      truthBar.min = 0;
      truthBar.max = 1;
      truthBar.value = cell.content.truth.frequency || 0;
      truthBar.title = `Frequency: ${(cell.content.truth.frequency * 100).toFixed(1)}%, Confidence: ${(cell.content.truth.confidence * 100).toFixed(1)}%`;
      lineElement.appendChild(truthBar);
    }
    
    // Add priority badge if available
    if (typeof cell.content.priority === 'number') {
      const priorityBadge = document.createElement('span');
      priorityBadge.className = 'priority-badge';
      priorityBadge.textContent = cell.content.priority.toFixed(2);
      lineElement.appendChild(priorityBadge);
    }
  }
  
  cellContainer.appendChild(lineElement);
  return cellContainer;
}

/**
 * Create a cell group element
 * @returns {HTMLElement} Cell group element
 */
export function createCellGroup() {
  const cellGroup = document.createElement('div');
  cellGroup.className = 'cell-group';
  return cellGroup;
}

/**
 * Get the current cell group from an output element
 * @param {HTMLElement} outputElement - Output element to search in
 * @returns {HTMLElement|null} Current cell group or null if none exists
 */
export function getCurrentCellGroup(outputElement) {
  const cellGroups = outputElement.querySelectorAll('.cell-group');
  return cellGroups.length > 0 ? cellGroups[cellGroups.length - 1] : null;
}

/**
 * Add a line to the output display
 * @param {HTMLElement} outputElement - Output element to add to
 * @param {string} sessionId - Session identifier
 * @param {Object} line - Line object with text and optional metadata
 */
export function addOutputLine(outputElement, sessionId, line) {
  // Create cell group if it doesn't exist
  let cellGroup = getCurrentCellGroup(outputElement);
  if (!cellGroup) {
    cellGroup = createCellGroup();
    outputElement.appendChild(cellGroup);
  }
  
  const lineElement = document.createElement('div');
  lineElement.className = 'output-line';
  lineElement.setAttribute('role', 'listitem');
  
  // Use a mapping object for line types to reduce switch statement
  const lineTypeHandlers = {
    'input': () => {
      lineElement.classList.add('input-line');
      lineElement.setAttribute('aria-label', `Input: ${sessionId}> ${line.text}`);
      lineElement.textContent = `${sessionId}> ${line.text}`;
    },
    'error': () => {
      lineElement.classList.add('error-line');
      lineElement.setAttribute('aria-label', `Error: ${line.text || ''}`);
      lineElement.setAttribute('role', 'alert');
      lineElement.textContent = line.text || '';
    },
    'default': () => {
      // Apply punctuation styling if available
      if (line.punctuation) {
        const punctClass = getPunctuationClass(line.punctuation);
        lineElement.classList.add(punctClass);
      }
      lineElement.setAttribute('aria-label', `Output: ${line.text || ''}`);
      lineElement.textContent = line.text || '';
    }
  };
  
  // Execute appropriate handler
  const handler = lineTypeHandlers[line.type] || lineTypeHandlers['default'];
  handler();
  
  cellGroup.appendChild(lineElement);
  
  // Scroll to bottom
  outputElement.scrollTop = outputElement.scrollHeight;
}

/**
 * Add a structured line to the output display
 * @param {HTMLElement} outputElement - Output element to add to
 * @param {Object} line - Line object with text and optional metadata
 */
export function addStructuredOutputLine(outputElement, line) {
  // Create cell group if it doesn't exist
  let cellGroup = getCurrentCellGroup(outputElement);
  if (!cellGroup) {
    cellGroup = createCellGroup();
    outputElement.appendChild(cellGroup);
  }
  
  const lineElement = document.createElement('div');
  lineElement.className = 'output-line structured-output';
  lineElement.setAttribute('role', 'listitem');
  
  // Apply punctuation styling if available
  if (line.punctuation) {
    const punctClass = getPunctuationClass(line.punctuation);
    lineElement.classList.add(punctClass);
  }
  
  // Add text content with ARIA label
  const textElement = document.createElement('span');
  textElement.className = 'output-text';
  textElement.textContent = line.text || '';
  textElement.setAttribute('aria-label', `Output text: ${line.text || ''}`);
  lineElement.appendChild(textElement);
  
  // Add truth bar if available
  if (line.truth) {
    const truthBar = document.createElement('meter');
    truthBar.className = 'truth-bar';
    truthBar.min = 0;
    truthBar.max = 1;
    truthBar.value = line.truth.frequency || 0;
    truthBar.title = `Frequency: ${(line.truth.frequency * 100).toFixed(1)}%, Confidence: ${(line.truth.confidence * 100).toFixed(1)}%`;
    truthBar.setAttribute('aria-label', `Truth bar: Frequency ${(line.truth.frequency * 100).toFixed(1)}%, Confidence ${(line.truth.confidence * 100).toFixed(1)}%`);
    lineElement.appendChild(truthBar);
  }
  
  // Add priority badge if available
  if (typeof line.priority === 'number') {
    const priorityBadge = document.createElement('span');
    priorityBadge.className = 'priority-badge';
    priorityBadge.textContent = line.priority.toFixed(2);
    priorityBadge.setAttribute('aria-label', `Priority: ${line.priority.toFixed(2)}`);
    lineElement.appendChild(priorityBadge);
  }
  
  // Add "Send to session" menu button for structured output
  if (window.sessionManager && line.text) {
    const menuButton = document.createElement('button');
    menuButton.textContent = '⋯';
    menuButton.className = 'send-to-menu-btn';
    menuButton.setAttribute('aria-label', 'Send to session menu');
    menuButton.style.cssText = `
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      margin-left: 8px;
      opacity: 0.5;
      vertical-align: middle;
    `;
    
    menuButton.addEventListener('mouseenter', () => {
      menuButton.style.opacity = '1';
    });
    
    menuButton.addEventListener('mouseleave', () => {
      menuButton.style.opacity = '0.5';
    });
    
    menuButton.addEventListener('click', (event) => {
      event.stopPropagation();
      // Get session ID from parent element
      const sessionElement = outputElement.closest('.session');
      const sessionId = sessionElement ? sessionElement.getAttribute('data-session-id') : 'main';
      
      // Create and show menu
      const menu = window.sessionManager.createSendToSessionMenu(sessionId, line);
      menu.style.top = `${event.clientY}px`;
      menu.style.left = `${event.clientX}px`;
      document.body.appendChild(menu);
    });
    
    lineElement.appendChild(menuButton);
    
    // Add truth chart toggle button if truth data is available
    if (line.truth) {
      const chartButton = document.createElement('button');
      chartButton.textContent = '📊';
      chartButton.className = 'truth-chart-btn';
      chartButton.setAttribute('aria-label', 'Toggle truth chart visualization');
      chartButton.style.cssText = `
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        margin-left: 4px;
        opacity: 0.5;
        vertical-align: middle;
      `;
      
      chartButton.addEventListener('mouseenter', () => {
        chartButton.style.opacity = '1';
      });
      
      chartButton.addEventListener('mouseleave', () => {
        chartButton.style.opacity = '0.5';
      });
      
      chartButton.addEventListener('click', (event) => {
        event.stopPropagation();
        // Toggle truth chart visibility
        const chartContainer = lineElement.querySelector('.truth-chart-container');
        if (chartContainer) {
          chartContainer.remove();
        } else {
          addTruthChart(lineElement, line.truth);
        }
      });
      
      lineElement.appendChild(chartButton);
    }
    
    // Add derivation popup button if derivation data is available
    if (line.derivation) {
      const derivationButton = document.createElement('button');
      derivationButton.textContent = '🌳';
      derivationButton.className = 'derivation-popup-btn';
      derivationButton.setAttribute('aria-label', 'Show derivation tree');
      derivationButton.style.cssText = `
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        margin-left: 4px;
        opacity: 0.5;
        vertical-align: middle;
      `;
      
      derivationButton.addEventListener('mouseenter', () => {
        derivationButton.style.opacity = '1';
      });
      
      derivationButton.addEventListener('mouseleave', () => {
        derivationButton.style.opacity = '0.5';
      });
      
      derivationButton.addEventListener('click', (event) => {
        event.stopPropagation();
        // Show derivation popup
        showDerivationPopup(line.derivation, event);
      });
      
      lineElement.appendChild(derivationButton);
    }
  }
  
  // Add ARIA label for the entire line element based on content
  let ariaLabel = `Output: ${line.text || ''}`;
  if (line.priority !== undefined) ariaLabel += ` (Priority: ${line.priority})`;
  if (line.truth) ariaLabel += ` (Frequency: ${(line.truth.frequency * 100).toFixed(1)}%, Confidence: ${(line.truth.confidence * 100).toFixed(1)}%)`;
  lineElement.setAttribute('aria-label', ariaLabel);
  
  cellGroup.appendChild(lineElement);
  
  // Scroll to bottom
  outputElement.scrollTop = outputElement.scrollHeight;
}

/**
 * Show derivation popup
 * @param {Object} derivation - Derivation data
 * @param {Event} event - Click event
 */
export function showDerivationPopup(derivation, event) {
  // Remove existing popup if present
  const existingPopup = document.querySelector('.derivation-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Create popup container
  const popup = document.createElement('div');
  popup.className = 'derivation-popup';
  popup.style.cssText = `
    position: fixed;
    background: var(--background-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    min-width: 300px;
    max-width: 500px;
    max-height: 70vh;
    overflow: hidden;
    font-family: ui-monospace, monospace;
  `;
  
  // Position near the clicked button
  if (event) {
    // Calculate position to ensure popup stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = 400; // Approximate width
    const popupHeight = 300; // Approximate height
    
    let top = event.clientY + 10;
    let left = event.clientX + 10;
    
    // Adjust if popup would go off right edge
    if (left + popupWidth > viewportWidth) {
      left = viewportWidth - popupWidth - 10;
    }
    
    // Adjust if popup would go off bottom edge
    if (top + popupHeight > viewportHeight) {
      top = viewportHeight - popupHeight - 10;
    }
    
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
  }
  
  // Create header
  const header = document.createElement('div');
  header.className = 'derivation-popup-header';
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    background: var(--background-secondary);
  `;
  
  const title = document.createElement('div');
  title.className = 'derivation-popup-title';
  title.textContent = 'Derivation Tree';
  title.style.cssText = `
    font-weight: bold;
    font-size: 1.1em;
    color: var(--text-primary);
  `;
  
  const closeButton = document.createElement('button');
  closeButton.className = 'derivation-popup-close';
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 1.5em;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  `;
  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.backgroundColor = 'var(--background-tertiary)';
  });
  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.backgroundColor = 'transparent';
  });
  closeButton.addEventListener('click', () => popup.remove());
  
  header.appendChild(title);
  header.appendChild(closeButton);
  
  // Create content
  const content = document.createElement('div');
  content.className = 'derivation-popup-content';
  content.style.cssText = `
    padding: 16px;
    max-height: calc(70vh - 60px);
    overflow-y: auto;
    white-space: pre-wrap;
    font-family: ui-monospace, monospace;
    font-size: 0.9em;
    line-height: 1.4;
  `;
  
  // Format derivation tree
  content.textContent = formatDerivationTree(derivation);
  
  // Assemble popup
  popup.appendChild(header);
  popup.appendChild(content);
  
  // Add to document
  document.body.appendChild(popup);
  
  // Close popup when clicking outside
  const closePopup = (event) => {
    if (!popup.contains(event.target) && event.target !== popup.previousSibling) {
      popup.remove();
      document.removeEventListener('click', closePopup);
    }
  };
  
  // Also close popup when pressing Escape key
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      popup.remove();
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', closePopup);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closePopup);
    document.addEventListener('keydown', handleKeyDown);
  }, 0);
}

/**
 * Format derivation tree for display
 * @param {Object} derivation - Derivation data
 * @param {number} depth - Current depth level
 * @returns {string} Formatted derivation tree
 */
function formatDerivationTree(derivation, depth = 0) {
  if (!derivation) return '';
  
  const indent = '  '.repeat(depth);
  let result = `${indent}${derivation.conclusion || 'Conclusion'}\n`;
  
  if (derivation.premises && Array.isArray(derivation.premises)) {
    derivation.premises.forEach(premise => {
      if (typeof premise === 'string') {
        result += `${indent}  ${premise}\n`;
      } else if (premise && typeof premise === 'object') {
        result += formatDerivationTree(premise, depth + 1);
      }
    });
  }
  
  return result;
}

/**
 * Add a truth chart to an output line
 * @param {HTMLElement} lineElement - Line element to add chart to
 * @param {Object} truth - Truth object with frequency and confidence
 */
export function addTruthChart(lineElement, truth) {
  if (!truth) return;
  
  // Create chart container
  const chartContainer = document.createElement('div');
  chartContainer.className = 'truth-chart-container';
  chartContainer.style.cssText = `
    margin-top: 8px;
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: var(--background-secondary);
  `;
  
  // Create chart title
  const title = document.createElement('div');
  title.textContent = 'Truth Visualization';
  title.style.cssText = `
    font-weight: bold;
    margin-bottom: 8px;
    color: var(--text-primary);
  `;
  chartContainer.appendChild(title);
  
  // Create canvas for Chart.js
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    width: 100%;
    height: 200px;
  `;
  chartContainer.appendChild(canvas);
  
  // Chart info
  const info = document.createElement('div');
  info.style.cssText = `
    margin-top: 8px;
    font-size: 0.8em;
    color: var(--text-secondary);
    display: flex;
    justify-content: space-between;
  `;
  
  const freqInfo = document.createElement('span');
  freqInfo.textContent = `Frequency: ${(truth.frequency * 100).toFixed(1)}%`;
  
  const confInfo = document.createElement('span');
  confInfo.textContent = `Confidence: ${(truth.confidence * 100).toFixed(1)}%`;
  
  info.appendChild(freqInfo);
  info.appendChild(confInfo);
  chartContainer.appendChild(info);
  lineElement.appendChild(chartContainer);
  
  // Load Chart.js dynamically and render the chart
  loadChartJs().then(() => {
    if (typeof Chart !== 'undefined') {
      // Destroy existing chart if it exists
      if (canvas.chart) {
        canvas.chart.destroy();
      }
      
      // Create new chart
      canvas.chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: ['Frequency', 'Confidence'],
          datasets: [{
            label: 'Truth Values',
            data: [truth.frequency, truth.confidence],
            backgroundColor: [
              'rgba(46, 204, 113, 0.6)',  // Green for frequency
              'rgba(52, 152, 219, 0.6)'   // Blue for confidence
            ],
            borderColor: [
              'rgba(46, 204, 113, 1)',
              'rgba(52, 152, 219, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 1,
              ticks: {
                callback: function(value) {
                  return (value * 100).toFixed(0) + '%';
                }
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${(context.raw * 100).toFixed(1)}%`;
                }
              }
            }
          }
        }
      });
    }
  }).catch(error => {
    console.warn('Failed to load Chart.js, falling back to simple visualization:', error);
    // Fallback to simple visualization if Chart.js fails to load
    createSimpleTruthChart(canvas, truth);
  });
}

/**
 * Load Chart.js dynamically
 * @returns {Promise} Promise that resolves when Chart.js is loaded
 */
function loadChartJs() {
  return new Promise((resolve, reject) => {
    // Check if Chart.js is already loaded
    if (typeof Chart !== 'undefined') {
      resolve();
      return;
    }
    
    // Create script element
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = resolve;
    script.onerror = reject;
    
    // Add to document
    document.head.appendChild(script);
  });
}

/**
 * Create simple truth chart as fallback
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} truth - Truth object with frequency and confidence
 */
function createSimpleTruthChart(canvas, truth) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Set dimensions
  const width = canvas.width;
  const height = canvas.height;
  
  // Draw background
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, width, height);
  
  // Draw frequency bar
  ctx.fillStyle = 'rgba(46, 204, 113, 0.6)';
  ctx.fillRect(0, 0, width * truth.frequency, height / 2);
  
  // Draw confidence bar
  ctx.fillStyle = 'rgba(52, 152, 219, 0.6)';
  ctx.fillRect(0, height / 2, width * truth.confidence, height / 2);
  
  // Draw labels
  ctx.fillStyle = '#000';
  ctx.font = '12px Arial';
  ctx.fillText(`Frequency: ${(truth.frequency * 100).toFixed(1)}%`, 5, 15);
  ctx.fillText(`Confidence: ${(truth.confidence * 100).toFixed(1)}%`, 5, height - 5);
}

/**
 * Process data for visualization using dataProcessor utilities
 * @param {Array} data - Data to process
 * @param {Object} options - Processing options
 * @returns {Array} Processed data
 */
export function processVisualizationData(data, options = {}) {
  // Try to import dataProcessor utilities
  try {
    // In a module context, we can't dynamically import, so we'll use a fallback
    // For now, we'll implement a simple version directly
    if (options.groupingStrategy === 'timestamp' && Array.isArray(data)) {
      const groupedByTime = new Map();
      data.forEach(item => {
        const timestamp = item.timestamp || item.creationTime || Date.now();
        const interval = Math.floor(timestamp / 10000);
        if (!groupedByTime.has(interval)) {
          groupedByTime.set(interval, []);
        }
        groupedByTime.get(interval).push(item);
      });
      return Array.from(groupedByTime.values()).flat();
    }
  } catch (error) {
    console.warn('Could not process visualization data:', error);
  }
  
  return data;
}

/**
 * Create network visualization data
 * @param {Array} sessions - Session data
 * @returns {Object} Network data with nodes and edges
 */
export function createNetworkVisualizationData(sessions) {
  const nodes = [];
  const edges = [];
  
  // Create nodes for each session
  sessions.forEach(session => {
    nodes.push({
      id: session.id,
      label: session.id,
      color: getSessionColor(session.id),
      size: 20,
      x: Math.random() * 500,
      y: Math.random() * 500
    });
  });
  
  // Create edges based on belief propagation (placeholder logic)
  // In a real implementation, this would be based on actual belief relationships
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      // Randomly create some edges as an example
      if (Math.random() > 0.7) {
        edges.push({
          id: `edge-${sessions[i].id}-${sessions[j].id}`,
          source: sessions[i].id,
          target: sessions[j].id,
          label: 'belief propagation',
          size: Math.random() * 3 + 1
        });
      }
    }
  }
  
  return { nodes, edges };
}

/**
 * Get session color based on session ID
 * @param {string} sessionId - Session identifier
 * @returns {string} Color string
 */
function getSessionColor(sessionId) {
  if (sessionId === 'main') {
    return '#3498db'; // --session-main
  }
  
  // Generate consistent color for session IDs
  const sessionColors = [
    '#e74c3c', // --session-agent1
    '#9b59b6', // --session-agent2
    '#1abc9c', // --session-agent3
    '#f39c12', // --session-agent4
    '#34495e', // --session-agent5
    '#2ecc71'  // --session-agent6
  ];
  
  // Hash the session ID to get a consistent color
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = sessionId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % sessionColors.length;
  return sessionColors[index];
}