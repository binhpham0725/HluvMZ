-- Database: hluvmagazine
-- He thong tap chi online Dai hoc Hoa Lu

CREATE DATABASE IF NOT EXISTS hluvmagazine CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hluvmagazine;

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar MEDIUMTEXT NULL,
    gender VARCHAR(20) NULL,
    birthdate DATE NULL,
    bio TEXT NULL,
    role ENUM('reader','author','admin') NOT NULL DEFAULT 'reader',
    xp INT NOT NULL DEFAULT 0,
    rank VARCHAR(50) NOT NULL DEFAULT 'Bần Nông',
    rank_manual TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS posts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(260) NOT NULL,
    category VARCHAR(80) NOT NULL,
    content TEXT NOT NULL,
    excerpt VARCHAR(500) DEFAULT NULL,
    image_url MEDIUMTEXT NULL,
    status ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
    views INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bookmarks (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    post_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_post (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS likes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    post_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_like (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS comments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    parent_id INT UNSIGNED NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migration nhe cho database da tao truoc do, giup avatar/anh bai viet luu duoc Data URL.
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthdate DATE NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank VARCHAR(50) NOT NULL DEFAULT 'Bần Nông';
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank_manual TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INT UNSIGNED NULL;
ALTER TABLE users MODIFY avatar MEDIUMTEXT NULL;
ALTER TABLE posts MODIFY image_url MEDIUMTEXT NULL;

INSERT IGNORE INTO users (id,name,email,password,avatar,role) VALUES
(1,'Admin','admin@hluv.local','$2y$10$B/HeVoSTizggEw0aKiQI8O9g68ACREDkQO7Bue4A7DGVH61tS3mxC','https://i.pravatar.cc/120?img=12','admin');

-- Dam bao tai khoan mau admin@hluv.local / admin123 dung ca khi DB da co user nay.
UPDATE users
SET password='$2y$10$B/HeVoSTizggEw0aKiQI8O9g68ACREDkQO7Bue4A7DGVH61tS3mxC',
    role='admin',
    updated_at=NOW()
WHERE email='admin@hluv.local';

-- Tai khoan admin theo yeu cau co quyen xoa moi bai viet va binh luan.
UPDATE users
SET role='admin',
    updated_at=NOW()
WHERE email='admin@webtapchi.local';

INSERT IGNORE INTO posts (id,user_id,title,category,content,excerpt,image_url,status,created_at) VALUES
(1,1,'AI và giáo dục Đại học Hoa Lư 2026','Công nghệ','AI đang thay đổi cách sinh viên tìm tài liệu, luyện kỹ năng và nhận phản hồi trong quá trình học. Khi được dùng đúng cách, công nghệ này giúp cá nhân hóa lộ trình học tập và hỗ trợ giảng viên theo dõi tiến độ tốt hơn.','Nghiên cứu và ứng dụng AI cho sinh viên Đại học Hoa Lư.','https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80','published','2026-03-30 08:30:00'),
(2,1,'Kỹ năng mềm cần có để thành công','Đời sống','Bên cạnh kiến thức chuyên môn, sinh viên cần rèn luyện giao tiếp, quản lý thời gian, tư duy phản biện và khả năng làm việc nhóm. Đây là những kỹ năng giúp bạn tự tin hơn trong học tập, thực tập và công việc sau khi ra trường.','Gợi ý các kỹ năng mềm quan trọng cho sinh viên.','https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1200&q=80','published','2026-03-28 09:00:00'),
(3,1,'Lộ trình học tập môn AI năm cuối','Học tập','Một lộ trình học AI hiệu quả nên bắt đầu từ nền tảng toán, Python, xử lý dữ liệu, sau đó chuyển sang machine learning và dự án thực tế. Sinh viên nên ghi chú tiến độ theo tuần và xây dựng sản phẩm nhỏ để hiểu sâu hơn.','Lộ trình học AI theo hướng thực hành cho sinh viên năm cuối.','https://images.unsplash.com/photo-1537432376769-00a5a5f6898d?auto=format&fit=crop&w=1200&q=80','published','2026-03-29 10:15:00'),
(4,1,'Giải trí cuối tuần: sự kiện âm nhạc học đường','Giải trí','Sự kiện âm nhạc cuối tuần là dịp để sinh viên thư giãn, gặp gỡ bạn bè và tham gia các hoạt động câu lạc bộ. Không gian mở giúp mọi người kết nối và lan tỏa năng lượng tích cực sau một tuần học tập.','Sự kiện âm nhạc giúp sinh viên kết nối và thư giãn.','https://images.unsplash.com/photo-1529911098878-0d82c7fb1c68?auto=format&fit=crop&w=1200&q=80','published','2026-03-24 19:00:00'),
(5,1,'Tuyển thủ thể thao và câu chuyện cảm hứng','Đời sống','Những buổi tập sớm, lịch học dày và áp lực thi đấu tạo nên hành trình không dễ dàng cho các tuyển thủ sinh viên. Từ nỗ lực đó, họ học được kỷ luật, tinh thần đồng đội và cách vượt qua giới hạn bản thân.','Câu chuyện nỗ lực của tuyển thủ thể thao sinh viên.','https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=1200&q=80','published','2026-03-25 07:45:00'),
(6,1,'Khám phá lab Công nghệ mới của trường','Công nghệ','Phòng lab công nghệ mở ra nhiều cơ hội thực hành cho sinh viên với các chủ đề như lập trình web, dữ liệu, thiết kế giao diện và mô phỏng hệ thống. Đây là môi trường phù hợp để biến ý tưởng thành sản phẩm demo.','Không gian thực hành công nghệ dành cho sinh viên.','https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80','published','2026-03-27 14:20:00'),
(7,1,'Chiến lược thi cuối kỳ hiệu quả','Học tập','Ôn thi hiệu quả không chỉ là học nhiều giờ, mà còn là biết chia nhỏ nội dung, tự kiểm tra kiến thức và nghỉ ngơi đúng lúc. Một kế hoạch rõ ràng giúp sinh viên giảm áp lực và cải thiện kết quả.','Cách lập kế hoạch ôn thi cuối kỳ khoa học.','https://images.unsplash.com/photo-1526470498-9a1e49fda1d4?auto=format&fit=crop&w=1200&q=80','published','2026-03-26 11:00:00'),
(8,1,'Hoạt động cộng đồng: chiến dịch Xanh trường học','Sự kiện','Chiến dịch Xanh trường học khuyến khích sinh viên tham gia thiết kế poster, dọn dẹp khuôn viên và truyền thông về lối sống bền vững. Những hoạt động nhỏ tạo nên thói quen tốt cho cộng đồng.','Sinh viên cùng tham gia chiến dịch bảo vệ môi trường.','https://images.unsplash.com/photo-1505404919724-80a98f7b38c9?auto=format&fit=crop&w=1200&q=80','published','2026-03-31 15:40:00');

ALTER TABLE posts AUTO_INCREMENT = 9;
