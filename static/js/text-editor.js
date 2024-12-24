class TextEditor {
    constructor() {
        this.textInput = document.getElementById('textInput');
        this.clearButton = document.getElementById('clearText');
        this.remainingChars = document.getElementById('remainingChars');
        
        this.setupEventListeners();
        this.updateCharCount();
    }

    setupEventListeners() {
        this.textInput.addEventListener('input', () => this.updateCharCount());
        this.clearButton.addEventListener('click', () => this.clearText());
    }

    updateCharCount() {
        const remaining = config.maxChars - this.textInput.value.length;
        this.remainingChars.textContent = remaining;
    }

    clearText() {
        this.textInput.value = '';
        this.updateCharCount();
    }
}

// Initialize text editor
new TextEditor();