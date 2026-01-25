import { logger } from '../core/logger.js';

// Simple Search Module
export class SimpleSearch {
    constructor() {
        this.prompts = [];
        this.searchIndex = new Map();
    }

    // Build search index
    buildIndex(prompts) {
        this.prompts = prompts || [];
        this.searchIndex.clear();

        // Create search entry for each prompt
        this.prompts.forEach(prompt => {
            const searchText = `${prompt.title} ${prompt.content}`.toLowerCase();
            const words = this.tokenizeText(searchText);

            // Build inverted index
            words.forEach(word => {
                if (!this.searchIndex.has(word)) {
                    this.searchIndex.set(word, []);
                }
                this.searchIndex.get(word).push(prompt.id);
            });
        });

        logger.debug(`Simple search initialized with ${this.searchIndex.size} terms and ${this.prompts.length} prompts.`);
    }

    // Search method
    search(query) {
        if (!query || !query.trim()) {
            return this.prompts.map(prompt => ({
                item: prompt,
                score: 1,
                matches: []
            }));
        }

        const queryLower = query.toLowerCase().trim();
        const queryWords = this.tokenizeText(queryLower);
        const promptScores = new Map();
        const promptMatches = new Map();

        // Method 1: Tokenized index matching
        queryWords.forEach(word => {
            const promptIds = this.searchIndex.get(word) || [];

            promptIds.forEach(promptId => {
                const currentScore = promptScores.get(promptId) || 0;
                const currentMatches = promptMatches.get(promptId) || [];

                // Increase score
                promptScores.set(promptId, currentScore + 1);

                // Record match info
                const prompt = this.prompts.find(p => p.id === promptId);
                if (prompt) {
                    const matches = this.findMatches(prompt, word);
                    promptMatches.set(promptId, [...currentMatches, ...matches]);
                }
            });
        });

        // Method 2: Direct substring matching (Chinese friendly)
        // If original query appears directly in title or content, it also counts as a match
        this.prompts.forEach(prompt => {
            const titleLower = prompt.title.toLowerCase();
            const contentLower = prompt.content.toLowerCase();

            if (titleLower.includes(queryLower) || contentLower.includes(queryLower)) {
                const currentScore = promptScores.get(prompt.id) || 0;
                // Substring match gives high score (matches complete query)
                promptScores.set(prompt.id, currentScore + queryWords.length + 1);

                const currentMatches = promptMatches.get(prompt.id) || [];
                const matches = this.findMatches(prompt, queryLower);
                promptMatches.set(prompt.id, [...currentMatches, ...matches]);
            }
        });

        // Convert to result array and sort
        const results = Array.from(promptScores.entries())
            .map(([promptId, score]) => {
                const prompt = this.prompts.find(p => p.id === promptId);
                if (!prompt) return null;

                // Normalize score (between 0-1)
                const normalizedScore = score / (queryWords.length + 1);

                return {
                    item: prompt,
                    score: normalizedScore,
                    matches: promptMatches.get(promptId) || []
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score);

        return results;
    }

    // Tokenization method
    tokenizeText(text) {
        return text
            .replace(/[^\w\u4e00-\u9fff-]/g, ' ') // Keep Chinese characters, letters, numbers and hyphens
            .split(/\s+/)
            .filter(word => word.length > 0 && word.length <= 50); // Filter out too long or empty words
    }

    // Find match positions
    findMatches(prompt, searchWord) {
        const matches = [];
        const title = prompt.title.toLowerCase();
        const content = prompt.content.toLowerCase();

        // Search in title
        let index = title.indexOf(searchWord);
        while (index !== -1) {
            matches.push({
                key: 'title',
                value: prompt.title,
                indices: [[index, index + searchWord.length - 1]]
            });
            index = title.indexOf(searchWord, index + 1);
        }

        // Search in content
        index = content.indexOf(searchWord);
        while (index !== -1) {
            matches.push({
                key: 'content',
                value: prompt.content,
                indices: [[index, index + searchWord.length - 1]]
            });
            index = content.indexOf(searchWord, index + 1);
        }

        return matches;
    }

    // Set search collection
    setCollection(prompts) {
        this.buildIndex(prompts);
    }

    // Get search index size
    getIndexSize() {
        return this.searchIndex.size;
    }

    // Get prompt count
    getPromptCount() {
        return this.prompts.length;
    }
}
