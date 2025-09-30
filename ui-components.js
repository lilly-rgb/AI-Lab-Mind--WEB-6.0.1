

import { currentLang, getTranslation } from './language.js';

let previouslyFocusedElement = null;
let modalContainer = null;
const focusableSelector = 'a[href], button:not([disabled]), input, textarea, select, details, [tabindex]:not([tabindex="-1"])';
let focusTrapHandler = null;

export function trapFocus(element, triggerElement = null) {
    modalContainer = element;
    previouslyFocusedElement = triggerElement || document.activeElement;

    const focusableElements = Array.from(modalContainer.querySelectorAll(focusableSelector));
    if (focusableElements.length === 0) return;

    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];

    focusTrapHandler = (e) => {
        if (e.key !== 'Tab') return;

        const isTabBackward = e.shiftKey;

        if (isTabBackward) {
            if (document.activeElement === firstFocusableElement) {
                e.preventDefault();
                lastFocusableElement.focus();
            }
        } else {
            if (document.activeElement === lastFocusableElement) {
                e.preventDefault();
                firstFocusableElement.focus();
            }
        }
    };
    
    modalContainer.addEventListener('keydown', focusTrapHandler);
    
    // Defer focus to allow for transitions and rendering
    requestAnimationFrame(() => {
        const elementToFocus = modalContainer.querySelector('[autofocus]') || firstFocusableElement;
        elementToFocus?.focus();
    });
}

export function releaseFocus() {
    if (modalContainer && focusTrapHandler) {
        modalContainer.removeEventListener('keydown', focusTrapHandler);
    }
    if (previouslyFocusedElement) {
        previouslyFocusedElement.focus();
    }
    previouslyFocusedElement = null;
    modalContainer = null;
    focusTrapHandler = null;
}

function initializeMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const navLinksList = document.querySelector('.nav-links');
    const navLinks = navLinksList.querySelectorAll('a');

    const toggleMenu = () => {
        const isActive = navLinksList.classList.toggle('active');
        menuToggle.classList.toggle('is-active');
        document.body.classList.toggle('body-no-scroll', isActive);
        menuToggle.setAttribute('aria-expanded', String(isActive));
        
        const newAriaLabelKey = isActive ? 'menu.toggle.close' : 'menu.toggle.open';
        menuToggle.setAttribute('aria-label', getTranslation(newAriaLabelKey));
    };

    const closeMenu = () => {
        if (navLinksList.classList.contains('active')) {
            toggleMenu();
        }
    };

    menuToggle.addEventListener('click', toggleMenu);
    navLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });
}

function initializeAudioDemos() {
    const audioPlayer = new Audio();
    let currentlyPlayingButton = null;

    const resetButton = (button) => {
        if (!button) return;
        button.classList.remove('playing');
        const icon = button.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
        }
    };

    const stopCurrentAudio = () => {
        audioPlayer.pause();
        if (currentlyPlayingButton) {
            resetButton(currentlyPlayingButton);
            currentlyPlayingButton = null;
        }
    };

    document.querySelectorAll('.btn-demo').forEach(button => {
        button.addEventListener('click', async () => {
            const isThisButtonPlaying = (currentlyPlayingButton === button);
            stopCurrentAudio();

            if (!isThisButtonPlaying) {
                currentlyPlayingButton = button;
                const agentName = button.dataset.play;
                
                // The language is handled by the folder path, so the filename can be simple.
                const audioSrc = `/assets/audio/${currentLang}/${agentName}.mp3`;
                
                audioPlayer.src = audioSrc;
                
                try {
                    await audioPlayer.play();
                    button.classList.add('playing');
                    const icon = button.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-play');
                        icon.classList.add('fa-pause');
                    }
                } catch (e) {
                    console.error("Audio playback failed for " + audioSrc, e);
                    resetButton(button);
                    currentlyPlayingButton = null;
                }
            }
        });
    });

    audioPlayer.addEventListener('ended', stopCurrentAudio);
    window.addEventListener('languageChanged', stopCurrentAudio);
}

export function initUIComponents() {
    initializeMobileMenu();
    initializeAudioDemos();
}