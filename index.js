
import { initLanguage } from './language.js';
import { initNavigation } from './navigation.js';
import { initBlog } from './blog.js';
import { initUIComponents } from './ui-components.js';
import { initChatbot } from './chatbot.js';
import { initForms } from './forms.js';
import { initCookieConsent } from './cookies.js';
import { initWebGLBackground } from './webgl-background.js';
import { initVoiceAssistant } from "./voice.js";

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Language must be initialized first as other modules depend on it.
        initLanguage(); 
        
        // 2. Blog data needs to be fetched before navigation can show posts.
        await initBlog(); 
        
        // 3. Initialize everything else.
        initWebGLBackground();
        initNavigation();
        initUIComponents();
        initChatbot();
        initForms();
        initCookieConsent();
        initVoiceAssistant();
    } catch (error) {
        console.error("Fatal error during initialization:", error);
        document.body.innerHTML = `
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: #111; color: #ff8888; font-family: monospace; padding: 2em; z-index: 9999;">
                <h1>Application failed to start</h1>
                <p>A critical error occurred during initialization:</p>
                <pre style="background-color: #222; padding: 1em; border-radius: 8px; white-space: pre-wrap; word-break: break-all;">${error.message}\n\n${error.stack}</pre>
            </div>
        `;
    }
});