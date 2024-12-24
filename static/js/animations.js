// Smooth scroll animation for better navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Add animation to feature cards
const observerFeatures = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('feature-animate');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card').forEach((card) => {
    observerFeatures.observe(card);
});

// Add hover effect to steps
document.querySelectorAll('.step').forEach(step => {
    step.addEventListener('mouseenter', () => {
        step.querySelector('.step-number').style.transform = 'scale(1.1) rotate(360deg)';
        step.querySelector('.step-number').style.transition = 'transform 0.5s ease';
    });
    
    step.addEventListener('mouseleave', () => {
        step.querySelector('.step-number').style.transform = 'scale(1) rotate(0deg)';
    });
});

// Add typing effect to hero title
function typeWriter(element, text, speed = 50) {
    let i = 0;
    element.innerHTML = '';
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// Initialize typing effect when page loads
window.addEventListener('load', () => {
    const heroTitle = document.querySelector('.hero h1');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        typeWriter(heroTitle, originalText);
    }
});

// Add smooth fade-in animation for sections
const observerSections = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('section').forEach((section) => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observerSections.observe(section);
}); 