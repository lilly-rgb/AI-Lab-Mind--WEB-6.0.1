
import { currentLang, getTranslation, translations } from './language.js';

let blogPosts = [];
const blogContainer = document.getElementById('blog-posts-container');
const filterButtons = document.querySelectorAll('.filter-btn');

function renderPosts(posts) {
    if (!blogContainer) return;
    blogContainer.innerHTML = '';
    if (posts.length === 0) {
        blogContainer.innerHTML = `<p class="text-center text-lg text-white/60 w-full col-span-1 md:col-span-2 lg:col-span-3">${getTranslation('blog.no-posts')}</p>`;
        return;
    }
    
    posts.forEach(post => {
        const date = new Date(post.date);
        const formattedDate = date.toLocaleDateString(currentLang === 'es' ? 'es-ES' : 'en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        const isSpanish = currentLang === 'es';
        const postTitle = isSpanish ? post.titleEs : post.titleEn;
        const postExcerpt = isSpanish ? post.descriptionEs : post.descriptionEn;
        const categoryDisplay = isSpanish ? post.categoryDisplayEs : post.categoryDisplayEn;
        const categoryClass = `btn-${post.category}`;
        const imageAlt = isSpanish ? `Imagen para ${post.titleEs}` : `Image for ${post.titleEn}`;

        const postHTML = `
            <article class="blog-card text-left flex flex-col justify-between">
                <a href="#post?id=${post.id}" class="block">
                    <div class="blog-card-image-container">
                        <img src="${post.imagePath}" alt="${imageAlt}" class="blog-card-image">
                    </div>
                </a>
                <div class="p-6 flex flex-col justify-between flex-grow">
                    <div>
                        <span class="blog-category-slug ${categoryClass}">${categoryDisplay}</span>
                        <h3 class="text-xl font-bold mt-2 mb-2">${postTitle}</h3>
                        <p class="text-sm text-white/80 mt-2">${postExcerpt}</p>
                    </div>
                    <div>
                        <span class="text-xs text-white/50 mt-4 block">${getTranslation('blog.creation-date')}: ${formattedDate}</span>
                        <a href="#post?id=${post.id}" class="text-sm font-semibold mt-2 inline-block text-white/80 hover:text-white">${getTranslation('blog.read-more')}</a>
                    </div>
                </div>
            </article>
        `;
        blogContainer.innerHTML += postHTML;
    });
}

async function fetchAndSetPosts() {
    if (blogPosts.length > 0) return;
    try {
        const response = await fetch('./data/blog-posts.json'); // Corrected path to be relative
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        blogPosts = data.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error("Could not load blog posts JSON:", error);
        if (blogContainer) {
            blogContainer.innerHTML = `<p class="text-center text-lg text-red-400 w-full col-span-1 md:col-span-2 lg:col-span-3">${getTranslation('post.load-error')}</p>`;
        }
    }
}

function filterAndRenderPosts() {
    const activeButton = document.querySelector('.filter-btn.active');
    if (!activeButton) return;
    
    const selectedCategory = activeButton.dataset.category;
    const allCategoryName = getTranslation('blog.filter-all');
    const categoryKey = currentLang === 'es' ? 'categoryDisplayEs' : 'categoryDisplayEn';

    let postsToRender;
    if (selectedCategory === allCategoryName) {
        postsToRender = blogPosts; 
    } else {
        postsToRender = blogPosts.filter(post => post[categoryKey] === selectedCategory);
    }
    renderPosts(postsToRender);
}

function updateFilterButtonCategories() {
    filterButtons.forEach(button => {
        const key = button.getAttribute('data-lang-key');
        const translatedCategory = getTranslation(key);
        if (translatedCategory) {
            button.setAttribute('data-category', translatedCategory);
        }
    });
}

export async function initBlog() {
    await fetchAndSetPosts();
    
    updateFilterButtonCategories();
    filterAndRenderPosts(); // Initial render

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterAndRenderPosts();
        });
    });

    window.addEventListener('languageChanged', () => {
        updateFilterButtonCategories();
        // Set "View All" as active and re-render to avoid inconsistent state
        filterButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector('.filter-btn[data-lang-key="blog.filter-all"]').classList.add('active');
        filterAndRenderPosts();
    });
}

export function getPostById(id) {
    return blogPosts.find(p => String(p.id) === String(id));
}

export function getAllPosts() {
    return blogPosts;
}
