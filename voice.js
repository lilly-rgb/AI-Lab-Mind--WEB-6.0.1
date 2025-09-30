import { getOrCreateUserId, getCookieConsent } from "./utils.js";
import { getTranslation, currentLang } from "./language.js";
import { trapFocus, releaseFocus } from './ui-components.js';

const WEBSOCKET_URL = "wss://voice-iris-server.ailabmind.com";

let socket;
let recognition;
let audioQueue = [];
let isPlaying = false;
let callActive = false;
let isInitialGreeting = false;
let modal, statusText, statusIconContainer, endCallBtn, modalTitle, instructionsEl;
let phoneLinkTrigger = null;
let ringtone = null;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognitionSupported = !!SpeechRecognition;

function createVoiceModal() {
    if (document.getElementById('voice-modal')) return;

    const modalHTML = `
        <div id="voice-modal" class="modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="voice-modal-title">
          <div class="privacy-modal-content text-center">
            <div class="privacy-modal-header">
                <h3 id="voice-modal-title" data-lang-key="voice.modal-title">${getTranslation('voice.modal-title')}</h3>
            </div>
            <div class="p-8">
                <div id="voice-status-icon" class="my-6 h-16 flex items-center justify-center">
                    <i class="fas fa-microphone-alt text-5xl text-cyan-400"></i>
                </div>
                <p id="voice-modal-status" class="text-lg text-white/80 h-8 mb-2" data-lang-key="voice.status-initializing">${getTranslation('voice.status-initializing')}</p>
                <p id="voice-modal-instructions" class="text-sm text-white/60 mb-6 hidden"></p>
                <button id="end-call-btn" class="btn-purple bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg py-3 px-8 text-lg" data-lang-key="voice.end-call">
                    ${getTranslation('voice.end-call')}
                </button>
            </div>
          </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    modal = document.getElementById('voice-modal');
    statusText = document.getElementById('voice-modal-status');
    statusIconContainer = document.getElementById('voice-status-icon');
    endCallBtn = document.getElementById('end-call-btn');
    modalTitle = document.getElementById('voice-modal-title');
    instructionsEl = document.getElementById('voice-modal-instructions');

    endCallBtn.addEventListener('click', () => endCall(true));
}

function updateStatus(statusKey, iconClass = 'fa-microphone-alt') {
    if (statusText) statusText.textContent = getTranslation(statusKey);
    if (statusIconContainer) {
        statusIconContainer.innerHTML = `<i class="fas ${iconClass} text-5xl text-cyan-400"></i>`;
        if (statusKey === 'voice.status-listening') {
            statusIconContainer.firstElementChild.classList.add('animate-pulse');
        }
    }
}

function playNextInQueue() {
    if (isPlaying || audioQueue.length === 0) {
        return;
    }
    isPlaying = true;
    if (recognition) recognition.stop();
    updateStatus('voice.status-speaking', 'fa-volume-up');

    const audioData = audioQueue.shift();
    const audio = new Audio(audioData);
    audio.play();
    audio.onended = () => {
        isPlaying = false;
        // After the initial greeting, start listening.
        if (isInitialGreeting) {
            isInitialGreeting = false;
            if (callActive) {
                startRecognition();
            }
        } else if (callActive) {
            // For subsequent turns, just ensure recognition is running
            updateStatus('voice.status-listening', 'fa-microphone-alt');
            if (recognition) recognition.start();
        }
        playNextInQueue();
    };
}

function connectWebSocket() {
    socket = new WebSocket(WEBSOCKET_URL);

    socket.onopen = () => {
        const payload = {
            type: "init",
            data: {
                origin: "phone",
                channel: "voice",
                user_id: getOrCreateUserId(),
                cookies_consent: getCookieConsent(),
                user_agent: navigator.userAgent,
                lang: navigator.language || "es",
                referrer_url: document.referrer || window.location.href,
            }
        };
        socket.send(JSON.stringify(payload));
        
        // After connecting, send a special event to trigger the initial greeting from Iris.
        socket.send(JSON.stringify({ type: "init_call" }));
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'assistant_audio' && data.audio) {
                if (ringtone) {
                    ringtone.pause();
                    ringtone = null;
                }

                const audioBuffer = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
                const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
                const audioUrl = URL.createObjectURL(blob);
                audioQueue.push(audioUrl);
                playNextInQueue();
            } else if (data.type === 'status') {
                if (data.status === 'processing') {
                    updateStatus('voice.status-processing', 'fa-brain fa-fade');
                }
            }
        } catch (error) {
            console.error("Error processing WebSocket message:", error);
        }
    };

    socket.onclose = () => {
        if (callActive) {
            updateStatus('voice.status-ended', 'fa-phone-slash');
            endCall(false); 
        }
    };

    socket.onerror = (err) => {
        console.error("WebSocket Error:", err);
        updateStatus('voice.status-error', 'fa-exclamation-triangle');
        endCall(false);
    };
}

function startRecognition() {
    if (!recognitionSupported || !callActive) return;
    updateStatus('voice.status-listening', 'fa-microphone-alt');
    
    recognition = new SpeechRecognition();
    recognition.lang = currentLang;
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.trim();
        
        if (transcript && socket && socket.readyState === WebSocket.OPEN) {
            const payload = {
                type: 'user_speech',
                message: transcript,
                transcription: transcript
            };
            socket.send(JSON.stringify(payload));
            updateStatus('voice.status-processing', 'fa-brain fa-fade');
        }
    };

    recognition.onend = () => {
        if (callActive && !isPlaying) {
            recognition.start();
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
    };

    recognition.start();
}

function stopRecognition() {
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
}

function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        endCall(true);
    }
}

async function startCall() {
    if (callActive) return;

    callActive = true;
    isInitialGreeting = true; // Set flag to handle the first audio from Iris specially

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());

        modal.style.display = 'flex';
        trapFocus(modal, phoneLinkTrigger);
        document.addEventListener('keydown', handleEscapeKey);

        updateStatus('voice.status-calling', 'fa-phone-volume');
        
        ringtone = new Audio('./assets/audio/lofi-5s.mp3');
        ringtone.loop = false;

        ringtone.onended = () => {
            updateStatus('voice.status-connecting', 'fa-spinner fa-spin');
            connectWebSocket();
        };

        ringtone.play().catch(err => {
            console.error("Could not play ringtone:", err);
            updateStatus('voice.status-connecting', 'fa-spinner fa-spin');
            connectWebSocket();
        });

    } catch (err) {
        console.error('Microphone access denied:', err);
        
        modal.style.display = 'flex';
        trapFocus(modal, phoneLinkTrigger);
        document.addEventListener('keydown', handleEscapeKey);
        
        let instructionsKey;
        const userAgent = navigator.userAgent.toLowerCase();

        if (userAgent.includes('chrome') && !userAgent.includes('edge')) {
            instructionsKey = 'voice.mic-denied-instructions-chrome';
        } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
            instructionsKey = 'voice.mic-denied-instructions-safari';
        } else {
            instructionsKey = 'voice.mic-denied-instructions-generic';
        }
        
        updateStatus('voice.status-mic-denied', 'fa-microphone-slash');
        if (instructionsEl) {
            instructionsEl.innerHTML = getTranslation(instructionsKey);
            instructionsEl.classList.remove('hidden');
        }

        endCallBtn.textContent = getTranslation('voice.close-btn');
        callActive = false;
        isInitialGreeting = false;
    }
}

function endCall(userInitiated) {
    if (userInitiated && !callActive) {
        modal.style.display = 'none';
        releaseFocus();
        document.removeEventListener('keydown', handleEscapeKey);
        endCallBtn.textContent = getTranslation('voice.end-call');
        if (instructionsEl) instructionsEl.classList.add('hidden');
        return;
    }

    if (!callActive) return;

    if (userInitiated) {
      updateStatus('voice.status-ended', 'fa-phone-slash');
    }
    
    stopRecognition();
    
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
    }
    socket = null;
    
    audioQueue = [];
    isPlaying = false;
    isInitialGreeting = false;
    
    if (ringtone) {
        ringtone.pause();
        ringtone = null;
    }
    
    setTimeout(() => {
        if(modal) modal.style.display = 'none';
        releaseFocus();
        document.removeEventListener('keydown', handleEscapeKey);
        endCallBtn.textContent = getTranslation('voice.end-call');
        if (instructionsEl) instructionsEl.classList.add('hidden');
    }, userInitiated ? 1500 : 0);
    
    callActive = false;
}

export function initVoiceAssistant() {
    if (!recognitionSupported) {
        console.warn("Speech Recognition is not supported in this browser.");
        return;
    }

    createVoiceModal();

    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('.phone-link');
        if (link) {
            e.preventDefault();
            phoneLinkTrigger = link;
            startCall();
        }
    });
}