class HowToUse {
    constructor() {
        this.container = document.getElementById('howToUseSteps');
        this.render();
    }

    getIconSvg(iconName) {
        const icons = {
            'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H8"></path>',
            'user-cog': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><circle cx="19" cy="8" r="2"></circle><path d="M19 8v3m0 0-1.5-1.5M19 11l1.5-1.5"></path>',
            'file-edit': '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path>',
            'volume': '<path d="m11 5-5 4H2v6h4l5 4V5Z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>'
        };
        
        return icons[iconName] || '';
    }

    render() {
        this.container.innerHTML = config.steps.map(step => `
            <div class="step">
                <div class="step-icon">
                    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2">
                        ${this.getIconSvg(step.icon)}
                    </svg>
                </div>
                <h3>${step.title}</h3>
                <p>${step.description}</p>
            </div>
        `).join('');
    }
}

// Initialize how to use section
new HowToUse();