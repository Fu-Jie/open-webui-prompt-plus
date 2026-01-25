import { AIContentValidator } from './ai-content-validator.js';
import { i18n } from './i18n.js';
import { logger } from './logger.js';

// AI Retry Manager
export class AIRetryManager {
    constructor(api) {
        this.api = api;
        this.validator = new AIContentValidator();
        this.maxRetries = 3; // Total 3 attempts
        this.retryStrategies = [
            'addMoreContext',      // Add more context
            'enforceNamingRules',  // Enforce naming rules
        ];

        // Retry history
        this.retryHistory = [];
    }

    // Intelligent generation with validation
    async generateWithRetry(userInput, onProgress = null) {
        logger.debug('[AIRetryManager] Starting generateWithRetry with input:', userInput);
        let attempt = 0;
        const startTime = Date.now();

        while (attempt < this.maxRetries) {
            try {
                attempt++;
                logger.debug(`[AIRetryManager] Attempt ${attempt}/${this.maxRetries}`);

                // Report progress
                if (onProgress) {
                    onProgress({
                        stage: 'generating',
                        attempt,
                        maxAttempts: this.maxRetries,
                        message: i18n.t('generating_attempt', { attempt })
                    });
                }

                // Generate content
                logger.debug('[AIRetryManager] Calling api.generatePromptContent with:', userInput);
                const result = await this.api.generatePromptContent(userInput);
                logger.debug('[AIRetryManager] Received raw result from API:', result);

                // Report progress
                if (onProgress) {
                    onProgress({
                        stage: 'validating',
                        attempt,
                        message: i18n.t('validating_content')
                    });
                }

                // Validate content
                logger.debug('[AIRetryManager] Validating generated content...');
                const validation = this.validator.validateGeneratedContent(result);
                logger.debug('[AIRetryManager] Validation result:', validation);

                // Record retry history
                this.retryHistory.push({
                    attempt,
                    input: userInput,
                    result,
                    validation,
                    timestamp: new Date().toISOString()
                });

                // If validation passes, return result
                if (validation.isValid) {
                    logger.debug('[AIRetryManager] Validation passed, returning success result');
                    if (onProgress) {
                        onProgress({
                            stage: 'completed',
                            attempt,
                            message: i18n.t('generation_success'),
                            score: validation.score
                        });
                    }

                    return {
                        success: true,
                        content: result,
                        validation,
                        attempts: attempt,
                        duration: Date.now() - startTime
                    };
                }

                // Validation failed, preparing retry
                if (attempt < this.maxRetries) {
                    logger.debug(`[AIRetryManager] Validation failed (score: ${validation.score}), preparing retry...`);
                    if (onProgress) {
                        onProgress({
                            stage: 'retrying',
                            attempt,
                            message: i18n.t('validation_failed_retry', { score: Math.round(validation.score * 100) }),
                            errors: validation.errors,
                            warnings: validation.warnings
                        });
                    }

                    // Improve input and retry
                    const originalInput = { ...userInput };
                    userInput = this.improveBadGeneration(userInput, validation, attempt - 1);
                    logger.debug('[AIRetryManager] Improved userInput for next retry:', userInput);
                    logger.debug('[AIRetryManager] Original input was:', originalInput);

                    // Wait a bit before retry
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                } else {
                    // Last attempt also failed
                    if (onProgress) {
                        onProgress({
                            stage: 'failed',
                            attempt,
                            message: i18n.t('all_retries_failed'),
                            finalScore: validation.score
                        });
                    }

                    return {
                        success: false,
                        content: result, // Still return the last result, let user decide
                        validation,
                        attempts: attempt,
                        duration: Date.now() - startTime,
                        canManualEdit: true
                    };
                }

            } catch (error) {
                logger.error(`Generation failed (Attempt ${attempt}):`, error);

                if (attempt >= this.maxRetries) {
                    if (onProgress) {
                        onProgress({
                            stage: 'error',
                            attempt,
                            message: i18n.t('generation_error_msg', { message: error.message })
                        });
                    }

                    return {
                        success: false,
                        error: error.message,
                        attempts: attempt,
                        duration: Date.now() - startTime
                    };
                }

                // Wait and retry even for API errors
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
        }
    }

    // Improve failed generation
    improveBadGeneration(originalInput, validation, attemptIndex) {
        const strategy = this.retryStrategies[attemptIndex] || 'addMoreContext';
        const errors = validation.errors || [];
        const warnings = validation.warnings || [];

        logger.debug(`Improving generation using strategy "${strategy}" (Attempt ${attemptIndex + 1})`);

        switch (strategy) {
            case 'addMoreContext':
                return this.addMoreContext(originalInput, errors, warnings);

            case 'simplifyRequirements':
                return this.simplifyRequirements(originalInput, errors, warnings);

            case 'changePromptStyle':
                return this.changePromptStyle(originalInput, errors, warnings);

            case 'enforceNamingRules':
                return this.enforceNamingRules(originalInput, errors, warnings);

            case 'finalAttempt':
                return this.finalAttempt(originalInput, errors, warnings);

            default:
                return this.addMoreContext(originalInput, errors, warnings);
        }
    }

    // Strategy 1: Add more context
    addMoreContext(originalInput, errors, warnings) {
        const issueContext = this.buildIssueContext(errors, warnings);
        return {
            ...originalInput,
            additionalInstructions: `${originalInput.additionalInstructions || ''}\n\n${issueContext}`
        };
    }

    // Strategy 2: Simplify requirements
    simplifyRequirements(originalInput, errors, warnings) {
        return {
            ...originalInput,
            additionalInstructions: `${originalInput.additionalInstructions || ''}\n\n[Retry Instruction] Please generate a simpler, more generic version with fewer variables. Previous issues: ${errors.join('; ')}`
        };
    }

    // Strategy 3: Change prompt style
    changePromptStyle(originalInput, errors, warnings) {
        return {
            ...originalInput,
            additionalInstructions: `${originalInput.additionalInstructions || ''}\n\n[Retry Instruction] Please try using a different style or structure to generate the prompt, such as using step-by-step instructions. Previous issues: ${errors.join('; ')}`
        };
    }

    // Strategy 4: Enforce naming rules
    enforceNamingRules(originalInput, errors, warnings) {
        return {
            ...originalInput,
            additionalInstructions: `${originalInput.additionalInstructions || ''}\n\n[Retry Instruction] Please strictly adhere to naming conventions. Command names must only use lowercase English letters and hyphens/underscores. Variable names should be concise and accurately describe their purpose. Previous issues: ${errors.join('; ')}`
        };
    }

    // Strategy 5: Final attempt
    finalAttempt(originalInput, errors, warnings) {
        return {
            ...originalInput,
            additionalInstructions: `${originalInput.additionalInstructions || ''}\n\n[Final Attempt Instruction] This is the last chance. Please ensure to generate a JSON object that is structurally complete, syntactically correct, and compliant with all specifications. Carefully check all fields, especially \`category\` and \`command\`. Previous issues: ${errors.join('; ')}`
        };
    }

    // Build issue context
    buildIssueContext(errors, warnings) {
        const issues = [];

        if (errors.length > 0) {
            issues.push('Critical Errors: ' + errors.join('; '));
        }

        if (warnings.length > 0) {
            issues.push('Warnings: ' + warnings.join('; '));
        }

        return `
[Analysis of Previous Generation Issues]
${issues.join('\n')}

[Improvement Suggestions]
- Carefully check variable syntax format
- Ensure all fields are correctly filled
- Use standard OpenWebUI variable types
- Provide meaningful instruction content
- Strictly adhere to naming conventions (Command names must only use English letters, numbers, hyphens, and underscores)
        `.trim();
    }

    // Intelligent analysis of failure reason
    analyzeFailureReason(validation) {
        const { errors, warnings, score } = validation;

        if (errors.some(e => e.includes('Variable syntax'))) {
            return {
                category: 'syntax',
                reason: 'Variable syntax error',
                suggestion: 'Focus on correctness of variable format'
            };
        }

        if (errors.some(e => e.includes('Missing') || e.includes('Invalid'))) {
            return {
                category: 'structure',
                reason: 'Data structure issue',
                suggestion: 'Ensure all required fields are included'
            };
        }

        if (score < 0.5) {
            return {
                category: 'quality',
                reason: 'Content quality too low',
                suggestion: 'Provide more detailed and useful guidance'
            };
        }

        return {
            category: 'general',
            reason: 'General quality issue',
            suggestion: 'Optimize overall content structure and expression'
        };
    }

    // Get retry history
    getRetryHistory() {
        return this.retryHistory;
    }

    // Clear history
    clearHistory() {
        this.retryHistory = [];
    }

    // Get retry statistics
    getRetryStats() {
        if (this.retryHistory.length === 0) {
            return null;
        }

        const successfulAttempts = this.retryHistory.filter(h => h.validation.isValid);
        const averageScore = this.retryHistory.reduce((sum, h) => sum + h.validation.score, 0) / this.retryHistory.length;

        return {
            totalAttempts: this.retryHistory.length,
            successfulAttempts: successfulAttempts.length,
            successRate: successfulAttempts.length / this.retryHistory.length,
            averageScore: Math.round(averageScore * 100),
            commonErrors: this.getCommonErrors()
        };
    }

    // Get common errors
    getCommonErrors() {
        const errorCounts = {};

        this.retryHistory.forEach(h => {
            h.validation.errors.forEach(error => {
                const key = error.split(':')[0]; // Get error type part
                errorCounts[key] = (errorCounts[key] || 0) + 1;
            });
        });

        return Object.entries(errorCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([error, count]) => ({ error, count }));
    }

    // Manual fix suggestions
    suggestManualFixes(validation) {
        const suggestions = [];
        const { errors, warnings } = validation;

        // Provide fix suggestions for specific error types
        errors.forEach(error => {
            if (error.includes('Variable syntax')) {
                suggestions.push({
                    type: 'fix',
                    message: i18n.t('fix_variable_syntax'),
                    action: 'check_variable_syntax',
                    description: i18n.t('check_variable_syntax')
                });
            }

            if (error.includes('Title')) {
                suggestions.push({
                    type: 'fix',
                    message: i18n.t('improve_title'),
                    action: 'add_title',
                    description: i18n.t('add_title')
                });
            }

            if (error.includes('Content')) {
                suggestions.push({
                    type: 'fix',
                    message: i18n.t('supplement_content'),
                    action: 'add_content',
                    description: i18n.t('add_content')
                });
            }
        });

        // Provide optimization suggestions for warnings
        warnings.forEach(warning => {
            if (warning.includes('too long')) {
                suggestions.push({
                    type: 'optimize',
                    message: i18n.t('simplify_content'),
                    action: 'shorten_content',
                    description: i18n.t('shorten_content')
                });
            }
        });

        return suggestions;
    }
}
