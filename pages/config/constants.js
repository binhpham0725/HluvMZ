(function () {
    window.HLUV_CONFIG = {
        apiBase: '../api',
        supabase: {
            enabled: true,
            url: 'https://lckywgiojchnhleyuamg.supabase.co',
            key: 'sb_publishable_lpGw24iiZGWPqeNma9Fxdg_xkFph1Qo'
        },
        logoPath: '../assets/images/hluv-logo.png',
        placeholderImage: '../assets/images/placeholder.svg',
        defaultAvatar: 'https://i.pravatar.cc/120',
        storageKeys: {
            currentUser: 'hluv-current-user',
            theme: 'hluv-theme',
            readProgress: 'hluv-readprogress'
        },
        categories: [
            { id: '0', name: 'Tất cả' },
            { id: '1', name: 'Công nghệ' },
            { id: '2', name: 'Đời sống' },
            { id: '3', name: 'Học tập' },
            { id: '4', name: 'Giải trí' },
            { id: '5', name: 'Sự kiện' }
        ],
        navItems: [
            { href: 'index.html', label: 'Home' },
            { href: 'magazine.html', label: 'Magazine' },
            { href: 'category.html?id=0', label: 'Tin tức' },
            { href: 'about.html', label: 'Giới thiệu' },
            { href: 'search.html', label: 'Tìm kiếm' }
        ]
    };
})();
