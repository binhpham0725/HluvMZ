(function () {
    function imageSrc(post) {
        return post?.image_url || post?.image || HLUV_CONFIG.placeholderImage;
    }

    function render(post, options = {}) {
        const card = document.createElement('article');
        card.className = options.className || 'story-card';
        card.dataset.id = post.id || post.post_id || '';
        card.tabIndex = 0;
        card.innerHTML = `
            <img src="${HluvHelpers.escapeHtml(imageSrc(post))}" alt="${HluvHelpers.escapeHtml(post.title)}" onerror="this.src='${HluvHelpers.escapeHtml(HLUV_CONFIG.placeholderImage)}'">
            <div class="story-body">
                <p class="story-meta">${HluvHelpers.escapeHtml(post.category || 'Tin tức')}</p>
                <h3 class="story-title">${HluvHelpers.escapeHtml(post.title || 'Không có tiêu đề')}</h3>
                ${options.compact ? '' : `<p class="story-desc">${HluvHelpers.escapeHtml(post.excerpt || HluvHelpers.truncate(post.content))}</p>`}
                ${options.showDate === false ? '' : `<small class="story-date">${HluvHelpers.escapeHtml(HluvHelpers.formatDate(post.created_at || post.created))}</small>`}
            </div>
        `;
        const open = () => {
            window.location.href = `article.html?id=${encodeURIComponent(post.id || post.post_id)}`;
        };
        card.addEventListener('click', open);
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') open();
        });
        return card;
    }

    function initPostList(options) {
        const state = {
            posts: [],
            currentCategory: 'Tất cả',
            page: 1,
            pageSize: options.pageSize || 6,
            search: ''
        };
        const articlesEl = document.getElementById(options.articlesId || 'articles');
        const filtersEl = document.getElementById(options.filtersId || 'category-filters');
        const featuredEl = document.getElementById(options.featuredId || 'featured-cats');
        const loadMoreBtn = document.getElementById(options.loadMoreId || 'load-more');

        function filteredPosts() {
            return state.posts.filter((post) => state.currentCategory === 'Tất cả' || post.category === state.currentCategory);
        }

        function renderFilters(target, compact = false) {
            if (!target) return;
            target.innerHTML = '';
            HLUV_CONFIG.categories.forEach((category) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'chip';
                button.textContent = compact && category.name === 'Tất cả' ? 'Tất cả bài' : category.name;
                button.classList.toggle('active', category.name === state.currentCategory);
                button.addEventListener('click', () => {
                    state.currentCategory = category.name;
                    state.page = 1;
                    renderFilters(filtersEl);
                    renderFilters(featuredEl, true);
                    renderPosts(false);
                });
                target.appendChild(button);
            });
        }

        function renderPosts(append) {
            const filtered = filteredPosts();
            const start = append ? (state.page - 1) * state.pageSize : 0;
            const end = state.page * state.pageSize;
            const visible = filtered.slice(start, end);
            if (!append) articlesEl.innerHTML = '';
            if (!visible.length && !append) {
                HluvHelpers.renderState(articlesEl, HLUV_MESSAGES.emptyPosts);
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                return;
            }
            visible.forEach((post) => articlesEl.appendChild(render(post)));
            if (loadMoreBtn) loadMoreBtn.style.display = filtered.length > end ? 'inline-flex' : 'none';
        }

        async function loadPosts() {
            HluvHelpers.renderState(articlesEl, 'Đang tải bài viết...');
            try {
                state.posts = await HluvPostService.list();
                renderFilters(filtersEl);
                renderFilters(featuredEl, true);
                renderPosts(false);
            } catch (error) {
                HluvHelpers.renderState(articlesEl, error.message || HLUV_MESSAGES.loadPostsError, 'error');
                HluvHelpers.handleError(error, HLUV_MESSAGES.loadPostsError);
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            }
        }

        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                state.page += 1;
                renderPosts(true);
            });
        }
        return loadPosts();
    }

    window.HluvArticleCard = { render };
    window.HluvPostList = { init: initPostList };
})();
