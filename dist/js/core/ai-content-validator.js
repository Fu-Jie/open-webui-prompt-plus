// AI Generated Content Validator
export class AIContentValidator {
    constructor() {
        this.validVariableTypes = [
            'text', 'textarea', 'select', 'number', 'checkbox',
            'date', 'datetime-local', 'color', 'email', 'month',
            'range', 'tel', 'time', 'url', 'map'
        ];

        this.systemVariables = [
            'CLIPBOARD'
        ];
        // Note: Time-related variables and user info are injected via environment variables, only keeping clipboard variable

        this.validCategories = [
            'writing', 'productivity', 'learning',
            'coding', 'data', 'lifestyle', 'roleplay'
        ];
    }

    // Complete Validation Process
    validateGeneratedContent(content) {
        const results = {
            isValid: false,
            score: 0,
            errors: [],
            warnings: [],
            suggestions: []
        };

        try {
            // Level 1: Basic Structure Validation
            const structureValidation = this.validateStructure(content);
            results.errors.push(...structureValidation.errors);
            results.warnings.push(...structureValidation.warnings);

            // Level 2: Syntax Validation
            const syntaxValidation = this.validateSyntax(content);
            results.errors.push(...syntaxValidation.errors);
            results.warnings.push(...syntaxValidation.warnings);

            // Level 3: Content Quality Validation
            const qualityValidation = this.validateQuality(content);
            results.warnings.push(...qualityValidation.warnings);
            results.suggestions.push(...qualityValidation.suggestions);

            // Calculate Overall Score
            results.score = this.calculateOverallScore(structureValidation, syntaxValidation, qualityValidation);
            results.isValid = results.errors.length === 0 && results.score >= 0.7;

            return results;
        } catch (error) {
            results.errors.push(`Validation process error: ${error.message}`);
            return results;
        }
    }

    // Validate Basic Structure
    validateStructure(content) {
        const errors = [];
        const warnings = [];

        // Check Required Fields
        if (!content.title || typeof content.title !== 'string') {
            errors.push('Missing or invalid title field');
        } else if (content.title.trim().length === 0) {
            errors.push('Title cannot be empty');
        } else if (content.title.length > 100) {
            warnings.push('Title too long, recommended under 100 characters');
        }

        if (!content.content || typeof content.content !== 'string') {
            errors.push('Missing or invalid content field');
        } else if (content.content.trim().length < 10) {
            errors.push('Content too short, at least 10 characters required');
        }

        // Check Category
        if (content.category && !this.validCategories.includes(content.category)) {
            warnings.push(`Unknown category: ${content.category}, using default category`);
        }

        // Check Tags
        if (content.tags && !Array.isArray(content.tags)) {
            warnings.push('Tags should be in array format');
        }

        // Check Command Name - Strict Naming Convention Validation
        if (content.command) {
            const commandValidation = this.validateCommandName(content.command);
            if (!commandValidation.isValid) {
                errors.push(`Command name validation failed: ${commandValidation.error}`);
            }
        }

        return { errors, warnings, score: errors.length === 0 ? 1 : 0 };
    }

    // Validate Variable Syntax
    validateSyntax(content) {
        const errors = [];
        const warnings = [];

        if (!content.content) {
            return { errors, warnings, score: 0 };
        }

        // Extract All Variables
        const variablePattern = /\{\{([^}]+)\}\}/g;
        const variables = [];
        let match;

        while ((match = variablePattern.exec(content.content)) !== null) {
            variables.push(match[1]);
        }

        // Validate Each Variable
        variables.forEach(variable => {
            const validation = this.validateVariable(variable);
            if (!validation.isValid) {
                errors.push(`Variable syntax error: {{${variable}}} - ${validation.error}`);
            }
        });

        // Check Duplicate Variables
        const uniqueVariables = [...new Set(variables.map(v => v.split('|')[0].trim()))];
        if (uniqueVariables.length !== variables.length) {
            warnings.push('Duplicate variable names detected, please check');
        }

        const score = errors.length === 0 ? 1 : Math.max(0, 1 - errors.length * 0.2);
        return { errors, warnings, score };
    }

    // Validate Single Variable
    validateVariable(variableString) {
        // Parse variable: name | type:property="value"
        const parts = variableString.split('|');
        const name = parts[0].trim();

        // Validate variable name (supports English and Chinese)
        if (!/^[a-zA-Z\u4e00-\u9fa5_][a-zA-Z0-9\u4e00-\u9fa5_]*$/.test(name)) {
            return {
                isValid: false,
                error: 'Variable name must start with a letter, Chinese character or underscore'
            };
        }

        // If system variable, pass directly
        if (this.systemVariables.includes(name)) {
            return { isValid: true };
        }

        // Check Variable Type and Properties
        if (parts.length > 1) {
            const typeAndProps = parts[1].trim();
            const typeMatch = typeAndProps.match(/^([a-zA-Z]+)/);

            if (typeMatch) {
                const type = typeMatch[1];
                if (!this.validVariableTypes.includes(type)) {
                    return {
                        isValid: false,
                        error: `Unsupported variable type: ${type}`
                    };
                }

                // Validate Property Format
                const propsMatch = typeAndProps.match(/:(.+)$/);
                if (propsMatch) {
                    const propsString = propsMatch[1];
                    if (!this.validateVariableProperties(propsString)) {
                        return {
                            isValid: false,
                            error: 'Variable property format error'
                        };
                    }
                }
            }
        }

        return { isValid: true };
    }

    // Validate Variable Property Format
    validateVariableProperties(propsString) {
        // Supported property formats:
        // key="value" - Quoted string
        // key=value - Unquoted number or simple string
        // key=["value1","value2"] - Array format
        // key=true/false - Boolean

        // Split properties, support colon separation
        const props = propsString.split(':');

        for (const prop of props) {
            const cleanProp = prop.trim();
            if (!cleanProp) continue;

            // Validate property format: key=value
            const propMatch = cleanProp.match(/^(\w+)=(.+)$/);
            if (!propMatch) {
                return false;
            }

            const [, key, value] = propMatch;

            // Validate Property Name
            if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
                return false;
            }

            // Validate Property Value Format
            const trimmedValue = value.trim();

            // Supported value formats:
            // "string" or 'string' - Quoted string
            // [array] - Array
            // Number
            // true/false - Boolean
            // Simple string (no special characters)
            if (
                /^["'][^"']*["']$/.test(trimmedValue) ||           // Quoted string
                /^\[[^\]]*\]$/.test(trimmedValue) ||               // Array
                /^\d+(\.\d+)?$/.test(trimmedValue) ||              // Number
                /^(true|false)$/.test(trimmedValue) ||             // Boolean
                /^[a-zA-Z0-9_-]+$/.test(trimmedValue)              // Simple string
            ) {
                continue;
            } else {
                return false;
            }
        }

        return true;
    }

    // Validate Command Name - Strict Naming Convention
    validateCommandName(commandName) {
        if (!commandName || typeof commandName !== 'string') {
            return {
                isValid: false,
                error: 'Command name cannot be empty'
            };
        }

        const trimmedCommand = commandName.trim();

        // Check Length
        if (trimmedCommand.length < 2) {
            return {
                isValid: false,
                error: 'Command name requires at least 2 characters'
            };
        }

        if (trimmedCommand.length > 30) {
            return {
                isValid: false,
                error: 'Command name cannot exceed 30 characters'
            };
        }

        // Strict validation: Only English letters, numbers, hyphens and underscores allowed
        if (!/^[a-zA-Z0-9_-]+$/.test(trimmedCommand)) {
            const invalidChars = trimmedCommand.match(/[^a-zA-Z0-9_-]/g);
            const uniqueInvalidChars = [...new Set(invalidChars)];
            return {
                isValid: false,
                error: `Command name contains illegal characters: "${uniqueInvalidChars.join('", "')}". Only English letters, numbers, hyphens(-) and underscores(_) allowed`
            };
        }

        // Check if starts or ends with hyphen or underscore
        if (trimmedCommand.startsWith('-') || trimmedCommand.endsWith('-') || trimmedCommand.startsWith('_') || trimmedCommand.endsWith('_')) {
            return {
                isValid: false,
                error: 'Command name cannot start or end with hyphen or underscore'
            };
        }

        // Check consecutive hyphens or underscores
        if (trimmedCommand.includes('--') || trimmedCommand.includes('__')) {
            return {
                isValid: false,
                error: 'Command name cannot contain consecutive hyphens or underscores'
            };
        }

        // Recommend using lowercase
        if (!/^[a-z0-9_-]+$/.test(trimmedCommand)) {
            return {
                isValid: false,
                error: 'Recommend using lowercase letters for command name'
            };
        }

        // Validation Passed
        return {
            isValid: true
        };
    }

    // Validate Content Quality
    validateQuality(content) {
        const warnings = [];
        const suggestions = [];

        if (!content.content) {
            return { warnings, suggestions, score: 0 };
        }

        const text = content.content;

        // Check for meaningful instructions
        const hasInstructions = /please|help|generate|create|analyze|summarize|process|make|write|explain/i.test(text) ||
            /请|帮助|生成|创建|分析|总结|处理|制作/.test(text);
        if (!hasInstructions) {
            warnings.push('Content seems to lack clear instruction words');
        }

        // Check variable usage reasonableness
        const variableCount = (text.match(/\{\{[^}]+\}\}/g) || []).length;
        if (variableCount === 0) {
            suggestions.push('Consider adding some input variables to improve prompt interactivity');
        } else if (variableCount > 10) {
            warnings.push('Too many variables may affect user experience');
        }

        // Check Content Length
        if (text.length < 50) {
            warnings.push('Content is short, consider providing more detailed guidance');
        } else if (text.length > 2000) {
            warnings.push('Content is too long, consider simplifying');
        }

        // Check for examples
        const hasExample = /example|e\.g\.|such as|instance/i.test(text) ||
            /例如|示例|比如|如：/.test(text);
        if (!hasExample && variableCount > 3) {
            suggestions.push('Consider adding some usage examples to help users understand');
        }

        // Check Format Clarity
        const hasMarkdown = /#{1,6}\s|```|\*\*|\*|1\.|•/.test(text);
        if (!hasMarkdown) {
            suggestions.push('Using Markdown format makes content clearer and easier to read');
        }

        // Calculate Quality Score
        let score = 1.0;
        score -= warnings.length * 0.1;
        score -= suggestions.length * 0.05;
        score = Math.max(0.3, score);

        return { warnings, suggestions, score };
    }

    // Calculate Overall Score
    calculateOverallScore(structure, syntax, quality) {
        const weights = {
            structure: 0.4,
            syntax: 0.4,
            quality: 0.2
        };

        return (
            structure.score * weights.structure +
            syntax.score * weights.syntax +
            quality.score * weights.quality
        );
    }

    // Generate Improvement Suggestions
    generateImprovementSuggestions(validationResult) {
        const suggestions = [];

        if (validationResult.errors.length > 0) {
            suggestions.push({
                type: 'error',
                priority: 'high',
                message: 'Please fix the following errors before regenerating',
                details: validationResult.errors
            });
        }

        if (validationResult.warnings.length > 0) {
            suggestions.push({
                type: 'warning',
                priority: 'medium',
                message: 'Suggested optimizations',
                details: validationResult.warnings
            });
        }

        if (validationResult.suggestions.length > 0) {
            suggestions.push({
                type: 'suggestion',
                priority: 'low',
                message: 'Consider the following improvements',
                details: validationResult.suggestions
            });
        }

        // Add overall suggestions based on score
        if (validationResult.score < 0.5) {
            suggestions.unshift({
                type: 'error',
                priority: 'high',
                message: 'Generation quality is low, recommend regenerating',
                details: ['Current Score: ' + Math.round(validationResult.score * 100) + '%']
            });
        } else if (validationResult.score < 0.8) {
            suggestions.push({
                type: 'warning',
                priority: 'medium',
                message: 'Generation quality is medium, recommend optimizing',
                details: ['Current Score: ' + Math.round(validationResult.score * 100) + '%']
            });
        }

        return suggestions;
    }

    // Quick Validate (Check critical errors only)
    quickValidate(content) {
        const errors = [];

        if (!content || typeof content !== 'object') {
            errors.push('Content format error');
            return { isValid: false, errors };
        }

        if (!content.title || !content.content) {
            errors.push('Missing required title or content fields');
        }

        // Check severe syntax errors
        if (content.content) {
            const unclosedBraces = (content.content.match(/\{\{/g) || []).length -
                (content.content.match(/\}\}/g) || []).length;
            if (unclosedBraces !== 0) {
                errors.push('Variable syntax error: Mismatched braces');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
