document.addEventListener('DOMContentLoaded', () => {
    HluvPostList.init({
        articlesId: 'articles',
        filtersId: 'category-filters',
        featuredId: 'featured-cats',
        loadMoreId: 'load-more',
        pageSize: 6
    });
});
