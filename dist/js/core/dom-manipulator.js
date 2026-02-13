import { SELECTORS, getPlaceholders } from './constants.js';
import { i18n } from './i18n.js';

// DOM Manipulation Functions
export class DOMManipulator {
    constructor() {
        this.placeholderSet = false;
        // Subscribe to language changes to update placeholders dynamically
        i18n.subscribe(() => {
            this.placeholderSet = false; // Reset flag to force update
            this.setRandomPlaceholder();
        });
    }



    // Set Random Placeholder
    setRandomPlaceholder() {
        if (this.placeholderSet) {
            return;
        }

        const placeholderElement = document.querySelector(SELECTORS.PLACEHOLDER_ELEMENT);
        if (placeholderElement) {
            const placeholders = getPlaceholders();
            const randomIndex = Math.floor(Math.random() * placeholders.length);
            const randomPlaceholder = placeholders[randomIndex];

            let styleElement = document.getElementById('dynamic-placeholder-style');
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = 'dynamic-placeholder-style';
                document.head.appendChild(styleElement);
            }

            styleElement.textContent = `
                p.is-empty.is-editor-empty::before {
                    content: "${randomPlaceholder}" !important;
                }
            `;

            this.placeholderSet = true;
        }
    }

    // Find Target Container - Robust Strategy
    findTargetContainer() {
        const chatInput = document.querySelector('#chat-input');
        if (chatInput) {
            const wrapper = chatInput.closest('form') || chatInput.closest('.relative');

            if (wrapper) {
                // Priority 1: Look for Left-side Toolbar (Upload/Plus button)
                // These buttons usually have specific aria-labels or SVG paths
                const buttons = wrapper.querySelectorAll('button[type="button"]');

                for (const btn of buttons) {
                    const label = (btn.getAttribute('aria-label') || btn.title || '').toLowerCase();
                    // Common labels for left-side tools
                    if (label.includes('upload') || label.includes('attach') || label.includes('file') || label.includes('add')) {
                        if (btn.parentElement) {
                            const style = window.getComputedStyle(btn.parentElement);
                            if (style.display.includes('flex')) {
                                return btn.parentElement;
                            }
                        }
                    }
                }

                // Priority 2: Fallback - Find the first flex container with buttons that is NOT the right-side container
                // We assume the right-side container has the submit button
                const submitBtn = wrapper.querySelector('button[type="submit"]');
                const rightSideContainer = submitBtn ? submitBtn.parentElement : null;

                for (const btn of buttons) {
                    if (btn.id === 'prompt-manager-integrated-btn') continue;

                    if (btn.parentElement && btn.parentElement !== rightSideContainer) {
                        const style = window.getComputedStyle(btn.parentElement);
                        if (style.display.includes('flex')) {
                            return btn.parentElement;
                        }
                    }
                }
            }
        }

        return null;
    }

    // Create Integrated Button
    createIntegratedButton(container) {
        // **Only create "Prompt" button**
        const promptWrapper = document.createElement('div');
        promptWrapper.className = 'flex';
        const promptBtn = document.createElement('button');
        promptBtn.id = 'prompt-manager-integrated-btn';
        promptBtn.type = 'button';
        // Use more generic classes to match Open WebUI style
        promptBtn.className = 'px-2 py-2 flex gap-1.5 items-center text-sm rounded-full transition-colors duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300';
        promptBtn.setAttribute('aria-label', i18n.t('prompt_management'));
        promptBtn.title = i18n.t('prompt_management_tooltip');
        // Only Icon, No Text
        promptBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" class="size-5 w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6A2.25 2.25 0 0 1 6 3.75h1.5m9 0h-9" />
            </svg>
        `;
        promptWrapper.appendChild(promptBtn);

        // **Append button to end of container**
        // This ensures it appears after existing left-side buttons
        container.appendChild(promptWrapper);

        return promptBtn;
    }

    // Select Placeholder Text
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

    // Handle Placeholder Navigation
    handlePlaceholderNavigation(e, element) {
        if (!element || !element.classList.contains('ProseMirror')) return;

        const pElement = element.querySelector('p');
        if (!pElement) return;

        const text = pElement.textContent || '';
        const placeholderPattern = /\{\{[^}]+\}\}/g;
        const placeholders = [...text.matchAll(placeholderPattern)];

        if (placeholders.length === 0) return;

        e.preventDefault();

        const selection = window.getSelection();
        let currentOffset = 0;

        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(pElement);
            preCaretRange.setEnd(range.startContainer, range.startOffset);
            currentOffset = preCaretRange.toString().length;
        }

        let nextPlaceholder = null;

        for (let i = 0; i < placeholders.length; i++) {
            const placeholder = placeholders[i];
            if (placeholder.index > currentOffset) {
                nextPlaceholder = placeholder;
                break;
            }
        }

        if (!nextPlaceholder && placeholders.length > 0) {
            nextPlaceholder = placeholders[0];
        }

        if (nextPlaceholder) {
            this.selectPlaceholder(pElement, nextPlaceholder.index, nextPlaceholder[0].length);
        }
    }

    // Cleanup Existing Elements
    cleanupExistingElements() {
        const existingContainer = document.getElementById('prompt-suggestion-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        const existingButton = document.getElementById('prompt-manager-integrated-btn');
        if (existingButton) {
            // Correctly remove button and its wrapper div
            if (existingButton.parentElement && existingButton.parentElement.className === 'flex') {
                existingButton.parentElement.remove();
            } else {
                existingButton.remove();
            }
        }
    }

    // Hide Version Info - Hybrid Strategy (Text Clearing + Element Hiding)
    hideVersionInfo() {
        const versionPattern = /Open WebUI.*v\d+\.\d+\.\d+/i;

        // 1. Text Node Clearing (Precision)
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        const textNodes = [];

        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.nodeValue && versionPattern.test(node.nodeValue)) {
                textNodes.push(node);
            }
        }

        textNodes.forEach(node => {
            node.nodeValue = '';
        });

        // 2. Element Hiding (Broad strokes for footers/containers)
        const allElements = document.body.getElementsByTagName('*');
        for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i];
            // Optimization: Skip elements that are likely not version info
            if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'SVG' || el.tagName === 'PATH') continue;

            // Check if element text content matches version pattern exactly (to avoid hiding large containers)
            if (el.children.length === 0 && el.textContent && el.textContent.includes('Open WebUI')) {
                el.style.display = 'none';
            }
            // Check specific classes often used for version info
            if (el.classList.contains('text-xs') && el.classList.contains('text-gray-400') && el.textContent.includes('v0.')) {
                el.style.display = 'none';
            }
        }
    }
}
