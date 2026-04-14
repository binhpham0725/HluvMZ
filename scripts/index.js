const categories = ['Tất cả', 'Công nghệ', 'Đời sống', 'Học tập', 'Giải trí', 'Sự kiện'];

const articles = document.getElementById('articles');
const featuredArticles = document.getElementById('featured-articles');
const technologyPosts = document.getElementById('technology-posts');
const lifePosts = document.getElementById('life-posts');
const trendingPosts = document.getElementById('trending-posts');
const filters = document.getElementById('category-filters');
const featuredCats = document.getElementById('featured-cats');

const loadMoreBtn = document.getElementById('load-more');
const backTopBtn = document.getElementById('back-top');
const themeToggle = document.getElementById('theme-toggle');
const progressBar = document.getElementById('reading-progress');
const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.querySelector('.nav-links');

const quickSearchInput = document.getElementById('quick-search-input');
const quickSearchBtn = document.getElementById('quick-search-btn');

const heroBanner = document.getElementById('hero-banner');
const heroTitle = document.getElementById('hero-title');
const heroDesc = document.getElementById('hero-desc');

let allPosts = [];
let shown = [];
let page = 1;
const pageSize = 6;

function escapeHtml(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr = '') {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN');
}

function getImage(post) {
    return post.image_url || post.image || '../images/placeholder.svg';
}

function getContent(post) {
    return post.excerpt || post.content || '';
}

function renderEmpty(container, text) {
    container.innerHTML = `<div class="empty-box">${text}</div>`;
}

function createCard(post) {
    const imgSrc = getImage(post);
    const createdAt = post.created_at || post.created || '';
    return `
        <article class="story-card" data-id="${post.id}">
            <img src="${imgSrc}" alt="${escapeHtml(post.title || '')}" onerror="this.src='../images/placeholder.svg'">
            <div class="story-body">
                <p class="story-meta">${escapeHtml(post.category || '')}</p>
                <h3 class="story-title">${escapeHtml(post.title || '')}</h3>
                <p class="story-desc">${escapeHtml(getContent(post)).slice(0, 120)}</p>
                <small class="muted-text">${formatDate(createdAt)}</small>
            </div>
        </article>
    `;
}

function createFeaturedCard(post) {
    const imgSrc = getImage(post);
    return `
        <article class="featured-card" data-id="${post.id}">
            <img src="${imgSrc}" alt="${escapeHtml(post.title || '')}" onerror="this.src='../images/placeholder.svg'">
            <div class="story-body">
                <p class="story-meta">${escapeHtml(post.category || '')}</p>
                <h3 class="story-title">${escapeHtml(post.title || '')}</h3>
                <p class="story-desc">${escapeHtml(getContent(post)).slice(0, 140)}</p>
                <small class="muted-text">${formatDate(post.created_at || post.created || '')}</small>
            </div>
        </article>
    `;
}

function createMiniPost(post) {
    const imgSrc = getImage(post);
    return `
        <a class="mini-post-item" href="article.html?id=${post.id}">
            <img src="${imgSrc}" alt="${escapeHtml(post.title || '')}" onerror="this.src='../images/placeholder.svg'">
            <div>
                <p class="story-meta">${escapeHtml(post.category || '')}</p>
                <h4 class="mini-title">${escapeHtml(post.title || '')}</h4>
                <small class="muted-text">${formatDate(post.created_at || post.created || '')}</small>
            </div>
        </a>
    `;
}

function createTrending(post, index) {
    return `
        <a class="trending-item" href="article.html?id=${post.id}">
            <span class="trend-no">${String(index + 1).padStart(2, '0')}</span>
            <div>
                <p class="story-meta">${escapeHtml(post.category || '')}</p>
                <h4 class="mini-title">${escapeHtml(post.title || '')}</h4>
            </div>
        </a>
    `;
}

function bindCardClick(container) {
    container.addEventListener('click', (e) => {
        const card = e.target.closest('[data-id]');
        if (!card) return;
        const { id } = card.dataset;
        if (id) {
            location.href = `article.html?id=${id}`;
        }
    });
}

function renderFilters() {
    filters.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'chip';
        btn.innerText = cat;
        btn.onclick = () => applyCategory(cat);
        filters.appendChild(btn);
    });
}

function renderFeaturedCategories() {
    featuredCats.innerHTML = '';
    categories.slice(1).forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'chip';
        btn.innerText = cat;
        btn.onclick = () => applyCategory(cat);
        featuredCats.appendChild(btn);
    });
}

function getPageData() {
    const start = (page - 1) * pageSize;
    return shown.slice(start, start + pageSize);
}

function renderLatest(append = false) {
    const chunk = getPageData();

    if (!append) articles.innerHTML = '';

    if (!chunk.length && page === 1) {
        renderEmpty(articles, 'Không có bài viết để hiển thị.');
        loadMoreBtn.style.display = 'none';
        return;
    }

    chunk.forEach(item => {
        articles.insertAdjacentHTML('beforeend', createCard(item));
    });

    loadMoreBtn.style.display = shown.length > page * pageSize ? 'inline-flex' : 'none';
}

function renderFeaturedSection() {
    const featured = allPosts.slice(0, 3);
    if (!featured.length) {
        renderEmpty(featuredArticles, 'Chưa có bài viết nổi bật.');
        return;
    }
    featuredArticles.innerHTML = featured.map(createFeaturedCard).join('');
}

function renderTechnologySection() {
    const tech = allPosts.filter(i => (i.category || '').trim() === 'Công nghệ').slice(0, 3);
    if (!tech.length) {
        renderEmpty(technologyPosts, 'Chưa có bài viết công nghệ.');
        return;
    }
    technologyPosts.innerHTML = tech.map(createCard).join('');
}

function renderLifeSection() {
    const life = allPosts.filter(i => (i.category || '').trim() === 'Đời sống').slice(0, 4);
    if (!life.length) {
        renderEmpty(lifePosts, 'Chưa có bài viết đời sống.');
        return;
    }
    lifePosts.innerHTML = life.map(createMiniPost).join('');
}

function renderTrendingSection() {
    const trending = allPosts.slice(0, 5);
    if (!trending.length) {
        renderEmpty(trendingPosts, 'Chưa có dữ liệu xu hướng.');
        return;
    }
    trendingPosts.innerHTML = trending.map((post, index) => createTrending(post, index)).join('');
}

function renderHero() {
    const post = allPosts[0];
    if (!post) return;

    heroTitle.textContent = post.title || 'Website Tạp Chí Đại học Hoa Lư';
    heroDesc.textContent = (getContent(post) || 'Chào mừng bạn đến với nền tảng nội dung dành cho sinh viên.').slice(0, 180);

    const imgSrc = getImage(post);
    heroBanner.style.backgroundImage = `
        linear-gradient(to right, rgba(15,23,42,.86), rgba(15,23,42,.58)),
        url('${imgSrc}')
    `;
    heroBanner.style.backgroundSize = 'cover';
    heroBanner.style.backgroundPosition = 'center';
}

function applyCategory(cat) {
    page = 1;
    shown = cat === 'Tất cả'
        ? [...allPosts]
        : allPosts.filter(i => (i.category || '').trim() === cat);

    renderLatest(false);
}

async function fetchPosts() {
    try {
        const response = await fetch('../api/posts.php?action=list');
        const text = await response.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error('API không trả về JSON hợp lệ.');
        }

        if (!Array.isArray(data)) {
            throw new Error(data.error || 'Dữ liệu bài viết không hợp lệ.');
        }

        allPosts = data;
        shown = [...allPosts];

        renderHero();
        renderFeaturedSection();
        renderTrendingSection();
        renderTechnologySection();
        renderLifeSection();
        renderLatest(false);
    } catch (error) {
        console.error(error);
        renderEmpty(featuredArticles, error.message);
        renderEmpty(articles, error.message);
        renderEmpty(technologyPosts, error.message);
        renderEmpty(lifePosts, error.message);
        renderEmpty(trendingPosts, error.message);
    }
}

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
});

loadMoreBtn.addEventListener('click', () => {
    page++;
    renderLatest(true);
});

quickSearchBtn.addEventListener('click', () => {
    const keyword = quickSearchInput.value.trim();
    if (!keyword) return;
    location.href = `search.html?q=${encodeURIComponent(keyword)}`;
});

quickSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        quickSearchBtn.click();
    }
});

backTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    themeToggle.innerText = next === 'dark' ? 'Light Mode' : 'Dark Mode';
    localStorage.setItem('hluv-theme', next);
});

window.addEventListener('scroll', () => {
    const max = document.body.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    progressBar.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;
    backTopBtn.style.display = window.scrollY > 360 ? 'block' : 'none';
});

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('hluv-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    themeToggle.innerText = saved === 'dark' ? 'Light Mode' : 'Dark Mode';

    renderFilters();
    renderFeaturedCategories();
    fetchPosts();

    bindCardClick(articles);
    bindCardClick(featuredArticles);
    bindCardClick(technologyPosts);
});