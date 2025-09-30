import { getTranslation, currentLang } from './language.js';
import { getOrCreateUserId, getCookieConsent } from './utils.js';

const ORCHESTRATOR_URL = "https://n8n.ailabmind.com/webhook/orchestrator";

function handleContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${getTranslation('contact.form-sending')}`;

        const formData = new FormData(contactForm);

        // Honeypot check
        if (formData.get('bot-field')) {
            console.warn('Formulario bloqueado por honeypot.');
            contactForm.style.display = 'none';
            const formSuccessMessage = document.getElementById('contact-form-success');
            if(formSuccessMessage) {
                formSuccessMessage.classList.remove('hidden');
            }
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        
        const fullName = formData.get("name")?.trim() || "";
        const [firstName, ...lastNameParts] = fullName.split(" ");
        const lastName = lastNameParts.join(" ") || null;

        const payload = {
          origin: "contact_form",
          channel: "web",
          user_id: getOrCreateUserId(),
          full_name: fullName || null,   // 👈 el nombre completo tal cual lo escribió
          name: firstName || null,
          last_name: lastName,
          email: formData.get("email") || null,
          phone: formData.get("phone") || null,
          message: formData.get("message") || null,
          newsletter_consent: formData.get("newsletter-consent") === "on",
          cookies_consent: getCookieConsent(),
          referrer_url: document.referrer || window.location.href,
          utm_source: urlParams.get("utm_source") || null,
        };

        try {
            const response = await fetch(ORCHESTRATOR_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            contactForm.style.display = 'none';
            const formSuccessMessage = document.getElementById('contact-form-success');
            if(formSuccessMessage) {
                formSuccessMessage.classList.remove('hidden');
            }
            
            setTimeout(() => {
                contactForm.style.display = 'block';
                contactForm.reset();
                if(formSuccessMessage) {
                    formSuccessMessage.classList.add('hidden');
                }
            }, 5000);

        } catch (error) {
            console.error('Contact form submission error:', error);
            alert('Sorry, there was an error sending your message. Please try again later.');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
}

function handleNewsletterForm() {
    const newsletterForm = document.getElementById('newsletter-form');
    if (!newsletterForm) return;

    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = newsletterForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = getTranslation('footer.newsletter-subscribing');

        const formData = new FormData(newsletterForm);

        // Honeypot check
        if (formData.get('bot-field')) {
            console.warn('Suscripción a newsletter bloqueada por honeypot.');
            // Mimic success to fool the bot
            submitButton.textContent = getTranslation('footer.newsletter-subscribed');
            setTimeout(() => {
                newsletterForm.reset();
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }, 3000);
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const payload = {
            origin: "newsletter",
            email: formData.get("email"),
            newsletter_consent: formData.get("newsletter-consent") === "on",
            cookies_consent: getCookieConsent(),
            user_id: getOrCreateUserId(),
            utm_source: urlParams.get('utm_source') || 'landing_page',
            referrer_url: document.referrer || window.location.href,
        };

        try {
            const response = await fetch(ORCHESTRATOR_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    
            submitButton.textContent = getTranslation('footer.newsletter-subscribed');
            setTimeout(() => {
                newsletterForm.reset();
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }, 3000);

        } catch (error) {
            console.error('Newsletter form submission error:', error);
            alert('Sorry, there was an error subscribing. Please try again later.');
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
}

export function initForms() {
    handleContactForm();
    handleNewsletterForm();
}