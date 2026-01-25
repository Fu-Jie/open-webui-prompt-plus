export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

class Logger {
    constructor() {
        this.level = LogLevel.INFO; // Default to INFO

        // Check localStorage for override
        // Priority: log_level > debug_mode
        const storedLevel = localStorage.getItem('log_level');
        if (storedLevel && LogLevel[storedLevel] !== undefined) {
            this.level = LogLevel[storedLevel];
        } else if (localStorage.getItem('debug_mode') === 'true') {
            this.level = LogLevel.DEBUG;
        }
    }

    setLevel(levelName) {
        if (LogLevel[levelName] !== undefined) {
            this.level = LogLevel[levelName];
            localStorage.setItem('log_level', levelName);
            console.log(`[Logger] Log level set to ${levelName}`);
        } else {
            console.warn(`[Logger] Invalid log level: ${levelName}`);
        }
    }

    debug(message, ...args) {
        if (this.level <= LogLevel.DEBUG) {
            console.log(`%c[PromptSystem] [DEBUG]`, 'color: #9ca3af;', message, ...args);
        }
    }

    info(message, ...args) {
        if (this.level <= LogLevel.INFO) {
            console.info(`%c[PromptSystem] [INFO]`, 'color: #3b82f6;', message, ...args);
        }
    }

    warn(message, ...args) {
        if (this.level <= LogLevel.WARN) {
            console.warn(`%c[PromptSystem] [WARN]`, 'color: #f59e0b;', message, ...args);
        }
    }

    error(message, ...args) {
        if (this.level <= LogLevel.ERROR) {
            console.error(`%c[PromptSystem] [ERROR]`, 'color: #ef4444;', message, ...args);
        }
    }
}

export const logger = new Logger();
window.logger = logger; // Expose to window for runtime configuration
