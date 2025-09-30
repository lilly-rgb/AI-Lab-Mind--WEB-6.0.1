import { trapFocus, releaseFocus } from './ui-components.js';

export function initCookieConsent() {
    const consentBanner = document.getElementById('cookie-consent-banner');
    const privacyCenter = document.getElementById('privacy-preference-center');
    const settingsBtn = document.getElementById('cookie-settings-btn');
    const rejectAllBtn = document.getElementById('reject-all-cookies-btn');
    const acceptAllBtn = document.getElementById('accept-all-cookies-btn');
    const acceptAllInModalBtn = document.getElementById('accept-all-in-modal-btn');
    const closePrivacyCenterBtn = document.getElementById('close-privacy-center');
    const savePreferencesBtn = document.getElementById('save-preferences-btn');

    if (!consentBanner || !privacyCenter || !settingsBtn) return;

    const performanceToggle = document.getElementById('performance-cookies');
    const functionalToggle = document.getElementById('functional-cookies');
    const targetingToggle = document.getElementById('targeting-cookies');
    const newsletterToggle = document.getElementById('newsletter-checkbox');

    const PREFERENCES_KEY = 'cookie_preferences';

    function showBanner() {
        consentBanner.classList.remove('hidden');
        setTimeout(() => consentBanner.classList.add('visible'), 50);
    }

    function hideBanner() {
        consentBanner.classList.remove('visible');
        setTimeout(() => consentBanner.classList.add('hidden'), 300);
    }

    function handleEscapeKey(event) {
        if (event.key === 'Escape') {
            hidePrivacyCenter();
            showBanner();
        }
    }

    function showPrivacyCenter() {
        privacyCenter.style.display = 'flex';
        trapFocus(privacyCenter, settingsBtn);
        document.addEventListener('keydown', handleEscapeKey);
    }

    function hidePrivacyCenter() {
        privacyCenter.style.display = 'none';
        releaseFocus();
        document.removeEventListener('keydown', handleEscapeKey);
    }

    function savePreferences(preferences) {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
        console.log('Cookie Preferences Saved:', preferences);
        hideBanner();
        hidePrivacyCenter();
    }

    settingsBtn.addEventListener('click', () => {
        hideBanner();
        showPrivacyCenter();
    });

    closePrivacyCenterBtn.addEventListener('click', () => {
        hidePrivacyCenter();
        showBanner();
    });
    
    acceptAllBtn.addEventListener('click', () => {
        const preferences = {
            necessary: true, performance: true, functional: true, targeting: true,
            newsletter: false, 
        };
        savePreferences(preferences);
    });
    
    acceptAllInModalBtn.addEventListener('click', () => {
        const preferences = {
            necessary: true, performance: true, functional: true, targeting: true,
            newsletter: newsletterToggle.checked,
        };
        savePreferences(preferences);
    });

    rejectAllBtn.addEventListener('click', () => {
        const preferences = {
            necessary: true, performance: false, functional: false, targeting: false,
            newsletter: false,
        };
        savePreferences(preferences);
    });

    savePreferencesBtn.addEventListener('click', () => {
        const preferences = {
            necessary: true,
            performance: performanceToggle.checked,
            functional: functionalToggle.checked,
            targeting: targetingToggle.checked,
            newsletter: newsletterToggle.checked,
        };
        savePreferences(preferences);
    });

    if (!localStorage.getItem(PREFERENCES_KEY)) {
        showBanner();
    }
}