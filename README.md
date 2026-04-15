# HLUV Magazine

Website tạp chí trực tuyến dành cho Đại học Hoa Lư, xây dựng bằng HTML/CSS/JavaScript thuần ở frontend, PHP API ở backend và MySQL/MariaDB cho database. Dự án được thiết kế để chạy trực tiếp trên XAMPP.

## Tổng Quan

| Hạng mục | Nội dung |
| --- | --- |
| Tên dự án | HLUV Magazine |
| Frontend | HTML, CSS, JavaScript |
| Backend | PHP API |
| Database | MySQL/MariaDB |
| Môi trường chạy | XAMPP |
| Database mặc định | `hluvmagazine` |
| Trang bắt đầu | `pages/index.html` |

## Chức Năng Chính

| Trang | Vai trò | Chức năng nổi bật |
| --- | --- | --- |
| Home | Trang tổng hợp và định hướng nội dung | Bài nổi bật, bài mới, xu hướng, chuyên mục nhanh, tìm kiếm nhanh |
| Magazine | Trang đọc bài tập trung | Danh sách bài viết, lọc chuyên mục, sắp xếp, giao diện dạng tạp chí |
| Tin tức | Trang theo chuyên mục | Lọc bài theo category, tiêu đề chuyên mục, đếm số bài |
| Article | Trang chi tiết bài viết | Ảnh full, reading progress bar, quay lại đầu trang, like, bookmark, chia sẻ, bình luận và trả lời bình luận |
| Profile | Trang cá nhân | Bookmark, bài đăng, đã đọc, đăng bài, đổi avatar, chỉnh hồ sơ, bảo mật tài khoản |
| Login | Xác thực tài khoản | Đăng nhập, đăng ký, validate tên tài khoản, giới tính và ngày sinh |
| Admin Rank | Trang quản trị cấp bậc | Thăng, hạ cấp tài khoản, có cấp đặc biệt `👩‍🦽 Vô Gia Cư` |

## Quyền Admin

Tài khoản `admin@webtapchi.local` được cấp quyền quản trị nội dung.

Admin có thể:

- Xóa mọi bài viết, kể cả bài viết của tài khoản khác.
- Xóa mọi bình luận, kể cả bình luận của tài khoản khác.
- Quản lý toàn bộ danh sách bài viết trong trang Profile.
- Quản lý cấp bậc và xóa tài khoản thường khi cần.
- Hiển thị avatar có hào quang và nhãn `admin` màu vàng.

File seed/dump đã cập nhật quyền admin:

```text
HluvMZ/database.sql
HluvMZ/hluvmagazine.sql
```

## Cấu Trúc Thư Mục

```text
HluvMZ/
├── api/
│   ├── bookmarks.php
│   ├── comments.php
│   ├── db.php
│   ├── likes.php
│   ├── posts.php
│   └── users.php
├── assets/
│   ├── css/
│   │   └── main.css
│   └── images/
│       ├── hluv-logo.png
│       └── placeholder.svg
├── components/
│   ├── articleCard.js
│   ├── footer.js
│   └── header.js
├── config/
│   ├── constants.js
│   └── messages.js
├── pages/
│   ├── about.html
│   ├── article.html
│   ├── category.html
│   ├── index.html
│   ├── login.html
│   ├── magazine.html
│   ├── admin-ranks.html
│   ├── post-editor.html
│   ├── profile-bookmarks.html
│   ├── profile-posts.html
│   ├── profile-reads.html
│   ├── profile.html
│   └── search.html
├── scripts/
│   ├── about.js
│   ├── article.js
│   ├── category.js
│   ├── index.js
│   ├── login.js
│   ├── magazine.js
│   ├── adminRanks.js
│   ├── postEditor.js
│   ├── profile.js
│   ├── profileBookmarks.js
│   ├── profilePosts.js
│   ├── profileReads.js
│   └── search.js
├── services/
│   ├── api.js
│   ├── authService.js
│   ├── bookmarkService.js
│   ├── commentService.js
│   ├── postService.js
│   └── userService.js
├── utils/
│   ├── helpers.js
│   ├── storage.js
│   └── validators.js
├── database.sql
├── hluvmagazine.sql
└── supabase_migration.sql
```

## Cài Đặt

Yêu cầu môi trường:

- Cài XAMPP.
- Bật Apache và MySQL trong XAMPP Control Panel.
- Dùng PHP 8.x hoặc phiên bản tương đương.
- Dùng trình duyệt hiện đại như Chrome, Edge hoặc Firefox.

Các bước chạy:

1. Đặt thư mục dự án tại:

```text
C:\xampp\htdocs\xampp\HluvMZ
```

2. Import database bằng một trong hai cách sau.

Cách 1: dùng file schema/seed gọn:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root --default-character-set=utf8mb4 < C:\xampp\htdocs\xampp\HluvMZ\database.sql
```

Cách 2: import bản dump đầy đủ qua phpMyAdmin:

```text
HluvMZ/hluvmagazine.sql
```

3. Mở website trên trình duyệt:

```text
http://localhost/xampp/HluvMZ/pages/index.html
```

## Cấu Hình Database

File cấu hình kết nối:

```text
HluvMZ/api/db.php
```

Cấu hình mặc định:

```php
$DB_HOST = '127.0.0.1';
$DB_NAME = 'hluvmagazine';
$DB_USER = 'root';
$DB_PASS = '';
```

Nếu MySQL trên máy có mật khẩu, chỉnh lại biến `$DB_PASS` trong `api/db.php`.

## Cấu Hình Supabase

Khi deploy lên Vercel với Supabase, chạy file sau trong Supabase SQL Editor:

```text
supabase_migration.sql
```

File này bổ sung:

- Cột `comments.parent_id` để trả lời bình luận dạng luồng.
- Policy cho admin cập nhật cấp bậc và xóa user thường.
- Policy cho user tạo/xóa bình luận của chính mình.

Frontend đã có cơ chế refresh Supabase session tự động. Khi token gần hết hạn hoặc Supabase trả `JWT expired`, app sẽ refresh token rồi thử lại request một lần.

## Tài Khoản Mẫu

| Email | Mật khẩu | Ghi chú |
| --- | --- | --- |
| `admin@hluv.local` | `admin123` | Tài khoản admin mẫu trong seed data |
| `admin@webtapchi.local` | Theo database hiện có | Tài khoản admin quản trị bài viết và bình luận |

## Ghi Chú Phát Triển

- `components/` chứa các phần dùng chung như header, footer và card bài viết.
- `services/` là lớp gọi API từ frontend, giúp hạn chế gọi API rải rác trong từng trang.
- `config/messages.js` chứa thông báo dùng chung để dễ chỉnh nội dung.
- `utils/validators.js` chứa logic validate, ví dụ tên tài khoản tối đa 12 ký tự và không dùng ký tự đặc biệt.
- `assets/css/main.css` chứa style tổng thể, responsive layout, avatar admin, article và profile.
- Gamification dùng các cột `xp`, `rank`, `rank_manual` trong bảng `users`.
- Reply comment dùng cột `parent_id` trong bảng `comments`.
- Không nên thêm data cứng mới vào scripts; ưu tiên lấy dữ liệu từ database qua API.

## Kiểm Tra Nhanh

Kiểm tra cú pháp PHP:

```powershell
php -l HluvMZ\api\posts.php
php -l HluvMZ\api\comments.php
php -l HluvMZ\api\users.php
```

Kiểm tra trang chạy được:

```text
http://localhost/xampp/HluvMZ/pages/article.html
```
