import { processVariables, showNotification, sanitizeCommand } from '../utils/helpers.js';
import { logger } from './logger.js';

// Multi-Strategy Text Inserter Class
export class MultiStrategyInserter {
    async insertText(element, text) {
        if (!element || !text) return false;

        element.focus();

        const strategies = [
            () => this.modernInsertStrategy(element, text),
            () => this.cursorPositionStrategy(element, text),
            () => this.selectionReplaceStrategy(element, text),
            () => this.directValueStrategy(element, text)
        ];

        for (let i = 0; i < strategies.length; i++) {
            try {
                if (await strategies[i]()) {
                    this.triggerInputEvents(element);
                    return this.verifyInsertion(element, text);
                }
            } catch (error) {
                console.warn(`Insertion strategy ${i + 1} failed:`, error);
            }
        }

        return false;
    }

    async modernInsertStrategy(element, text) {
        try {
            await new Promise(resolve => setTimeout(resolve, 50));

            // Special handling for TipTap/ProseMirror editor (chat-input)
            if (element.classList.contains('ProseMirror')) {
                element.focus();
                await new Promise(resolve => setTimeout(resolve, 100));

                try {
                    // Thoroughly clear all content in ProseMirror
                    element.innerHTML = '';

                    // Re-create a single empty paragraph to maintain editor structure
                    const pElement = document.createElement('p');
                    pElement.className = 'is-empty is-editor-empty';
                    element.appendChild(pElement);

                    const lines = text.split('\n');

                    if (lines.length === 1) {
                        const textNode = document.createTextNode(text);
                        pElement.appendChild(textNode);
                        pElement.className = ''; // Remove empty classes
                    } else {
                        pElement.className = ''; // Remove empty classes
                        lines.forEach((line, index) => {
                            if (index > 0) {
                                pElement.appendChild(document.createElement('br'));
                            }
                            if (line.trim()) {
                                const textNode = document.createTextNode(line);
                                pElement.appendChild(textNode);
                            } else if (index < lines.length - 1) {
                                pElement.appendChild(document.createElement('br'));
                            }
                        });
                    }

                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(pElement);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);

                    // Trigger input event to notify editor of changes
                    const inputEvent = new InputEvent('input', {
                        bubbles: true,
                        cancelable: true,
                        inputType: 'insertText',
                        data: text
                    });
                    element.dispatchEvent(inputEvent);

                    return true;
                } catch (proseMirrorError) {
                    console.warn('ProseMirror DOM strategy failed:', proseMirrorError);
                    // If DOM manipulation failed, we should NOT fall through to execCommand 
                    // immediately if we are unsure of the state. 
                    // However, for robustness, we can try execCommand ONLY if we are sure 
                    // the previous attempt didn't leave partial data.
                    // For now, let's try to clear and fallback.
                    element.innerHTML = '';
                }

                if (document.execCommand && document.execCommand('insertText', false, text)) {
                    return true;
                }

                element.innerHTML = `<p>${text.replace(/\n/g, '</p><p>')}</p>`;
                return true;
            }

            if (element.id === 'chat-input') {
                element.focus();
                await new Promise(resolve => setTimeout(resolve, 100));

                if (document.execCommand && document.execCommand('insertText', false, text)) {
                    return true;
                }

                if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
                    const start = element.selectionStart || 0;
                    const end = element.selectionEnd || 0;
                    const currentValue = element.value;
                    element.value = currentValue.substring(0, start) + text + currentValue.substring(end);
                    element.selectionStart = element.selectionEnd = start + text.length;
                    return true;
                } else if (element.hasAttribute('contenteditable')) {
                    element.innerHTML = '';
                    element.textContent = text;
                    return true;
                }
            }

            try {
                const pasteEvent = new ClipboardEvent('paste', {
                    clipboardData: new DataTransfer(),
                    bubbles: true,
                    cancelable: true
                });
                pasteEvent.clipboardData.setData('text/plain', text);
                element.dispatchEvent(pasteEvent);
                return !pasteEvent.defaultPrevented;
            } catch (eventError) {
                console.warn('Paste event failed:', eventError);
                return false;
            }
        } catch (error) {
            console.warn('Modern insertion strategy failed:', error);
            return false;
        }
    }

    cursorPositionStrategy(element, text) {
        const tagName = element.tagName.toLowerCase();

        if (tagName === 'textarea' || tagName === 'input') {
            const start = element.selectionStart || 0;
            const end = element.selectionEnd || 0;
            const currentValue = element.value;

            element.value = currentValue.substring(0, start) + text +
                currentValue.substring(end);
            element.selectionStart = element.selectionEnd = start + text.length;
            return true;
        } else if (element.hasAttribute('contenteditable')) {
            const selection = window.getSelection();
            const range = selection.rangeCount > 0 ?
                selection.getRangeAt(0) :
                document.createRange();

            range.deleteContents();
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
            return true;
        }

        return false;
    }

    selectionReplaceStrategy(element, text) {
        try {
            element.focus();
            if (element.tagName.toLowerCase() === 'textarea' ||
                element.tagName.toLowerCase() === 'input') {
                element.select();
            } else if (element.hasAttribute('contenteditable')) {
                const range = document.createRange();
                range.selectNodeContents(element);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
            return document.execCommand('insertText', false, text);
        } catch {
            return false;
        }
    }

    directValueStrategy(element, text) {
        const tagName = element.tagName.toLowerCase();

        if (tagName === 'textarea' || tagName === 'input') {
            element.value = text;
            return true;
        } else if (element.hasAttribute('contenteditable')) {
            element.textContent = text;
            return true;
        }

        return false;
    }

    triggerInputEvents(element) {
        ['input', 'change', 'keyup'].forEach(eventType => {
            const event = eventType === 'input' ?
                new InputEvent(eventType, { bubbles: true, inputType: 'insertText' }) :
                new Event(eventType, { bubbles: true });
            element.dispatchEvent(event);
        });
    }

    verifyInsertion(element, expectedText) {
        // For TipTap/ProseMirror editors, use looser validation
        if (element.id === 'chat-input' && element.classList.contains('ProseMirror')) {
            const pElement = element.querySelector('p');
            if (pElement) {
                const actualText = pElement.textContent || '';
                const expectedPreview = expectedText.substring(0, 50);
                return actualText.includes(expectedPreview) || actualText.length > 10;
            }
        }

        const tagName = element.tagName.toLowerCase();
        let actualText = '';

        if (tagName === 'textarea' || tagName === 'input') {
            actualText = element.value;
        } else if (element.hasAttribute('contenteditable')) {
            actualText = element.textContent || '';
        }

        if (actualText.length > 0) {
            const expectedWords = expectedText.split(' ').slice(0, 3);
            const actualWords = actualText.split(' ');
            return expectedWords.some(word => actualWords.some(actualWord =>
                actualWord.includes(word) || word.includes(actualWord)
            ));
        }

        return false;
    }
}

// Enhanced Prompt Inserter Class
export class EnhancedPromptInserter {
    constructor(detector, inserter) {
        this.detector = detector;
        this.inserter = inserter;
        this.isInserting = false; // Add lock flag
    }

    async insertPrompt(prompt, insertMode = 'command') {
        logger.debug('insertPrompt called', { title: prompt?.title, mode: insertMode, isInserting: this.isInserting });

        // Prevent concurrent insertions
        if (this.isInserting) {
            logger.debug('Insertion already in progress, skipping...');
            return false;
        }

        this.isInserting = true;

        try {
            if (!prompt) {
                this.showError('Prompt is empty');
                return false;
            }

            if (insertMode === 'content') {
                return await this.insertFullContent(prompt);
            } else {
                return await this.insertCommand(prompt);
            }
        } finally {
            // Ensure lock is released even if error occurs
            // Add a small delay to prevent accidental double-clicks
            setTimeout(() => {
                this.isInserting = false;
                logger.debug('Insertion lock released');
            }, 300);
        }
    }

    async insertFullContent(prompt) {
        logger.debug('insertFullContent');
        if (!prompt?.content) {
            this.showError('Prompt content is empty');
            return false;
        }

        const processedContent = processVariables(prompt.content);
        const inputElement = this.detector.detectActiveInput();

        if (!inputElement) {
            this.showError('No available input field found');
            return false;
        }

        // Force clear input field content
        await this.clearInputContent(inputElement);

        // Use a delay to ensure clear operation has taken effect on UI
        await new Promise(resolve => setTimeout(resolve, 50));

        // Directly use the most reliable replacement strategy
        const success = await this.inserter.directValueStrategy(inputElement, processedContent);

        if (success) {
            // Trigger events to notify UI update
            this.inserter.triggerInputEvents(inputElement);

            this.updateUsageStats(prompt);
            // this.showSuccess(`Inserted: ${prompt.title}`); // Removed as per user request
            this.handleInitialPlaceholderSelection(inputElement);
        } else {
            this.showError('Insertion failed, please copy and paste manually');
        }

        return success;
    }

    async insertCommand(prompt) {
        logger.debug('insertCommand');
        const inputElement = this.detector.detectActiveInput();

        if (!inputElement) {
            this.showError('No available input field found');
            return false;
        }

        // 🔑 Key: Close prompt management panel first
        await this.closePanelIfExists();

        // Wait for panel closing animation to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Force clear input field content
        await this.clearInputContent(inputElement);

        // Use a delay to ensure clear operation has taken effect on UI
        await new Promise(resolve => setTimeout(resolve, 50));

        // Generate command name
        const commandName = prompt.command || sanitizeCommand(prompt.title || '');

        // Simulate step-by-step typing process
        const success = await this.simulateTypingCommand(inputElement, commandName);

        if (success) {
            this.updateUsageStats(prompt);
            // this.showSuccess(`Triggering prompt: /${commandName}`); // Removed as per user request
        } else {
            this.showError('Failed to insert command, please type manually');
        }

        return success;
    }

    // Close all prompt panels (Quick Insert Panel and Management Panel)
    async closePanelIfExists() {
        // Close Quick Insert Panel
        const quickPanel = document.getElementById('quick-insert-panel');
        if (quickPanel && quickPanel.style.display !== 'none') {
            quickPanel.style.display = 'none';
        }

        // Close Management Panel
        const managementPanel = document.getElementById('prompt-management-panel');
        if (managementPanel && managementPanel.style.display !== 'none') {
            managementPanel.style.display = 'none';
        }

        // Remove overlay
        const overlay = document.getElementById('panel-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Simulate step-by-step command typing process (Optimized: Batch typing)
    async simulateTypingCommand(inputElement, commandName) {
        console.log('[PromptPlus Debug] simulateTypingCommand', commandName);
        try {
            // Focus input field
            inputElement.focus();
            await new Promise(resolve => setTimeout(resolve, 50));

            // Check if it's ProseMirror
            const isProseMirror = inputElement.classList.contains('ProseMirror');
            logger.debug('isProseMirror:', isProseMirror);

            if (isProseMirror) {
                // For ProseMirror, we try a more direct approach to avoid event duplication
                // We insert the slash, wait, then insert the command name

                // 1. Insert Slash
                logger.debug('ProseMirror: Inserting slash');
                document.execCommand('insertText', false, '/');

                // Wait for panel
                await new Promise(resolve => setTimeout(resolve, 300));

                // 2. Insert Command Name
                if (commandName.length > 0) {
                    logger.debug('ProseMirror: Inserting command name');
                    document.execCommand('insertText', false, commandName);
                }

                // Wait for filter
                await new Promise(resolve => setTimeout(resolve, 300));

                // 3. Trigger Enter (instead of Tab)
                // We use Enter as it is the standard key for confirming a selection in the command menu
                logger.debug('ProseMirror: Triggering Enter');
                await this.simulateEnterKey(inputElement);

                return true;
            }

            // Standard fallback for other inputs
            logger.debug('Standard: Inserting slash');
            await this.typeCharacter(inputElement, '/');
            await new Promise(resolve => setTimeout(resolve, 300));
            if (commandName.length > 0) {
                logger.debug('Standard: Inserting command name');
                await this.typeBatch(inputElement, commandName);
            }
            await new Promise(resolve => setTimeout(resolve, 300));
            logger.debug('Standard: Triggering Enter');
            await this.simulateEnterKey(inputElement);

            return true;
        } catch (error) {
            console.error('Simulation typing failed:', error);
            return false;
        }
    }

    // Batch type multiple characters
    async typeBatch(element, text) {
        logger.debug('typeBatch', text);
        // Focus element
        element.focus();

        // Trigger keydown for first character
        const firstChar = text[0];
        const firstKeyInfo = this.getKeyInfo(firstChar);
        const keydownEvent = new KeyboardEvent('keydown', {
            key: firstKeyInfo.key,
            code: firstKeyInfo.code,
            keyCode: firstKeyInfo.keyCode,
            which: firstKeyInfo.keyCode,
            bubbles: true,
            cancelable: true,
            composed: true
        });
        element.dispatchEvent(keydownEvent);

        let inserted = false;

        // Batch insert text
        if (!keydownEvent.defaultPrevented) {
            inserted = document.execCommand && document.execCommand('insertText', false, text);
            logger.debug('typeBatch execCommand result:', inserted);

            if (!inserted) {
                // Fallback: Manually insert text
                const tagName = element.tagName.toLowerCase();

                if (tagName === 'textarea' || tagName === 'input') {
                    const start = element.selectionStart || 0;
                    const end = element.selectionEnd || 0;
                    const value = element.value || '';
                    element.value = value.substring(0, start) + text + value.substring(end);
                    element.selectionStart = element.selectionEnd = start + text.length;
                    inserted = true; // Mark as manually inserted
                } else if (element.hasAttribute('contenteditable')) {
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        range.deleteContents();
                        const textNode = document.createTextNode(text);
                        range.insertNode(textNode);
                        range.setStartAfter(textNode);
                        range.setEndAfter(textNode);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        inserted = true; // Mark as manually inserted
                    }
                }
            }
        }

        await new Promise(resolve => setTimeout(resolve, 10));

        // Trigger input event ONLY if NOT inserted via execCommand (which triggers it automatically)
        // OR if we manually modified the value/DOM
        if (!inserted || (inserted && !document.execCommand)) {
            logger.debug('typeBatch dispatching manual input event');
            const inputEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: text
            });
            element.dispatchEvent(inputEvent);
        }

        // Trigger keyup for last character
        const lastChar = text[text.length - 1];
        const lastKeyInfo = this.getKeyInfo(lastChar);
        const keyupEvent = new KeyboardEvent('keyup', {
            key: lastKeyInfo.key,
            code: lastKeyInfo.code,
            keyCode: lastKeyInfo.keyCode,
            which: lastKeyInfo.keyCode,
            bubbles: true,
            cancelable: true,
            composed: true
        });
        element.dispatchEvent(keyupEvent);
    }

    // Wait for prompt panel to appear
    async waitForSuggestionsPanel(maxWaitTime = 2000) {
        const startTime = Date.now();
        const checkInterval = 100; // Check every 100ms

        while (Date.now() - startTime < maxWaitTime) {
            // Check if prompt panel exists and is visible
            const suggestionsContainer = document.getElementById('suggestions-container');

            if (suggestionsContainer) {
                // Check if visible
                const style = window.getComputedStyle(suggestionsContainer);
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                    logger.debug('✅ Prompt panel appeared');
                    return true;
                }
            }

            // Wait for a while before checking again
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }

        logger.warn('⚠️ Wait for prompt panel timeout');
        return false;
    }

    // Simulate key press for single character
    async typeCharacter(element, char) {
        logger.debug('typeCharacter', char);
        // Focus element
        element.focus();

        // Get key info
        const keyInfo = this.getKeyInfo(char);

        // 1. Trigger keydown event
        const keydownEvent = new KeyboardEvent('keydown', {
            key: keyInfo.key,
            code: keyInfo.code,
            keyCode: keyInfo.keyCode,
            which: keyInfo.keyCode,
            bubbles: true,
            cancelable: true,
            composed: true
        });
        element.dispatchEvent(keydownEvent);

        let inserted = false;

        // If event is not prevented, actually insert character
        if (!keydownEvent.defaultPrevented) {
            // Use document.execCommand or directly modify value
            inserted = document.execCommand && document.execCommand('insertText', false, char);
            logger.debug('typeCharacter execCommand result:', inserted);

            if (!inserted) {
                // Fallback: Manually insert character
                const tagName = element.tagName.toLowerCase();

                if (tagName === 'textarea' || tagName === 'input') {
                    const start = element.selectionStart || 0;
                    const end = element.selectionEnd || 0;
                    const value = element.value || '';
                    element.value = value.substring(0, start) + char + value.substring(end);
                    element.selectionStart = element.selectionEnd = start + 1;
                    inserted = true;
                } else if (element.hasAttribute('contenteditable')) {
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        range.deleteContents();
                        const textNode = document.createTextNode(char);
                        range.insertNode(textNode);
                        range.setStartAfter(textNode);
                        range.setEndAfter(textNode);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        inserted = true;
                    }
                }
            }
        }

        // Small delay to simulate real key press
        await new Promise(resolve => setTimeout(resolve, 10));

        // 2. Trigger keypress event (required by some browsers)
        const keypressEvent = new KeyboardEvent('keypress', {
            key: keyInfo.key,
            code: keyInfo.code,
            keyCode: keyInfo.keyCode,
            which: keyInfo.keyCode,
            bubbles: true,
            cancelable: true,
            composed: true
        });
        element.dispatchEvent(keypressEvent);

        // 3. Trigger input event (with actual character data)
        // Only if NOT inserted via execCommand (which triggers it automatically)
        if (!inserted || (inserted && !document.execCommand)) {
            logger.debug('typeCharacter dispatching manual input event');
            const inputEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: char
            });
            element.dispatchEvent(inputEvent);
        }

        // 4. Trigger keyup event
        const keyupEvent = new KeyboardEvent('keyup', {
            key: keyInfo.key,
            code: keyInfo.code,
            keyCode: keyInfo.keyCode,
            which: keyInfo.keyCode,
            bubbles: true,
            cancelable: true,
            composed: true
        });
        element.dispatchEvent(keyupEvent);
    }

    // Get keyboard info for character
    getKeyInfo(char) {
        // Special character mapping
        const specialKeys = {
            '/': { key: '/', code: 'Slash', keyCode: 191 },
            '-': { key: '-', code: 'Minus', keyCode: 189 },
            '_': { key: '_', code: 'Minus', keyCode: 189, shift: true },
            ' ': { key: ' ', code: 'Space', keyCode: 32 },
        };

        if (specialKeys[char]) {
            return specialKeys[char];
        }

        // Numbers
        if (/[0-9]/.test(char)) {
            return {
                key: char,
                code: `Digit${char}`,
                keyCode: 48 + parseInt(char)
            };
        }

        // Letters
        if (/[a-zA-Z]/.test(char)) {
            const upperChar = char.toUpperCase();
            return {
                key: char,
                code: `Key${upperChar}`,
                keyCode: upperChar.charCodeAt(0)
            };
        }

        // Default
        return {
            key: char,
            code: `Key${char.toUpperCase()}`,
            keyCode: char.charCodeAt(0)
        };
    }

    // Simulate Enter key press
    async simulateEnterKey(element) {
        logger.debug('simulateEnterKey');
        // Simulate keydown event
        const keydownEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(keydownEvent);

        // await new Promise(resolve => setTimeout(resolve, 50));

        // const keyupEvent = new KeyboardEvent('keyup', {
        //     key: 'Enter',
        //     code: 'Enter',
        //     keyCode: 13,
        //     which: 13,
        //     bubbles: true,
        //     cancelable: true
        // });
        // element.dispatchEvent(keyupEvent);
    }

    async updateUsageStats(prompt) {
        if (window.promptManager) {
            await window.promptManager.updateUsageStats(prompt.id);
        }
    }

    showSuccess(message) {
        showNotification(message, '#48bb78');
    }

    showError(message) {
        showNotification(message, '#f56565');
    }

    // Clear input field content
    async clearInputContent(element) {
        if (!element) return;

        try {
            logger.debug('[Clear] Start clearing input field:', element.id, element.tagName);

            element.focus();
            await new Promise(resolve => setTimeout(resolve, 50));

            // Strategy 1: Special handling for TipTap/ProseMirror editor
            if (element.classList.contains('ProseMirror')) {
                logger.debug('[Clear] ProseMirror editor detected');

                // Thoroughly clear all content
                element.innerHTML = '';

                // Re-create a single empty paragraph to maintain editor structure
                const pElement = document.createElement('p');
                pElement.className = 'is-empty is-editor-empty';
                element.appendChild(pElement);

                // Trigger event
                const inputEvent = new InputEvent('input', {
                    bubbles: true,
                    cancelable: true,
                    inputType: 'deleteContentBackward'
                });
                element.dispatchEvent(inputEvent);

                logger.debug('[Clear] ProseMirror cleared');
                return;
            }

            // Strategy 2: Use execCommand SelectAll+Delete (Most reliable)
            try {
                element.focus();

                // Select All
                if (document.execCommand('selectAll', false, null)) {
                    // Delete selected content
                    const deleted = document.execCommand('delete', false, null);
                    if (deleted) {
                        logger.debug('[Clear] execCommand clear success');
                        this.inserter.triggerInputEvents(element);
                        return;
                    }
                }
            } catch (cmdError) {
                logger.warn('[Clear] execCommand failed:', cmdError);
            }

            // Strategy 3: Manually select all content and delete
            const tagName = element.tagName.toLowerCase();

            if (tagName === 'textarea' || tagName === 'input') {
                logger.debug('[Clear] Processing textarea/input');
                element.value = '';
                element.selectionStart = 0;
                element.selectionEnd = 0;

            } else if (element.hasAttribute('contenteditable')) {
                logger.debug('[Clear] Processing contenteditable');

                // Completely clear
                element.innerHTML = '';
                element.textContent = '';

                // Reset cursor to start position
                try {
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.selectNodeContents(element);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } catch (selError) {
                    console.warn('[Clear] Cursor reset failed:', selError);
                }
            }

            // Trigger all relevant events
            this.inserter.triggerInputEvents(element);

            // Additionally trigger delete event
            const deleteEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'deleteContentBackward'
            });
            element.dispatchEvent(deleteEvent);

            console.log('[Clear] Clear completed, current value:',
                element.value || element.textContent || element.innerHTML);

        } catch (error) {
            console.error('[Clear] Failed to clear input field:', error);
        }
    }

    // Automatically select first placeholder after insertion
    handleInitialPlaceholderSelection(element) {
        if (!element) return;

        requestAnimationFrame(() => {
            setTimeout(() => {
                const text = element.textContent || '';
                const placeholderPattern = /\{\{[^}]+\}\}/g;
                const match = placeholderPattern.exec(text);

                if (match) {
                    this.selectPlaceholder(element, match.index, match[0].length);
                }
            }, 50);
        });
    }

    // Select placeholder
    selectPlaceholder(container, start, length) {
        const range = document.createRange();
        const selection = window.getSelection();

        let currentOffset = 0;
        let startNode = null;
        let startOffset = 0;
        let endNode = null;
        let endOffset = 0;

        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const nodeLength = node.textContent.length;

            if (!startNode && currentOffset + nodeLength > start) {
                startNode = node;
                startOffset = start - currentOffset;
            }

            if (!endNode && currentOffset + nodeLength >= start + length) {
                endNode = node;
                endOffset = start + length - currentOffset;
                break;
            }

            currentOffset += nodeLength;
        }

        if (startNode && endNode) {
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
}
