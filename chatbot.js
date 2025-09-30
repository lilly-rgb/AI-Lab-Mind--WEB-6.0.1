import { marked } from "marked";
import DOMPurify from "dompurify";
import { getTranslation, currentLang } from './language.js';
import { getOrCreateUserId, getCookieConsent } from './utils.js';
import { trapFocus, releaseFocus } from './ui-components.js';

const chatBubble = document.getElementById('chat-bubble');
const chatWidget = document.getElementById('chat-widget');
const closeChat = document.getElementById('close-chat');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const chatTypingIndicator = document.getElementById('chat-typing-indicator');

const WEBHOOK_URL = "https://n8n.ailabmind.com/webhook/orchestrator";
const WEBHOOK_HEADERS = {
  "Content-Type": "application/json",
  "x-iris-secret": "dev"
};

let isChatOpen = false;

function addMessage(sender, message) {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `chat-message ${sender}`;
    
    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';
    // Sanitize the HTML message before inserting it into the DOM to prevent XSS attacks.
    messageBubble.innerHTML = DOMPurify.sanitize(message);

    messageWrapper.appendChild(messageBubble);
    chatMessages.appendChild(messageWrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function initializeWelcomeMessage() {
    if (chatMessages.children.length > 0) return;
    const welcomeMessage = await marked.parse(getTranslation('chat.welcome'));
    addMessage('bot', welcomeMessage);
}

function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        toggleChat();
    }
}

function toggleChat() {
    isChatOpen = !isChatOpen;
    chatWidget.classList.toggle('hidden', !isChatOpen);
    if (isChatOpen) {
        initializeWelcomeMessage();
        trapFocus(chatWidget, chatBubble);
        document.addEventListener('keydown', handleEscapeKey);
    } else {
        releaseFocus();
        document.removeEventListener('keydown', handleEscapeKey);
    }
}

export function initChatbot() {
    if (!chatBubble || !chatWidget) return;
    
    chatBubble.addEventListener('click', toggleChat);
    closeChat.addEventListener('click', toggleChat);

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userInput = chatInput.value.trim();
        if (!userInput) return;

        addMessage('user', userInput);
        
        chatInput.value = '';
        chatTypingIndicator.classList.remove('hidden');
        chatInput.disabled = true;
        
        const payload = {
            message: userInput,
            origin: "web",
            channel: "chat",
            user_id: getOrCreateUserId(),
            cookies_consent: getCookieConsent(),
            user_agent: navigator.userAgent,
            lang: navigator.language || "es",
            referrer_url: document.referrer || window.location.href,
        };
        
        console.log('%c[Chatbot] Enviando petición...', 'color: #5AC8FA; font-weight: bold;');
        console.log('[Chatbot] URL:', WEBHOOK_URL);
        console.log('[Chatbot] Payload:', payload);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: WEBHOOK_HEADERS,
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            console.log('[Chatbot] Respuesta recibida del servidor:', response);

            if (!response.ok) {
                let errorDetails = `Status: ${response.status} ${response.statusText}`;
                try {
                    const errorBody = await response.json();
                    errorDetails += ` | Body: ${JSON.stringify(errorBody)}`;
                    console.error('[Chatbot] Cuerpo del error:', errorBody);
                } catch (e) {
                    // The response body might not be JSON, which is acceptable.
                }
                throw new Error(`Webhook response error. ${errorDetails}`);
            }

            const data = await response.json();
            console.log('[Chatbot] Datos de la respuesta:', data);
            const botReply = data.reply || getTranslation('chat.error'); 
            const formattedReply = await marked.parse(botReply);
            addMessage('bot', formattedReply);

        } catch (error) {
            clearTimeout(timeoutId);
            console.error("%c[Chatbot] Error en la comunicación con el webhook:", 'color: #E11D48; font-weight: bold;', error);
            
            let errorKey;
            if (error.name === 'AbortError') {
                errorKey = 'chat.timeout-error';
            } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                errorKey = 'chat.fetch-error';
            } else if (error.message.includes('Webhook response error')) {
                if (error.message.includes('Status: 404')) {
                    errorKey = 'chat.not-found-error';
                } else {
                    errorKey = 'chat.server-error';
                }
            } else {
                errorKey = 'chat.error';
            }
    
            const errorMessage = await marked.parse(getTranslation(errorKey));
            addMessage('bot', errorMessage);
        } finally {
            console.log('%c[Chatbot] Finalizando petición.', 'color: #22C55E;');
            chatTypingIndicator.classList.add('hidden');
            chatInput.disabled = false;
            chatInput.focus();
        }
    });

    window.addEventListener('languageChanged', () => {
        if (isChatOpen && chatMessages) {
            chatMessages.innerHTML = '';
            initializeWelcomeMessage();
        }
    });
}