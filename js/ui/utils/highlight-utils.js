/**
 * HighlightUtils - Text Highlighting Utility Class
 * Handles text highlighting for search results
 */
export class HighlightUtils {
    /**
     * Highlight matching text
     * @param {string} text - Original text
     * @param {Array} matches - Array of match information
     * @param {string} fieldName - Field name
     * @returns {string} Highlighted HTML string
     */
    static highlightMatches(text, matches, fieldName) {
        if (!matches || !Array.isArray(matches)) {
            return text;
        }

        // Find match for current field
        const fieldMatch = matches.find(match => match.key === fieldName);
        if (!fieldMatch || !fieldMatch.indices) {
            return text;
        }

        let result = '';
        let lastIndex = 0;

        fieldMatch.indices.forEach(([start, end]) => {
            // Add unmatched part
            result += text.slice(lastIndex, start);
            // Add highlighted matched part
            result += `<mark>${text.slice(start, end + 1)}</mark>`;
            lastIndex = end + 1;
        });

        // Add remaining part
        result += text.slice(lastIndex);

        return result;
    }
}
