const log = document.getElementById('log');
const input = document.getElementById('input');
const ws = new WebSocket(`ws://${location.host}`);

const cy = cytoscape({
    container: document.getElementById('cy'),
    style: [
        { selector: 'node', style: { 'label': 'data(label)', 'background-color': '#666', 'color': '#fff', 'text-valign': 'center', 'text-halign': 'center' } },
        { selector: 'edge', style: { 'label': 'data(label)', 'width': 2, 'line-color': '#999', 'target-arrow-color': '#999', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'font-size': 10 } }
    ],
    layout: { name: 'cose', animate: true }
});

function appendLog(text) {
    const div = document.createElement('div');
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

ws.onopen = () => appendLog('Connected to SeNARS Core.');
ws.onclose = () => appendLog('Disconnected.');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'input_ack') {
        appendLog(`Input: ${data.task}`);
        addNode(data.task);
    }
    if (data.type === 'derivation') {
        appendLog(`Derived: ${data.task}`);
        addNode(data.task);
    }
    if (data.type === 'error') {
        appendLog(`Error: ${data.message}`);
    }
};

input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const content = input.value.trim();
        if (content) {
            ws.send(JSON.stringify({type: 'input', content}));
            input.value = '';
        }
    }
});

function addNode(taskStr) {
    // Clean punctuation
    const cleanStr = taskStr.replace(/[.!?].*$/, ''); // Remove . and truth value
    // Try to match (A op B)
    // This naive regex assumes atomic terms or simple structure.
    // For robust parsing, we'd need a real parser client-side or send structured data from server.
    // We'll stick to matching the common operators.
    const match = cleanStr.match(/^\((.+?) (-->|<->|==>|<=>) (.+?)\)$/);

    if (match) {
        const [_, s, op, p] = match;
        if (!cy.getElementById(s).length) cy.add({ group: 'nodes', data: { id: s, label: s } });
        if (!cy.getElementById(p).length) cy.add({ group: 'nodes', data: { id: p, label: p } });

        const edgeId = `${s}-${p}`;
        if (!cy.getElementById(edgeId).length) {
            cy.add({ group: 'edges', data: { id: edgeId, source: s, target: p, label: op } });
            // Re-run layout gently
            cy.layout({ name: 'cose', animate: true, animationDuration: 500 }).run();
        }
    } else {
        // Just add node
        if (!cy.getElementById(cleanStr).length) {
            cy.add({ group: 'nodes', data: { id: cleanStr, label: cleanStr } });
            cy.layout({ name: 'cose', animate: true, animationDuration: 500 }).run();
        }
    }
}
