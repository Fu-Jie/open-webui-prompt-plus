import { INPUT_SELECTORS } from './constants.js';
import { logger } from './logger.js';

// Smart Input Detector Class
export class SmartInputDetector {
    constructor() {
        this.cachedSelector = null;
        this.selectors = INPUT_SELECTORS;
    }

    detectActiveInput() {
        // Try ID selector first
        const chatInput = document.getElementById('chat-input');
        if (chatInput && this.isValidInputElement(chatInput)) {
            this.cachedSelector = '#chat-input';
            return chatInput;
        }

        // Try cached selector
        if (this.cachedSelector && this.cachedSelector !== '#chat-input') {
            const element = document.querySelector(this.cachedSelector);
            if (this.isValidInputElement(element)) {
                return element;
            }
            this.cachedSelector = null;
        }

        // Iterate through all selectors
        for (const selector of this.selectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (this.isValidInputElement(element)) {
                        this.cachedSelector = selector;
                        return element;
                    }
                }
            } catch (error) {
                logger.warn(`Invalid selector: ${selector}`, error);
            }
        }

        // Focus-based detection
        const focusedElement = document.activeElement;
        if (this.isValidInputElement(focusedElement)) {
            return focusedElement;
        }

        return null;
    }

    isValidInputElement(element) {
        if (!element) return false;

        const tagName = element.tagName.toLowerCase();
        const isValidTag = tagName === 'input' || tagName === 'textarea' ||
            element.hasAttribute('contenteditable');

        return isValidTag && this.isVisibleAndInteractable(element) &&
            this.looksLikeChatInput(element);
    }

    isVisibleAndInteractable(element) {
        if (!element.offsetParent && element.style.position !== 'fixed') {
            return false;
        }

        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' ||
            element.disabled || element.readOnly) {
            return false;
        }

        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    looksLikeChatInput(element) {
        // If element ID is chat-input, return true directly
        if (element.id === 'chat-input') {
            return true;
        }

        const text = (element.placeholder || '' + element.className || '' +
            element.id || '').toLowerCase();

        // Negative keywords
        const negativeKeywords = ['search', 'filter', 'password', 'username', 'login'];
        for (const keyword of negativeKeywords) {
            if (text.includes(keyword)) return false;
        }

        // Positive keywords
        const positiveKeywords = ['消息', '聊天', '输入', 'message', 'chat', '请输入'];
        for (const keyword of positiveKeywords) {
            if (text.includes(keyword)) return true;
        }

        // Position-based judgment
        const rect = element.getBoundingClientRect();
        return rect.width > 200 && rect.height > 30 &&
            rect.top > window.innerHeight / 2;
    }
}
