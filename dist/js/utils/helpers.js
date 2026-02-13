// Helper Functions
export function generateUUID() {
    return 'prompt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

export function throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            return func.apply(this, args);
        }
    };
}

export function sanitizeCommand(command) {
    return command
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-') // Allow underscores
        .replace(/-+/g, '-')
        .replace(/_+/g, '_')
        .replace(/^-|-$/g, '')
        .replace(/^_|_$/g, '')
        .substring(0, 30) || 'prompt';
}

export function generateCacheKey(content, title, type) {
    const input = `${title}:${content.substring(0, 100)}`;
    return `${type}_${hashCode(input)}`;
}

export function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

export function processVariables(content) {
    const now = new Date();
    const variables = {
        '{{DATE}}': now.toLocaleDateString(),
        '{{TIME}}': now.toLocaleTimeString(),
        '{{USER}}': 'User'
    };

    let result = content;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }
    return result;
}

export function extractTagsFromText(text) {
    const standardTags = [
        // Core Function Category
        'writing', 'article', 'creation', 'story', 'plan',
        'data', 'analysis', 'report', 'chart', 'statistics',
        'summary', 'extract', 'organize', 'key info', 'abstract',
        'dialogue', 'chat', 'customer service', 'consult', 'qa',
        'plan', 'project', 'management', 'process', 'task',
        'reasoning', 'logic', 'decision', 'problem solving', 'analysis',

        // Application Domain Category
        'business', 'office', 'email', 'meeting', 'commercial',
        'education', 'learning', 'training', 'teaching', 'exam',
        'tech', 'development', 'code', 'programming', 'software',
        'creative', 'design', 'art', 'planning', 'visual',
        'marketing', 'promotion', 'copywriting', 'brand', 'ad',
        'professional', 'legal', 'medical', 'consulting', 'service',

        // Tool Category
        'convert', 'format', 'process', 'tool', 'assist',
        'template', 'generate', 'standardize', 'norm'
    ];

    const foundTags = [];
    const lowerText = text.toLowerCase();

    for (const tag of standardTags) {
        if (lowerText.includes(tag.toLowerCase()) || lowerText.includes(tag)) {
            foundTags.push(tag);
            if (foundTags.length >= 3) break;
        }
    }

    return foundTags;
}

export function mapTagsToCategory(tags) {
    if (!tags || tags.length === 0) return 'productivity';

    const allTags = tags.join(' ').toLowerCase();

    // Core Function Category Mapping
    if (allTags.includes('writing') || allTags.includes('article') || allTags.includes('creation') ||
        allTags.includes('story') || allTags.includes('plan')) {
        return 'writing';
    }

    if (allTags.includes('data') || allTags.includes('analysis') || allTags.includes('report') ||
        allTags.includes('chart') || allTags.includes('statistics')) {
        return 'data';
    }

    if (allTags.includes('summary') || allTags.includes('extract') || allTags.includes('organize') ||
        allTags.includes('key info') || allTags.includes('abstract')) {
        return 'productivity';
    }

    if (allTags.includes('dialogue') || allTags.includes('chat') || allTags.includes('customer service') ||
        allTags.includes('consult') || allTags.includes('qa')) {
        return 'roleplay';
    }

    if (allTags.includes('plan') || allTags.includes('project') || allTags.includes('management') ||
        allTags.includes('process') || allTags.includes('task')) {
        return 'productivity';
    }

    if (allTags.includes('reasoning') || allTags.includes('logic') || allTags.includes('decision') ||
        allTags.includes('problem solving')) {
        return 'learning';
    }

    // Application Domain Category Mapping
    if (allTags.includes('business') || allTags.includes('office') || allTags.includes('email') ||
        allTags.includes('meeting') || allTags.includes('commercial')) {
        return 'productivity';
    }

    if (allTags.includes('education') || allTags.includes('learning') || allTags.includes('training') ||
        allTags.includes('teaching') || allTags.includes('exam')) {
        return 'learning';
    }

    if (allTags.includes('tech') || allTags.includes('development') || allTags.includes('code') ||
        allTags.includes('programming') || allTags.includes('software')) {
        return 'coding';
    }

    if (allTags.includes('creative') || allTags.includes('design') || allTags.includes('art') ||
        allTags.includes('planning') || allTags.includes('visual')) {
        return 'lifestyle';
    }

    if (allTags.includes('marketing') || allTags.includes('promotion') || allTags.includes('copywriting') ||
        allTags.includes('brand') || allTags.includes('ad')) {
        return 'writing';
    }

    if (allTags.includes('professional') || allTags.includes('legal') || allTags.includes('medical') ||
        allTags.includes('consulting') || allTags.includes('service')) {
        return 'productivity';
    }

    // Tool Category Mapping
    if (allTags.includes('convert') || allTags.includes('format') || allTags.includes('process')) {
        return 'productivity';
    }

    if (allTags.includes('template') || allTags.includes('generate') || allTags.includes('standardize') ||
        allTags.includes('norm')) {
        return 'productivity';
    }

    // Default return productivity
    return 'productivity';
}

export function showNotification(message, bgColor = '#48bb78') {
    let type = 'success';
    // Check for error colors (red shades)
    if (bgColor === '#f56565' || bgColor === '#EF4444' || bgColor === 'red' || bgColor.includes('f56565')) {
        type = 'error';
    }

    // Dispatch custom event to be handled by PanelManager/DomUtils
    // This ensures consistent styling across the application
    const event = new CustomEvent('pes:show-toast', {
        detail: { message, type }
    });
    window.dispatchEvent(event);
}
