/**
 * Generates and retrieves a unique user ID from local storage.
 * If a user ID doesn't exist, it creates one using crypto.randomUUID()
 * and stores it in local storage.
 * @returns {string} The unique user ID.
 */
export function getOrCreateUserId() {
    let userId = localStorage.getItem('user_id');
    if (!userId) {
        // Use crypto.randomUUID() for a cryptographically secure, unique ID.
        userId = self.crypto.randomUUID();
        localStorage.setItem('user_id', userId);
    }
    return userId;
}

/**
 * Retrieves and parses cookie consent preferences from local storage.
 * @returns {object|null} The parsed cookie preferences object, or null if not found or invalid.
 */
export function getCookieConsent() {
    const preferences = localStorage.getItem('cookie_preferences');
    if (preferences) {
        try {
            return JSON.parse(preferences);
        } catch (e) {
            console.error('Error parsing cookie preferences:', e);
            return null;
        }
    }
    return null;
}