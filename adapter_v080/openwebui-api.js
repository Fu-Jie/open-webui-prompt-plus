import { generateUUID, sanitizeCommand } from '../utils/helpers.js';
import { CONFIG, AI_ASSISTANT_PROMPT } from '../core/constants.js';
import { logger } from '../core/logger.js';
import { i18n } from '../core/i18n.js';

// OpenWebUI API Service Class - Focuses on Central Prompt Storage
export class OpenWebUIAPI {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = `${this.baseURL}/api/v1/prompts/`;
        this.chatURL = `${this.baseURL}/api/v1/chat/completions`;
        this.modelsURL = `${this.baseURL}/api/models/base`;

        // Capabilities and context for 0.8.0+ support
        this.serverCapability = {
            isV080OrNewer: false,
            supportsIdApi: false
        };
        this.metadataPromptId = null; // Store UUID for system metadata prompt
    }

    async getAuthToken() {
        const token = localStorage.getItem('token');
        logger.debug('[Auth] Token exists:', !!token, 'Length:', token?.length || 0);
        return token;
    }

    // Get the currently selected model by the user (avoid calling getAvailableModels to prevent loops)
    async getCurrentModel() {
        try {
            // Get selected model from localStorage
            const selectedModel = localStorage.getItem('selectedModel');
            if (selectedModel) {
                return selectedModel;
            }
            // Return default model when no selection
            return 'gpt-4.1';
        } catch (error) {
            logger.warn('Failed to get current model:', error);
            return 'gpt-4.1';
        }
    }

    // Get available model list (fetch dynamically from API)
    async getAvailableModels() {
        logger.debug('🔥🔥🔥 [ModelAPI] getAvailableModels called!');
        try {
            const token = await this.getAuthToken();
            const apiUrl = `${this.baseURL}/api/models`;
            logger.debug('[ModelAPI] 🌐 Requesting model list:', apiUrl, 'Token:', token ? 'Yes' : 'No');

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            logger.debug('[ModelAPI] Response status:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            logger.debug('[ModelAPI] Response data:', result);

            // API returns { data: [...] } format
            if (result.data && Array.isArray(result.data)) {
                const models = result.data.map(model => ({
                    id: model.id,
                    name: model.name || model.id,
                    owned_by: model.owned_by,
                    is_active: true
                }));
                logger.debug('[ModelAPI] Parsed', models.length, 'models');
                if (models.length === 0) {
                    logger.warn('[ModelAPI] ⚠️ Received empty model list from backend:', result);
                }
                return models;
            }

            // If response is direct array format
            if (Array.isArray(result)) {
                const models = result.map(model => ({
                    id: model.id,
                    name: model.name || model.id,
                    owned_by: model.owned_by,
                    is_active: true
                }));
                logger.debug('[ModelAPI] Parsed', models.length, 'models (array format)');
                return models;
            }

            // Return empty array to indicate failure
            logger.warn('[ModelAPI] Abnormal return format');
            return [];
        } catch (error) {
            logger.error('[ModelAPI] Failed to get model list:', error);
            throw error;
        }
    }

    // Get official server version
    async getServerVersion() {
        try {
            const response = await fetch(`${this.baseURL}/api/version`);
            if (response.ok) {
                const data = await response.json();
                return data.version;
            }
        } catch (error) {
            logger.warn('Failed to fetch server version:', error);
        }
        return null;
    }

    // Prompt related API
    async getAllPrompts() {
        const token = await this.getAuthToken();
        if (!token) {
            throw new Error('Auth token not found, please login');
        }

        const response = await fetch(this.apiURL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Fetch failed HTTP ${response.status}: ${response.statusText}`);
        }

        const prompts = await response.json();

        // 1. Precise Detection: Check official version via endpoint
        if (!this.serverCapability.isV080OrNewer) {
            const version = await this.getServerVersion();
            if (version) {
                const [major, minor, patch] = version.split('.').map(Number);
                if (major > 0 || minor >= 8) {
                    this.serverCapability.isV080OrNewer = true;
                    this.serverCapability.supportsIdApi = true;
                    logger.debug(`[API] Detected Open WebUI v${version} via API`);
                }
            }
        }

        // 2. Fallback Detection: Inspect data structure (if version API fails or logic unsure)
        if (!this.serverCapability.isV080OrNewer && prompts.length > 0) {
            const firstPrompt = prompts[0];
            if (firstPrompt.id && firstPrompt.name !== undefined) {
                this.serverCapability.isV080OrNewer = true;
                this.serverCapability.supportsIdApi = true;
                logger.debug('[API] Detected Open WebUI 0.8.0+ capabilities via structure inspection');
            }
        }

        // Filter out metadata storage prompts to keep UI clean
        // 0.8.0+ might store command as '_' (no slash)
        return prompts.filter(prompt => prompt.command !== '/_' && prompt.command !== '_');
    }

    // Get central metadata store
    async getMetadataStore() {
        const token = await this.getAuthToken();
        if (!token) {
            logger.warn('Auth token not found, returning null to trigger init');
            return null;
        }

        try {
            logger.debug('🔍 Checking if _ command exists...');
            const response = await fetch(`${this.apiURL}command/_`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // 401 error actually indicates resource does not exist (according to API docs)
            if (response.status === 401 || response.status === 404) {
                logger.debug('📦 _ command does not exist, need to create metadata store');
                return null;
            }

            if (!response.ok) {
                logger.warn(`Failed to get metadata store HTTP ${response.status}: ${response.statusText}`);
                return null;
            }

            const metadataPrompt = await response.json();
            logger.debug('✅ Found existing _ command, parsing metadata...');

            // Extract and store ID for 0.8.0+ compatibility
            if (metadataPrompt.id) {
                this.metadataPromptId = metadataPrompt.id;
                this.serverCapability.supportsIdApi = true;
                logger.debug('[API] Metadata Store ID captured:', this.metadataPromptId);
            }

            // Parse JSON data in content
            try {
                const metadata = JSON.parse(metadataPrompt.content);
                logger.debug('📊 Metadata parsed successfully, version:', metadata.version);
                return metadata;
            } catch (parseError) {
                logger.warn('Metadata parsing failed, returning default structure:', parseError);
                return this.getDefaultMetadataStructure();
            }
        } catch (error) {
            logger.warn('Error fetching metadata store:', error.message);
            return null;
        }
    }

    // Update central metadata store
    async updateMetadataStore(metadataData) {
        const token = await this.getAuthToken();
        if (!token) {
            throw new Error('Authentication token not found, please ensure you are logged in');
        }

        const promptData = {
            command: this.serverCapability.isV080OrNewer ? '_' : '/_',
            title: 'System Metadata Store',
            name: 'System Metadata Store', // 0.8.0+ field
            content: JSON.stringify(metadataData, null, 2),
            access_control: null
        };

        // Use ID-based API if available (fixes 405 error in 0.8.0)
        let endpoint = `${this.apiURL}command/_/update`;
        if (this.metadataPromptId && this.serverCapability.supportsIdApi) {
            endpoint = `${this.apiURL}id/${this.metadataPromptId}/update`;
            logger.debug('[API] Using ID-based update for metadata store');
        } else {
            logger.debug('[API] Falling back to command-based update for metadata store');
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(promptData)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to update metadata store HTTP ${response.status}: ${error}`);
        }

        return await response.json();
    }

    // Create central metadata store
    async createMetadataStore(metadataData) {
        const token = await this.getAuthToken();
        if (!token) {
            throw new Error('Authentication token not found, please ensure you are logged in');
        }

        logger.debug('📦 Creating central metadata store...');

        const promptData = {
            command: this.serverCapability.isV080OrNewer ? '_' : '/_',
            title: 'System Metadata Store',
            name: 'System Metadata Store', // 0.8.0+ field
            content: JSON.stringify(metadataData, null, 2),
            access_control: null
        };

        logger.debug('📤 Sending create request, data:', promptData);

        const response = await fetch(`${this.apiURL}create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(promptData)
        });

        if (!response.ok) {
            const error = await response.text();
            logger.error('❌ Failed to create metadata store:', error);
            throw new Error(`Failed to create metadata store HTTP ${response.status}: ${error}`);
        }

        const result = await response.json();
        logger.debug('✅ Metadata store created successfully:', result);

        // Store ID for subsequent updates
        if (result.id) {
            this.metadataPromptId = result.id;
            this.serverCapability.supportsIdApi = true;
        }

        return result;
    }

    // Get current user info
    async getCurrentUser() {
        const token = await this.getAuthToken();
        if (!token) {
            throw new Error('Authentication token not found, please ensure you are logged in');
        }

        try {
            const response = await fetch(`${this.baseURL}/api/v1/auths/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get user info HTTP ${response.status}: ${response.statusText}`);
            }

            const userData = await response.json();
            return {
                id: userData.id,
                name: userData.name || userData.email || 'Unknown User'
            };
        } catch (error) {
            logger.warn('Failed to get user info, using default:', error);
            return {
                id: 'unknown-user',
                name: 'Unknown User'
            };
        }
    }

    // Get default metadata structure
    getDefaultMetadataStructure() {
        return {
            version: '1.1',
            categories: [
                { id: 'writing', name: 'Writing', order: 1 },
                { id: 'productivity', name: 'Productivity', order: 2 },
                { id: 'learning', name: 'Learning', order: 3 },
                { id: 'coding', name: 'Coding', order: 4 },
                { id: 'data', name: 'Data', order: 5 },
                { id: 'lifestyle', name: 'Lifestyle', order: 6 },
                { id: 'roleplay', name: 'Roleplay', order: 7 }
            ],
            prompts: {}
        };
    }

    async createPrompt(promptData) {
        const token = await this.getAuthToken();
        if (!token) {
            throw new Error('Authentication token not found, please ensure you are logged in');
        }

        const finalCommand = promptData.command?.startsWith('/') ? promptData.command.slice(1) : promptData.command;
        const finalPromptData = {
            ...promptData,
            title: promptData.title || promptData.name,
            name: promptData.name || promptData.title,
            command: this.serverCapability.isV080OrNewer ? finalCommand : `/${finalCommand}`
        };

        const response = await fetch(`${this.apiURL}create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(finalPromptData)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Creation failed HTTP ${response.status}: ${error}`);
        }

        const result = await response.json();
        // If 0.8.0+, mark it
        if (result.id) {
            this.serverCapability.isV080OrNewer = true;
            this.serverCapability.supportsIdApi = true;
        }
        return result;
    }

    async updatePrompt(command, promptData) {
        const token = await this.getAuthToken();
        if (!token) {
            throw new Error('Authentication token not found, please ensure you are logged in');
        }

        // Ensure promptData contains correct command field
        const finalCommand = command.startsWith('/') ? command.slice(1) : command;
        const updateData = {
            ...promptData,
            title: promptData.title || promptData.name, // Ensure compatibility
            name: promptData.name || promptData.title,   // 0.8.0+ field
            command: this.serverCapability.isV080OrNewer
                ? finalCommand  // 0.8.0 usually stores without slash
                : `/${finalCommand}` // Older versions expect slash
        };

        // Decision logic for endpoint: ID-based (0.8.0) vs Command-based (Legacy)
        let endpoint = `${this.apiURL}command/${finalCommand}/update`;

        // If we have an ID in the promptData, use the ID-based API
        if (promptData.id && this.serverCapability.supportsIdApi) {
            endpoint = `${this.apiURL}id/${promptData.id}/update`;
            logger.debug(`[API] Using ID-based update for prompt: ${promptData.id}`);
        } else {
            logger.debug(`[API] Using command-based update for prompt: ${finalCommand}`);
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Update failed HTTP ${response.status}: ${error}`);
        }

        return await response.json();
    }

    async deletePrompt(command, id = null) {
        const token = await this.getAuthToken();
        if (!token) {
            throw new Error('Authentication token not found, please ensure you are logged in');
        }

        const finalCommand = command.startsWith('/') ? command.slice(1) : command;
        let endpoint = `${this.apiURL}command/${finalCommand}/delete`;

        // If we have an ID, use the ID-based API (fixes 0.8.0 compatibility)
        if (id && this.serverCapability.supportsIdApi) {
            endpoint = `${this.apiURL}id/${id}/delete`;
            logger.debug(`[API] Using ID-based deletion for prompt: ${id}`);
        } else {
            logger.debug(`[API] Using command-based deletion for prompt: ${finalCommand}`);
        }

        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Deletion failed HTTP ${response.status}: ${error}`);
        }

        return await response.json();
    }

    // AI Tag Generation
    async getAITags(content, title, retries = 3) {
        const token = await this.getAuthToken();
        if (!token) throw new Error('Authentication token not found');

        const currentModel = await this.getCurrentModel();

        const prompt = `You are a professional tag generator. Please generate 3-5 relevant tags based on the following content.

Title: ${title}
Content: ${content.substring(0, 200)}...

Requirements:
1. Tags must accurately reflect the content topic
2. Use the same language as the content
3. Each tag should be concise (max 4 words)
4. Sort by importance
5. Return only tags, separated by commas

Tags: `;

        const payload = {
            model: currentModel,
            messages: [{ role: "user", content: prompt }],
            stream: false,
            max_tokens: 100,
            temperature: 0.3
        };

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetch(this.chatURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const responseData = await response.json();
                if (responseData.choices && responseData.choices.length > 0) {
                    const content = responseData.choices[0].message.content;
                    return content.split(',').map(tag => tag.trim()).filter(Boolean);
                }

                throw new Error('Invalid response format');
            } catch (error) {
                logger.warn(`AI tag generation failed (Attempt ${attempt}/${retries}):`, error);
                if (attempt === retries) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    // Batch get categories
    async getAICategoryForBatch(prompts, retries = 3) {
        const token = await this.getAuthToken();
        if (!token) throw new Error('Authentication token not found');

        const categoryList = [
            '- writing',
            '- productivity',
            '- learning',
            '- coding',
            '- data',
            '- lifestyle',
            '- roleplay'
        ].join('\n');

        const systemPrompt = `You are a prompt classification expert. Please select the most appropriate category for each prompt based on the title and content below.

Available categories:
${categoryList}

Your task is to return only the most appropriate category ID for each provided prompt. Please strictly follow the format "ID: Category ID", with one prompt per line.

Example:
ID: 1, Category: content-creation
ID: 2, Category: code-development
ID: 3, Category: office-assistant`;

        const userContent = prompts.map((p, index) =>
            `ID: ${index + 1}\nTitle: ${p.title}\nContent: ${p.content.substring(0, 150)}...`
        ).join('\n\n');

        const currentModel = await this.getCurrentModel();

        const payload = {
            model: currentModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent }
            ],
            stream: false,
            max_tokens: prompts.length * 15,
            temperature: 0.1
        };

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetch(this.chatURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const responseData = await response.json();
                if (responseData.choices && responseData.choices.length > 0) {
                    const content = responseData.choices[0].message.content;
                    const lines = content.split('\n');
                    const categories = new Array(prompts.length).fill('productivity');
                    const categoryIds = [
                        'writing', 'productivity', 'learning',
                        'coding', 'data', 'lifestyle', 'roleplay'
                    ];

                    lines.forEach(line => {
                        // Support multiple formats: ID: 1, Category: tech OR ID: 1 Category: tech OR 1: tech
                        const match = line.match(/(?:ID:\s*)?(\d+)[,:]\s*(?:Category:\s*)?([a-z-]+)/i);
                        if (match) {
                            const index = parseInt(match[1], 10) - 1;
                            const category = match[2].trim();
                            if (index >= 0 && index < prompts.length && categoryIds.includes(category)) {
                                categories[index] = category;
                            } else if (index >= 0 && index < prompts.length) {
                                // If category is not in valid list, use default category
                                logger.warn(`Invalid batch category "${category}" for prompt ${index + 1}, using default`);
                                categories[index] = 'productivity';
                            }
                        }
                    });
                    return categories;
                }
                throw new Error('Invalid response format');
            } catch (error) {
                logger.warn(`Batch classification failed (Attempt ${attempt}/${retries}):`, error);
                if (attempt === retries) {
                    logger.warn('Batch classification failed, using keyword fallback');
                    // Use keyword fallback plan
                    return prompts.map(p => {
                        const text = (p.title + ' ' + p.content).toLowerCase();
                        if (text.includes('code') || text.includes('programming') || text.includes('dev')) {
                            return 'coding';
                        } else if (text.includes('data') || text.includes('analysis')) {
                            return 'data';
                        } else if (text.includes('write') || text.includes('article') || text.includes('creative')) {
                            return 'writing';
                        } else if (text.includes('business') || text.includes('office') || text.includes('email')) {
                            return 'productivity';
                        } else {
                            return 'productivity';
                        }
                    });
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    // Generate Smart Command
    async generateAICommand(title, content = '', retries = 3) {
        const token = await this.getAuthToken();
        if (!token) {
            throw new Error('Authentication token not found');
        }

        const prompt = `You are a professional command generator. Please generate a concise and clear English command name for the following prompt.

Requirements:
1. Use lowercase English letters
2. Use hyphens (-) to separate words
3. Length should be between 2-4 words
4. Reflect the core functionality of the prompt
5. Avoid using special characters
6. Ensure the command is concise and memorable

Prompt Title: ${title}
${content ? `Prompt Content: ${content.substring(0, 200)}...` : ''}

Please only return the command name, do not explain. For example: sql-optimizer, code-reviewer, data-analyst

Command Name: `;

        const currentModel = await this.getCurrentModel();

        const payload = {
            model: currentModel,
            messages: [{ role: "user", content: prompt }],
            stream: false,
            max_tokens: 50,
            temperature: 0.3
        };

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetch(this.chatURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const responseData = await response.json();

                if (responseData.choices && responseData.choices.length > 0) {
                    const content = responseData.choices[0].message.content.trim();

                    const commandMatch = content.match(/([a-z-]+)/);
                    if (commandMatch) {
                        return commandMatch[1];
                    }

                    return content.toLowerCase().replace(/[^a-z-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                }

                throw new Error('Invalid response format');
            } catch (error) {
                logger.warn(`AI command generation failed (Attempt ${attempt}/${retries}):`, error);

                if (attempt === retries) {
                    throw error;
                }

                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    // Format Conversion
    convertToOpenWebUIFormat(prompt) {
        const commandName = sanitizeCommand(prompt.command || prompt.title);
        return {
            command: `/${commandName}`,
            title: prompt.title,
            content: prompt.content,
            access_control: null // Ensure it is null
        };
    }

    convertFromOpenWebUIFormat(openWebUIPrompt) {
        const command = openWebUIPrompt.command?.replace('/', '') || '';
        const title = openWebUIPrompt.name || openWebUIPrompt.title || command || 'Untitled Prompt';
        const id = openWebUIPrompt.id || ('openwebui_' + (command || generateUUID()));

        return {
            id: id,
            title: title,
            content: openWebUIPrompt.content || '',
            category: 'productivity',
            tags: openWebUIPrompt.tags || ['OpenWebUI Import'],
            description: `Imported from OpenWebUI (${command})`,
            createdAt: openWebUIPrompt.timestamp ?
                new Date(openWebUIPrompt.timestamp * 1000).toISOString() :
                new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usageCount: 0,
            isFavorite: false,
            command: command,
            openwebuiData: openWebUIPrompt
        };
    }

    // AI Assisted Prompt Generation
    async generatePromptContent(userInput, model = null, retries = 3) {
        const token = await this.getAuthToken();
        if (!token) {
            throw new Error('Auth token not found');
        }

        const currentModel = model || await this.getCurrentModel();
        const prompt = this.buildPromptGenerationTemplate(userInput);

        const payload = {
            model: currentModel,
            messages: [{ role: "user", content: prompt }],
            stream: false,
            temperature: 0.7
        };

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await fetch(this.chatURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const responseData = await response.json();
                logger.debug("AI Raw Response Data:", responseData);

                if (!responseData) {
                    throw new Error('API returned empty/null response');
                }

                if (responseData.choices && responseData.choices.length > 0) {
                    const content = responseData.choices[0].message.content;
                    // Add debug log
                    logger.debug("AI Raw Response Content:", content);
                    return this.parseGeneratedContent(content);
                }

                logger.error('Invalid response structure:', responseData);
                throw new Error('Invalid response format: missing choices field');
            } catch (error) {
                logger.warn(`AI prompt generation failed (Attempt ${attempt}/${retries}):`, error);
                if (attempt === retries) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    // Build AI Prompt Generation Template
    buildPromptGenerationTemplate(userInput) {
        const {
            description,
            useClipboard,
            additionalInstructions,
            strictNamingRules,
            variableSyntaxRules,
            availableVariables,
            availableCategoriesList // Get dynamic category list
        } = userInput;

        // Build clipboard related instructions based on user selection
        const clipboardInstructions = useClipboard ?
            `- **Important**: The prompt content MUST include the \`{{CLIPBOARD}}\` variable to receive clipboard content.` :
            '';

        // Format category list
        let categoryListStr = '';
        if (availableCategoriesList && Array.isArray(availableCategoriesList) && availableCategoriesList.length > 0) {
            categoryListStr = '## Available Category List\n';
            categoryListStr += availableCategoriesList.map(cat => `- ${cat.id} (${cat.name})`).join('\n');
        }

        // Get current language name for injection
        // Get current language name for injection
        let currentLangName = 'English';
        switch (i18n.lang) {
            case 'zh-CN': currentLangName = 'Simplified Chinese'; break;
            case 'zh-TW': currentLangName = 'Traditional Chinese'; break;
            case 'ja-JP': currentLangName = 'Japanese'; break;
            case 'ko-KR': currentLangName = 'Korean'; break;
            case 'de-DE': currentLangName = 'German'; break;
            case 'fr-FR': currentLangName = 'French'; break;
            case 'es-ES': currentLangName = 'Spanish'; break;
            case 'el': currentLangName = 'Greek'; break;
            default: currentLangName = 'English'; break;
        }

        // Inject language into template
        let basePrompt = AI_ASSISTANT_PROMPT.replace(/{{INTERFACE_LANGUAGE}}/g, currentLangName);

        const finalPrompt = `
${basePrompt}

${strictNamingRules || ''}

${variableSyntaxRules || ''}

${availableVariables || ''}

${categoryListStr}

---

## User Core Request
${description}

## Additional Instructions
${clipboardInstructions}
${additionalInstructions || ''}
`;

        logger.debug("Final prompt sent to AI:", finalPrompt);
        return finalPrompt;
    }

    // Parse AI Generated Content
    parseGeneratedContent(content) {
        try {
            let jsonString = content;
            let parsed = null;

            // 1. Try to extract from Markdown code blocks first
            const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            if (codeBlockMatch) {
                try {
                    const extracted = codeBlockMatch[1].trim();
                    parsed = JSON.parse(extracted);
                    jsonString = extracted; // Success
                } catch (e) {
                    // Regex match failed to parse (likely due to nested backticks truncating the match)
                    // We ignore this failure and proceed to the fallback method
                    console.debug('Regex extraction matched but failed to parse, trying fallback:', e);
                }
            }

            // 2. If no code block or parsing failed, try to find the first '{' and last '}'
            if (!parsed) {
                const firstOpen = content.indexOf('{');
                const lastClose = content.lastIndexOf('}');
                if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
                    jsonString = content.substring(firstOpen, lastClose + 1);
                    try {
                        parsed = JSON.parse(jsonString);
                    } catch (e) {
                        // Parsing failed, will try fix logic below
                    }
                }
            }

            // 3. Clean up and try to parse/fix if still not parsed
            if (!parsed) {
                jsonString = jsonString.trim();
                try {
                    parsed = JSON.parse(jsonString);
                } catch (e) {
                    // Last resort: Try to fix common JSON errors (e.g. trailing commas)
                    try {
                        const fixedString = jsonString.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
                        parsed = JSON.parse(fixedString);
                    } catch (e2) {
                        throw e; // Throw original error if fix fails
                    }
                }
            }

            // Validate required fields
            if (!parsed.title || !parsed.content) {
                throw new Error('Missing required fields (title or content)');
            }

            // Validate if category is valid
            let category = parsed.category || null; // Default to null

            // Standardize data format
            return {
                title: parsed.title.trim(),
                content: parsed.content.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim(),
                variables: parsed.variables || [],
                category: category,
                tags: Array.isArray(parsed.tags) ? parsed.tags : [],
                command: parsed.command || this.sanitizeCommand(parsed.title),
                systemVariables: this.extractSystemVariables(parsed.content),
                customVariables: this.extractCustomVariables(parsed.content)
            };

        } catch (error) {
            console.warn('Failed to parse generated content:', error);
            console.debug('Raw content was:', content);
            throw new Error(`AI generated content format error: ${error.message}`);
        }
    }

    // Extract system variables
    extractSystemVariables(content) {
        const systemVariables = [
            'CLIPBOARD'
        ];

        const found = [];
        systemVariables.forEach(variable => {
            if (content.includes(`{{${variable}}}`)) {
                found.push(variable);
            }
        });

        return found;
    }

    // Extract custom variables
    extractCustomVariables(content) {
        const variablePattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\s*(\|\s*([a-zA-Z]+)(:([^}]+))?)?\}\}/g;
        const variables = [];
        const systemVars = [
            'CLIPBOARD'
        ];

        let match;
        while ((match = variablePattern.exec(content)) !== null) {
            const [fullMatch, name, , type, , properties] = match;

            // Skip system variables
            if (systemVars.includes(name)) {
                continue;
            }

            // Avoid duplicates
            if (variables.find(v => v.name === name)) {
                continue;
            }

            variables.push({
                name,
                type: type || 'text',
                properties: properties || '',
                fullSyntax: fullMatch
            });
        }

        return variables;
    }

    // Sanitize and validate command name
    sanitizeCommand(command) {
        return command
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 30) || 'prompt';
    }
}
