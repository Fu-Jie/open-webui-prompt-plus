import { i18n } from '../../core/i18n.js';

// Common Emojis with keywords for search
const EMOJI_LIST = [
    { char: '✍️', keywords: 'writing article copy edit' },
    { char: '🚀', keywords: 'productivity fast launch speed' },
    { char: '🎓', keywords: 'learning study education school' },
    { char: '💻', keywords: 'coding programming dev tech' },
    { char: '📊', keywords: 'data analysis chart stats' },
    { char: '🏠', keywords: 'lifestyle home house life' },
    { char: '🎭', keywords: 'roleplay character game play' },
    { char: '📝', keywords: 'note content creation' },
    { char: '🎨', keywords: 'art design creative' },
    { char: '🔍', keywords: 'search research find' },
    { char: '💡', keywords: 'idea light inspiration' },
    { char: '🛠️', keywords: 'tools build fix' },
    { char: '📁', keywords: 'folder file organize' },
    { char: '📅', keywords: 'calendar date plan' },
    { char: '📧', keywords: 'email mail message' },
    { char: '💬', keywords: 'chat talk conversation' },
    { char: '🤖', keywords: 'ai robot bot' },
    { char: '🧠', keywords: 'brain mind think' },
    { char: '✨', keywords: 'sparkle magic clean' },
    { char: '🔥', keywords: 'fire hot popular' },
    { char: '🌈', keywords: 'rainbow color fun' },
    { char: '🌍', keywords: 'world earth global' },
    { char: '⚙️', keywords: 'settings gear config' },
    { char: '🔒', keywords: 'lock private security' },
    { char: '📱', keywords: 'mobile phone app' },
    { char: '🎮', keywords: 'game play fun' },
    { char: '🎵', keywords: 'music sound audio' },
    { char: '📷', keywords: 'camera photo image' },
    { char: '🎬', keywords: 'movie video film' },
    { char: '💼', keywords: 'business work office' },
    { char: '🛒', keywords: 'shop cart buy' },
    { char: '🎁', keywords: 'gift present surprise' },
    { char: '🍔', keywords: 'food eat meal' },
    { char: '⚽', keywords: 'sport ball game' },
    { char: '✈️', keywords: 'travel flight plane' },
    { char: '🏥', keywords: 'health medical doctor' },
    { char: '💰', keywords: 'money cash finance' }
];

export class CategoryModal {
    constructor(callbacks = {}) {
        this.callbacks = callbacks;
        this.selectedIcon = '📁';
        this.element = this._render();
        this.form = this.element.querySelector('form');
        this.modalTitle = this.element.querySelector('.modal-header h3');
        this.iconPreview = this.element.querySelector('#category-icon-preview');
        this.emojiPicker = this.element.querySelector('#emoji-picker');
        this.emojiSearch = this.element.querySelector('#emoji-search');
        this.emojiGrid = this.element.querySelector('#emoji-grid');
        this._bindEvents();
    }

    _render() {
        const modal = document.createElement('div');
        modal.id = 'category-edit-modal';
        modal.className = 'prompt-modal';
        modal.innerHTML = `
            <div class="prompt-modal-content modal-sm" style="width: 400px; max-width: 90vw; background: #fff; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35); display: flex; flex-direction: column; overflow: hidden;">
                <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; flex-shrink: 0;">
                    <h3 id="category-modal-title" style="font-size: 1rem; font-weight: 600; margin: 0; color: #fff;">${i18n.t('new_category')}</h3>
                    <button type="button" class="btn-close" data-action="closeCategoryModal" title="${i18n.t('close')}" style="width: 28px; height: 28px; padding: 0; display: flex; align-items: center; justify-content: center; border: none; border-radius: 6px; background: rgba(255, 255, 255, 0.2); color: #fff; cursor: pointer; font-size: 18px; transition: background 0.2s;">×</button>
                </div>
                <form id="category-edit-form" style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
                    <input type="hidden" id="category-edit-id">
                    
                    <!-- Icon Selection -->
                    <div class="form-group" style="display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-size: 13px; font-weight: 500; color: #374151;">${i18n.t('select_icon')}</label>
                        <div style="display: flex; gap: 12px; align-items: center;">
                            <div id="category-icon-preview" style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; font-size: 24px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 10px; cursor: pointer; transition: all 0.2s;">📁</div>
                            <div style="flex: 1; position: relative;">
                                <input type="text" id="emoji-search" placeholder="${i18n.t('search_icon')}" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px; outline: none;">
                                <div id="emoji-picker" style="display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 100; margin-top: 4px; background: #fff; border: 1px solid #d1d5db; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); max-height: 200px; overflow-y: auto; padding: 8px;">
                                    <div id="emoji-grid" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px;">
                                        <!-- Emojis will be rendered here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-group" style="display: flex; flex-direction: column; gap: 6px;">
                        <label for="category-edit-name" style="font-size: 13px; font-weight: 500; color: #374151;">${i18n.t('name')} <span style="color: #ef4444;">*</span></label>
                        <input type="text" id="category-edit-name" required placeholder="${i18n.t('category_name_placeholder')}" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box;">
                    </div>
                    <div class="form-actions" style="display: flex; gap: 10px; margin-top: 4px;">
                        <button type="submit" class="btn-primary" style="flex: 1; padding: 10px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">${i18n.t('save')}</button>
                        <button type="button" class="btn-secondary" data-action="closeCategoryModal" style="flex: 1; padding: 10px 16px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">${i18n.t('cancel')}</button>
                    </div>
                </form>
            </div>
        `;
        return modal;
    }

    _bindEvents() {
        this.form.onsubmit = (e) => {
            e.preventDefault();
            const data = {
                id: this.form.querySelector('#category-edit-id').value,
                name: this.form.querySelector('#category-edit-name').value.trim(),
                icon: this.selectedIcon
            };
            if (this.callbacks.onSubmit) this.callbacks.onSubmit(data);
        };

        // Emoji Search Logic
        this.emojiSearch.oninput = () => {
            const query = this.emojiSearch.value.toLowerCase();
            this._renderEmojiGrid(query);
            this.emojiPicker.style.display = 'block';
        };

        this.emojiSearch.onfocus = () => {
            this._renderEmojiGrid(this.emojiSearch.value.toLowerCase());
            this.emojiPicker.style.display = 'block';
        };

        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.emojiPicker.contains(e.target) && e.target !== this.emojiSearch) {
                this.emojiPicker.style.display = 'none';
            }
        });

        this.iconPreview.onclick = () => {
            this.emojiSearch.focus();
        };

        const closeBtn = this.element.querySelector('.btn-close[data-action="closeCategoryModal"]');
        const cancelBtn = this.element.querySelector('.btn-secondary[data-action="closeCategoryModal"]');

        const closeHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.callbacks.onClose) this.callbacks.onClose();
        };

        if (closeBtn) closeBtn.onclick = closeHandler;
        if (cancelBtn) cancelBtn.onclick = closeHandler;
    }

    _renderEmojiGrid(query = '') {
        this.emojiGrid.innerHTML = '';
        const filtered = EMOJI_LIST.filter(e =>
            !query || e.keywords.toLowerCase().includes(query)
        );

        filtered.forEach(emoji => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'emoji-item';
            btn.style.cssText = 'width: 100%; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; border: none; background: transparent; cursor: pointer; border-radius: 6px; transition: background 0.2s;';
            btn.innerHTML = emoji.char;
            btn.onmouseover = () => btn.style.background = '#f3f4f6';
            btn.onmouseout = () => btn.style.background = 'transparent';
            btn.onclick = () => {
                this._selectIcon(emoji.char);
                this.emojiPicker.style.display = 'none';
                this.emojiSearch.value = '';
            };
            this.emojiGrid.appendChild(btn);
        });
    }

    _selectIcon(char) {
        this.selectedIcon = char;
        this.iconPreview.textContent = char;
    }

    open(category = null) {
        if (category) {
            this.modalTitle.textContent = i18n.t('edit_category');
            this.form.querySelector('#category-edit-id').value = category.id;
            this.form.querySelector('#category-edit-name').value = category.name;
            this._selectIcon(category.icon || '📁');
        } else {
            this.modalTitle.textContent = i18n.t('new_category');
            this.form.reset();
            this.form.querySelector('#category-edit-id').value = '';
            this._selectIcon('📁');
        }
        this.element.classList.add('is-visible');
    }

    close() {
        this.element.classList.remove('is-visible');
        this.emojiPicker.style.display = 'none';
    }
}
