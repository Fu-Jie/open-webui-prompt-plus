// Check if browser supports ES6 modules
const supportsModules = 'noModule' in HTMLScriptElement.prototype;

if (supportsModules) {
    // Inject critical styles to bypass CSS cache
    const style = document.createElement('style');
    style.id = 'critical-layout-fixes';
    style.textContent = `
        /* Nuclear Fix for Layout Cache Issues */
        #prompt-enhancement-system .editor-workspace {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 !important;
            min-height: 0 !important;
            overflow: hidden !important;
            grid-template-columns: none !important;
            width: 100% !important;
        }
        #prompt-enhancement-system .editor-panel-body {
            width: 100% !important;
            flex: 1 !important;
        }
        /* Force hide preview pane if it appears */
        #prompt-enhancement-system .preview-card,
        #prompt-enhancement-system .preview-pane,
        #prompt-enhancement-system .preview-body {
            display: none !important;
        }
    `;
    document.head.appendChild(style);

    // Modern browsers: Load app modules
    const VERSION = '0.1.0';
    console.log(`Loader: Loading Prompt Plus v${VERSION}...`);

    // Use relative path that works with the new directory structure
    import(`./js/prompt-plus-js/app.js?v=${VERSION}`)
        .then((appModule) => {
            console.log('App modules loaded successfully');
            // Ensure app initializes correctly
            if (appModule.PromptApp) {
                const app = new appModule.PromptApp();
                app.initialize().then(() => {
                    app.run();
                }).catch(error => {
                    console.error('App initialization failed:', error);
                    loadLegacyVersion();
                });
            }
        }).catch(error => {
            console.error('Module load failed, falling back to legacy:', error);
            loadLegacyVersion();
        });
} else {
    // Legacy browsers: Fallback to legacy version
    loadLegacyVersion();
}

// Legacy version fallback implementation
function loadLegacyVersion() {
    console.log('Using legacy version');

    // Set HTML language to English
    document.documentElement.lang = 'en';

    // A flag to ensure the placeholder is set only once
    let placeholderSet = false;

    function replaceTextsIfFound() {
        // More robust: Traverse text nodes for replacement
        const replacements = new Map([
            ['Web Search', 'Search'],
            ['Image Generation', 'Image']
        ]);

        // 1) Text node replacement (exact match)
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        const toUpdate = [];
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node || !node.nodeValue) continue;
            const raw = node.nodeValue.trim();
            if (replacements.has(raw)) {
                toUpdate.push({ node, value: replacements.get(raw) });
            }
        }
        toUpdate.forEach(({ node, value }) => {
            node.nodeValue = value;
        });

        // 2) Attribute fallback: Replace text in title / aria-label
        const attrTargets = document.querySelectorAll('[title],[aria-label]');
        attrTargets.forEach(el => {
            ['title', 'aria-label'].forEach(attr => {
                const v = el.getAttribute(attr);
                if (!v) return;
                const trimmed = v.trim();
                if (replacements.has(trimmed)) {
                    el.setAttribute(attr, replacements.get(trimmed));
                }
            });
        });
    }

    function setRandomPlaceholder() {
        // If the placeholder has already been set, do nothing.
        if (placeholderSet) {
            return;
        }

        // Check if the placeholder element exists
        const placeholderElement = document.querySelector('p.is-empty.is-editor-empty');
        if (placeholderElement) {
            const placeholders = [
                "Don't be shy, ask me something!",
                "Your personal wisdom is online, feel free to ask~",
                "Ding! An AI is waiting for your question...",
                "Start your soul interrogation! (or just chat)",
                "Connecting to the universe database... Go ahead!",
                "How can I help you today?",
                "Waiting for your command.",
                "Thoughts are like wind, pause here for a moment...",
                "Are you there?",
                "AI standing by, please instruct!",
                "Thinking... (pretending to be busy)",
                "Hello, this is the AI support that never goes offline.",
                "Please enter your whimsical ideas...",
                "Mind interface ready, please transmit instructions.",
                "Exploring the unknown? Answering doubts? I'm ready."
            ];

            // Select a random placeholder
            const randomIndex = Math.floor(Math.random() * placeholders.length);
            const randomPlaceholder = placeholders[randomIndex];

            // Create or update the CSS rule
            let styleElement = document.getElementById('dynamic-placeholder-style');
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = 'dynamic-placeholder-style';
                document.head.appendChild(styleElement);
            }

            // Set the CSS rule with the random placeholder
            styleElement.textContent = `
                p.is-empty.is-editor-empty::before {
                    content: "${randomPlaceholder}" !important;
                }
            `;

            // Set the flag to true so we don't run this again
            placeholderSet = true;
        }
    }

    // Set observer
    const observer = new MutationObserver(() => {
        replaceTextsIfFound();
        setRandomPlaceholder();
    });

    // Start observing the document body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial check on page load
    replaceTextsIfFound();
    setRandomPlaceholder();
}
