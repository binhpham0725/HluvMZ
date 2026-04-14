(function () {
    function initFooter() {
        if (document.querySelector('.site-footer') || document.body.classList.contains('auth-page')) return;
        const footer = document.createElement('footer');
        footer.className = 'site-footer';
        footer.innerHTML = `
            <div class="container">
                <div class="site-footer-inner">
                    <strong>Tạp chí ĐH Hoa Lư</strong>
                    <span>Nền tảng tin tức học thuật, đời sống và sự kiện sinh viên.</span>
                </div>
            </div>
        `;
        document.body.appendChild(footer);
    }

    document.addEventListener('DOMContentLoaded', initFooter);
})();
