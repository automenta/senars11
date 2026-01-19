/**
 * Utility to highlight Narsese syntax in text.
 */
export class NarseseHighlighter {
    static highlight(text) {
        if (!text) return '';

        let html = text
            // Escape HTML (simple version)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // 1. Highlight Structure: < and >
        html = html.replace(/(&lt;|&gt;)/g, '<span class="nars-structure">$1</span>');

        // 2. Highlight Relations: -->, <->, ==> etc.
        html = html.replace(/(--&gt;|&lt;-&gt;|=&gt;|&lt;=&gt;)/g, '<span class="nars-copula">$1</span>');

        // 3. Highlight Truth Values: %1.0;0.9%
        html = html.replace(/(%\d+(\.\d+)?;\d+(\.\d+)?%)/g, '<span class="nars-truth">$1</span>');

        // 4. Highlight Variables: $x, #y, ?z
        html = html.replace(/([$#?][a-zA-Z0-9_]+)/g, '<span class="nars-variable">$1</span>');

        // 5. Highlight Operators: ^op
        html = html.replace(/(\^[a-zA-Z0-9_]+)/g, '<span class="nars-operator">$1</span>');

        // 6. Highlight Punctuation: . ! ? @
        // (Careful not to match inside words, but Narsese usually has spaces or is at end)
        html = html.replace(/(\s)([\.!\?@])(\s|$)/g, '$1<span class="nars-punctuation">$2</span>$3');

        // Also handle punctuation if it's the only thing or at end of string without space logic if tight
        // But the above is safer.

        return html;
    }
}
