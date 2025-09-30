

import { marked } from "marked";
import { getPostById, getAllPosts } from './blog.js';
import { currentLang, getTranslation } from './language.js';

let lastActiveLink = null;
let currentPostId = null;

function setActiveLink(hash) {
    if (lastActiveLink) {
        lastActiveLink.classList.remove('active');
    }
    const newActiveLink = document.querySelector(`.nav-links a[href="${hash}"]`);
    if (newActiveLink) {
        newActiveLink.classList.add('active');
        lastActiveLink = newActiveLink;
    }
}

function showSection(targetId) {
    document.querySelectorAll('main section.content-section').forEach(section => {
        section.classList.remove('active');
    });

    const newActiveSection = document.querySelector(targetId);
    if (newActiveSection) {
        newActiveSection.classList.add('active');
        window.scrollTo(0, 0);
    }

    setActiveLink(targetId);
    if (!targetId.startsWith('#post')) {
        currentPostId = null; 
    }
}

async function showPost(postId) {
    showSection('#post-detail');
    currentPostId = postId;

    if (getAllPosts().length === 0) {
        console.error("Blog posts not loaded yet.");
        return;
    }
    
    const post = getPostById(postId);
    const postContainer = document.getElementById('post-detail');

    if (!post || !postContainer) {
        postContainer.innerHTML = `<p>${getTranslation('post.not-found')}</p>`;
        return;
    }

    const isSpanish = currentLang === 'es';
    const postTitle = isSpanish ? post.titleEs : post.titleEn;
    const postAuthor = isSpanish ? post.authorEs : post.authorEn;
    const postMarkdown = isSpanish ? post.contentMarkdownEs : post.contentMarkdownEn;
    const categoryDisplay = isSpanish ? post.categoryDisplayEs : post.categoryDisplayEn;

    document.title = postTitle;
    document.getElementById("post-h1").textContent = postTitle;
    
    document.getElementById("post-badge-container").innerHTML = `<span class="badge badge-${post.category}">${categoryDisplay}</span>`;
    document.getElementById("post-author").textContent = `${getTranslation('post.author-prefix')} ${postAuthor}`;
    
    const date = new Date(post.date);
    const formattedDate = date.toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const postDateEl = document.getElementById("post-date");
    postDateEl.textContent = formattedDate;
    postDateEl.setAttribute('datetime', post.date);

    const featuredImage = document.getElementById("featured-image");
    featuredImage.src = post.imagePath; // Use path directly from JSON
    featuredImage.alt = `Image for ${postTitle}`;
    
    const postContentHtml = await marked.parse(postMarkdown || '');
    document.getElementById("article-content").innerHTML = postContentHtml;

    const url = window.location.href;
    document.getElementById("share-fb").href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    document.getElementById("share-tw").href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(postTitle)}`;
    document.getElementById("share-li").href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    document.getElementById("share-wa").href = `https://api.whatsapp.com/send?text=${encodeURIComponent(postTitle + ' ' + url)}`;
}
  
function handleHashChange() {
    const hash = window.location.hash;
    if (hash.startsWith('#post?id=')) {
        const postId = new URLSearchParams(hash.substring(6)).get('id');
        if (postId) {
            showPost(postId);
        } else {
            showSection('#blog');
        }
    } else {
        showSection(hash || '#home');
    }
}

export function initNavigation() {
    lastActiveLink = document.querySelector('.nav-links a[href="#home"]');

    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.hash) {
            const hash = link.hash;
            if (hash.startsWith('#')) {
                e.preventDefault();
                window.location.hash = hash;
            }
        }
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !window.location.hash.startsWith('#post?id=')) {
                setActiveLink(`#${entry.target.id}`);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('main section:not(#post-detail)').forEach(section => {
        observer.observe(section);
    });

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial load

    window.addEventListener('languageChanged', () => {
        if (currentPostId) {
            showPost(currentPostId); // Re-render post in new language
        }
    });
}
