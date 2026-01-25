export class PanelState {
    constructor() {
        this.activePanel = null; // 'quick' | 'management' | null
        this.isModalOpen = false;

        // Initialization flags
        this.panelsCreated = false;
        this.quickPanelCreated = false;
        this.managementPanelCreated = false;
        this.justOpenedQuickPanel = false;

        // Category state
        this.currentQuickCategoryId = 'favorites';
        this.currentManagementCategoryId = 'all';

        // Pagination state
        this.pagination = {
            quick: { currentPage: 1, itemsPerPage: 6, totalItems: 0 },
            management: { currentPage: 1, itemsPerPage: 6, totalItems: 0 }
        };

        // AI related state (kept here for now, though could be separate)
        this.currentAIGeneration = null;
        this.lastAIUserInput = null;
    }

    reset() {
        this.activePanel = null;
        this.isModalOpen = false;
        this.currentAIGeneration = null;
    }
}
