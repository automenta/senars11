/**
 * Export utilities for different data formats
 */
export const exportData = (data, format, filenamePrefix = 'export') => {
    let content, mimeType, fileName;

    switch (format) {
        case 'json':
            content = JSON.stringify(data, null, 2);
            mimeType = 'application/json';
            fileName = `${filenamePrefix}-${Date.now()}.json`;
            break;

        case 'csv':
            content = createCsvContent(data);
            mimeType = 'text/csv';
            fileName = `${filenamePrefix}-${Date.now()}.csv`;
            break;

        case 'text':
        default:
            content = createTextContent(data);
            mimeType = 'text/plain';
            fileName = `${filenamePrefix}-${Date.now()}.txt`;
            break;
    }

    // Create and trigger download
    const blob = new Blob([content], {type: mimeType});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const createCsvContent = (data) => {
    if (!data.traces || data.traces.length === 0) {
        return 'No data to export\n';
    }

    const headers = ['ID', 'Type', 'Timestamp', 'Description', 'Term', 'Truth', 'Priority'];
    let csvContent = headers.join(',') + '\n';

    data.traces.forEach(trace => {
        const row = [
            trace.id,
            trace.type,
            new Date(trace.timestamp).toISOString(),
            `"${(trace.description || '').replace(/"/g, '""')}"`,
            `"${(trace.data.term || '').replace(/"/g, '""')}"`,
            `"${(trace.data.truth ? JSON.stringify(trace.data.truth) : '').replace(/"/g, '""')}"`,
            trace.data.budget ? trace.data.budget.priority : ''
        ];
        csvContent += row.join(',') + '\n';
    });

    return csvContent;
};

const createTextContent = (data) => {
    let textContent = `Reasoning Trace Export\n`;
    textContent += `Exported at: ${data.exportedAt}\n`;
    textContent += `Filter type: ${data.filterType}\n`;
    textContent += `Filter text: ${data.filterText}\n`;
    textContent += `Trace count: ${data.traceCount}\n\n`;

    data.traces.forEach(trace => {
        textContent += `ID: ${trace.id}\n`;
        textContent += `Type: ${trace.type}\n`;
        textContent += `Timestamp: ${new Date(trace.timestamp).toISOString()}\n`;
        textContent += `Description: ${trace.description}\n`;
        if (trace.data.term) textContent += `Term: ${trace.data.term}\n`;
        if (trace.data.truth) textContent += `Truth: ${JSON.stringify(trace.data.truth)}\n`;
        if (trace.data.budget) textContent += `Priority: ${trace.data.budget.priority}\n`;
        textContent += `---\n`;
    });

    return textContent;
};

/**
 * Export functions for reasoning traces
 */
export const exportReasoningTraces = (traceGroups, filterType, filterText, exportFormat) => {
    const exportDataContent = {
        exportedAt: new Date().toISOString(),
        filterType,
        filterText,
        traceCount: traceGroups.length,
        traces: traceGroups.map(trace => ({
            id: trace.id,
            type: trace.type,
            timestamp: new Date(trace.timestamp).toISOString(),
            description: trace.description,
            data: trace.data
        }))
    };

    exportData(exportDataContent, exportFormat, 'reasoning-trace');
};