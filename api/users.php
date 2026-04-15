<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function publicUser(mysqli $mysqli, int $id) {
    $stmt = $mysqli->prepare('SELECT id,name,email,avatar,gender,birthdate,bio,role,xp,rank,rank_manual,created_at,updated_at FROM users WHERE id=? LIMIT 1');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $res = $stmt->get_result();
    return $res->num_rows === 1 ? $res->fetch_assoc() : null;
}

function normalizeGender(?string $gender): ?string {
    $gender = trim((string) $gender);
    $allowed = ['Nam', 'Nữ', 'Khác'];
    return in_array($gender, $allowed, true) ? $gender : null;
}

function normalizeBirthdate(?string $birthdate): ?string {
    $birthdate = trim((string) $birthdate);
    if ($birthdate === '') return null;
    $date = DateTime::createFromFormat('Y-m-d', $birthdate);
    return $date && $date->format('Y-m-d') === $birthdate ? $birthdate : null;
}

function isValidAccountName(string $name): bool {
    return preg_match('/^[\p{L}\p{N}\s]{1,12}$/u', $name) === 1;
}

function passwordMatches(mysqli $mysqli, int $id, string $password): bool {
    $stmt = $mysqli->prepare('SELECT password FROM users WHERE id=? LIMIT 1');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows !== 1) return false;

    $user = $res->fetch_assoc();
    return password_verify($password, $user['password']);
}

function rankCatalog(): array {
    return [
        'Vô Gia Cư' => ['icon' => '👩‍🦽', 'min_xp' => 0],
        'Lọ Vương' => ['icon' => '👑', 'min_xp' => 0],
        'Bần Nông' => ['icon' => '🌱', 'min_xp' => 0],
        'Thường Dân' => ['icon' => '🧑‍🌾', 'min_xp' => 20],
        'Học Sĩ' => ['icon' => '🎓', 'min_xp' => 50],
        'Quý Tộc' => ['icon' => '🏰', 'min_xp' => 100],
        'Vương Giả' => ['icon' => '👑', 'min_xp' => 200],
    ];
}

function rankFromXp(int $xp): string {
    if ($xp < 20) return 'Bần Nông';
    if ($xp < 50) return 'Thường Dân';
    if ($xp < 100) return 'Học Sĩ';
    if ($xp < 200) return 'Quý Tộc';
    return 'Vương Giả';
}

function normalizeRank(string $rank): ?string {
    $rank = trim($rank);
    return array_key_exists($rank, rankCatalog()) ? $rank : null;
}

function isAdminUser(mysqli $mysqli, int $id): bool {
    $stmt = $mysqli->prepare('SELECT email,role FROM users WHERE id=? LIMIT 1');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows !== 1) return false;

    $user = $res->fetch_assoc();
    return ($user['role'] ?? '') === 'admin' || strtolower($user['email'] ?? '') === 'admin@webtapchi.local';
}

function addUserXp(mysqli $mysqli, int $userId, int $amount): ?array {
    if ($amount <= 0) return publicUser($mysqli, $userId);

    $stmt = $mysqli->prepare('SELECT id,role,xp,rank,rank_manual FROM users WHERE id=? LIMIT 1');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows !== 1) return null;

    $user = $res->fetch_assoc();
    if (($user['role'] ?? '') === 'admin') return publicUser($mysqli, $userId);

    $xp = max(0, intval($user['xp'] ?? 0) + $amount);
    $rankManual = intval($user['rank_manual'] ?? 0);
    $rank = $rankManual ? ($user['rank'] ?: 'Bần Nông') : rankFromXp($xp);

    $upd = $mysqli->prepare('UPDATE users SET xp=?, rank=?, updated_at=NOW() WHERE id=?');
    $upd->bind_param('isi', $xp, $rank, $userId);
    $upd->execute();

    return publicUser($mysqli, $userId);
}

if ($action === 'register' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResult(['error' => 'Payload invalid'], 400);

    $name = trim($body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $password = trim($body['password'] ?? '');
    $avatar = trim($body['avatar'] ?? '');
    $gender = normalizeGender($body['gender'] ?? '');
    $birthdate = normalizeBirthdate($body['birthdate'] ?? '');

    if (!$name || !$email || !$password) jsonResult(['error' => 'Yêu cầu name/email/password'], 400);
    if (!isValidAccountName($name)) jsonResult(['error' => 'Tên tài khoản tối đa 12 ký tự và không dùng ký tự đặc biệt'], 400);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonResult(['error' => 'Email không hợp lệ'], 400);
    if (isset($body['gender']) && trim((string) $body['gender']) !== '' && !$gender) jsonResult(['error' => 'Giới tính không hợp lệ'], 400);
    if (isset($body['birthdate']) && trim((string) $body['birthdate']) !== '' && !$birthdate) jsonResult(['error' => 'Ngày sinh không hợp lệ'], 400);

    $stmt = $mysqli->prepare('SELECT id FROM users WHERE email=?');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows > 0) jsonResult(['error' => 'Email đã tồn tại'], 409);

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $mysqli->prepare('INSERT INTO users (name,email,password,avatar,gender,birthdate) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->bind_param('ssssss', $name, $email, $hash, $avatar, $gender, $birthdate);
    $stmt->execute();

    jsonResult(['success' => true, 'id' => $stmt->insert_id]);
}

if ($action === 'login' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResult(['error' => 'Payload invalid'], 400);

    $email = trim($body['email'] ?? '');
    $password = trim($body['password'] ?? '');
    if (!$email || !$password) jsonResult(['error' => 'Email, password required'], 400);

    $stmt = $mysqli->prepare('SELECT id,name,email,password,avatar,gender,birthdate,bio,role,xp,rank,rank_manual FROM users WHERE email=? LIMIT 1');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows !== 1) jsonResult(['error' => 'Tài khoản không tồn tại'], 404);

    $user = $res->fetch_assoc();
    if (!password_verify($password, $user['password'])) jsonResult(['error' => 'Mật khẩu sai'], 401);

    unset($user['password']);
    session_start();
    $_SESSION['user'] = $user;
    jsonResult(['success' => true, 'user' => $user]);
}

if ($action === 'profile' && $method === 'GET') {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) jsonResult(['error' => 'id required'], 400);

    $user = publicUser($mysqli, $id);
    if (!$user) jsonResult(['error' => 'User not found'], 404);
    jsonResult($user);
}

if ($action === 'rank-catalog' && $method === 'GET') {
    jsonResult(rankCatalog());
}

if ($action === 'list' && $method === 'GET') {
    $adminId = intval($_GET['admin_id'] ?? 0);
    if (!$adminId || !isAdminUser($mysqli, $adminId)) jsonResult(['error' => 'Admin required'], 403);

    $res = $mysqli->query('SELECT id,name,email,avatar,role,xp,rank,rank_manual,created_at,updated_at FROM users ORDER BY role="admin" DESC, id ASC');
    jsonResult($res->fetch_all(MYSQLI_ASSOC));
}

if ($action === 'stats' && $method === 'GET') {
    $userId = intval($_GET['user_id'] ?? 0);
    if (!$userId) jsonResult(['error' => 'user_id required'], 400);

    $stats = [
        'posts' => 0,
        'bookmarks' => 0,
        'likes' => 0,
        'total_views' => 0,
        'max_post_views' => 0,
        'received_bookmarks' => 0,
        'bookmark_categories' => 0,
    ];

    $stmt = $mysqli->prepare('SELECT COUNT(*) AS posts, COALESCE(SUM(views),0) AS total_views, COALESCE(MAX(views),0) AS max_post_views FROM posts WHERE user_id=? AND status="published"');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stats['posts'] = intval($row['posts'] ?? 0);
    $stats['total_views'] = intval($row['total_views'] ?? 0);
    $stats['max_post_views'] = intval($row['max_post_views'] ?? 0);

    $stmt = $mysqli->prepare('SELECT COUNT(*) AS bookmarks FROM bookmarks WHERE user_id=?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $stats['bookmarks'] = intval($stmt->get_result()->fetch_assoc()['bookmarks'] ?? 0);

    $stmt = $mysqli->prepare('SELECT COUNT(*) AS likes FROM likes WHERE user_id=?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $stats['likes'] = intval($stmt->get_result()->fetch_assoc()['likes'] ?? 0);

    $stmt = $mysqli->prepare('SELECT COUNT(DISTINCT p.category) AS cats FROM bookmarks b JOIN posts p ON p.id=b.post_id WHERE b.user_id=?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $stats['bookmark_categories'] = intval($stmt->get_result()->fetch_assoc()['cats'] ?? 0);

    $stmt = $mysqli->prepare('SELECT COUNT(*) AS received FROM bookmarks b JOIN posts p ON p.id=b.post_id WHERE p.user_id=? AND b.user_id<>?');
    $stmt->bind_param('ii', $userId, $userId);
    $stmt->execute();
    $stats['received_bookmarks'] = intval($stmt->get_result()->fetch_assoc()['received'] ?? 0);

    jsonResult($stats);
}

if ($action === 'add_xp' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResult(['error' => 'Payload invalid'], 400);

    $userId = intval($body['user_id'] ?? 0);
    $xp = intval($body['xp'] ?? 0);
    if (!$userId || $xp <= 0) jsonResult(['error' => 'user_id/xp required'], 400);

    $user = addUserXp($mysqli, $userId, $xp);
    if (!$user) jsonResult(['error' => 'User not found'], 404);
    jsonResult(['success' => true, 'user' => $user]);
}

if ($action === 'update_rank' && ($method === 'POST' || $method === 'PUT')) {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResult(['error' => 'Payload invalid'], 400);

    $adminId = intval($body['admin_id'] ?? 0);
    $userId = intval($body['user_id'] ?? 0);
    $rankInput = trim($body['rank'] ?? '');
    if (!$adminId || !$userId || !$rankInput) jsonResult(['error' => 'admin_id/user_id/rank required'], 400);
    if (!isAdminUser($mysqli, $adminId)) jsonResult(['error' => 'Admin required'], 403);
    if (isAdminUser($mysqli, $userId)) jsonResult(['error' => 'Không chỉnh cấp tài khoản admin'], 400);

    if ($rankInput === 'auto') {
        $stmt = $mysqli->prepare('SELECT xp FROM users WHERE id=? LIMIT 1');
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res->num_rows !== 1) jsonResult(['error' => 'User not found'], 404);
        $rank = rankFromXp(intval($res->fetch_assoc()['xp'] ?? 0));
        $manual = 0;
    } else {
        $rank = normalizeRank($rankInput);
        if (!$rank) jsonResult(['error' => 'Rank invalid'], 400);
        $manual = 1;
    }

    $stmt = $mysqli->prepare('UPDATE users SET rank=?, rank_manual=?, updated_at=NOW() WHERE id=?');
    $stmt->bind_param('sii', $rank, $manual, $userId);
    $stmt->execute();
    jsonResult(['success' => true, 'user' => publicUser($mysqli, $userId)]);
}

if ($action === 'delete' && $method === 'DELETE') {
    $adminId = intval($_GET['admin_id'] ?? 0);
    $userId = intval($_GET['user_id'] ?? 0);
    if (!$adminId || !$userId) jsonResult(['error' => 'admin_id/user_id required'], 400);
    if (!isAdminUser($mysqli, $adminId)) jsonResult(['error' => 'Admin required'], 403);
    if ($adminId === $userId) jsonResult(['error' => 'Không thể tự xóa tài khoản đang đăng nhập'], 400);

    $target = publicUser($mysqli, $userId);
    if (!$target) jsonResult(['error' => 'User not found'], 404);
    if (($target['role'] ?? '') === 'admin' || strtolower($target['email'] ?? '') === 'admin@webtapchi.local') {
        jsonResult(['error' => 'Không thể xóa tài khoản admin'], 400);
    }

    $mysqli->begin_transaction();
    try {
        $stmt = $mysqli->prepare('DELETE c FROM comments c JOIN posts p ON p.id=c.post_id WHERE p.user_id=?');
        $stmt->bind_param('i', $userId);
        $stmt->execute();

        $stmt = $mysqli->prepare('DELETE l FROM likes l JOIN posts p ON p.id=l.post_id WHERE p.user_id=?');
        $stmt->bind_param('i', $userId);
        $stmt->execute();

        $stmt = $mysqli->prepare('DELETE b FROM bookmarks b JOIN posts p ON p.id=b.post_id WHERE p.user_id=?');
        $stmt->bind_param('i', $userId);
        $stmt->execute();

        $stmt = $mysqli->prepare('DELETE FROM comments WHERE user_id=?');
        $stmt->bind_param('i', $userId);
        $stmt->execute();

        $stmt = $mysqli->prepare('DELETE FROM likes WHERE user_id=?');
        $stmt->bind_param('i', $userId);
        $stmt->execute();

        $stmt = $mysqli->prepare('DELETE FROM bookmarks WHERE user_id=?');
        $stmt->bind_param('i', $userId);
        $stmt->execute();

        $stmt = $mysqli->prepare('DELETE FROM posts WHERE user_id=?');
        $stmt->bind_param('i', $userId);
        $stmt->execute();

        $stmt = $mysqli->prepare('DELETE FROM users WHERE id=?');
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $deleted = $stmt->affected_rows;

        $mysqli->commit();
        jsonResult(['success' => true, 'deleted' => $deleted]);
    } catch (Throwable $error) {
        $mysqli->rollback();
        jsonResult(['error' => 'Không xóa được tài khoản'], 500);
    }
}

if ($action === 'update' && $method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResult(['error' => 'Payload invalid'], 400);

    $id = intval($body['id'] ?? 0);
    $name = trim($body['name'] ?? '');
    $bio = trim($body['bio'] ?? '');
    $avatar = trim($body['avatar'] ?? '');
    $gender = normalizeGender($body['gender'] ?? '');
    $birthdate = normalizeBirthdate($body['birthdate'] ?? '');
    if (!$id || !$name) jsonResult(['error' => 'id/name required'], 400);
    if (!isValidAccountName($name)) jsonResult(['error' => 'Tên tài khoản tối đa 12 ký tự và không dùng ký tự đặc biệt'], 400);
    if (isset($body['gender']) && trim((string) $body['gender']) !== '' && !$gender) jsonResult(['error' => 'Giới tính không hợp lệ'], 400);
    if (isset($body['birthdate']) && trim((string) $body['birthdate']) !== '' && !$birthdate) jsonResult(['error' => 'Ngày sinh không hợp lệ'], 400);

    $stmt = $mysqli->prepare('UPDATE users SET name=?, bio=?, avatar=?, gender=?, birthdate=?, updated_at=NOW() WHERE id=?');
    $stmt->bind_param('sssssi', $name, $bio, $avatar, $gender, $birthdate, $id);
    $stmt->execute();

    $user = publicUser($mysqli, $id);
    jsonResult(['success' => true, 'affected_rows' => $stmt->affected_rows, 'user' => $user]);
}

if ($action === 'verify-password' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResult(['error' => 'Payload invalid'], 400);

    $id = intval($body['id'] ?? 0);
    $password = trim($body['password'] ?? '');
    if (!$id || !$password) jsonResult(['error' => 'id/password required'], 400);
    if (!passwordMatches($mysqli, $id, $password)) jsonResult(['error' => 'Mật khẩu hiện tại không đúng'], 401);

    jsonResult(['success' => true]);
}

if ($action === 'change-password' && $method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResult(['error' => 'Payload invalid'], 400);

    $id = intval($body['id'] ?? 0);
    $currentPassword = trim($body['current_password'] ?? '');
    $newPassword = trim($body['new_password'] ?? '');
    if (!$id || !$currentPassword || !$newPassword) jsonResult(['error' => 'id/current_password/new_password required'], 400);
    if (strlen($newPassword) < 6) jsonResult(['error' => 'Mật khẩu mới tối thiểu 6 ký tự'], 400);
    if (!passwordMatches($mysqli, $id, $currentPassword)) jsonResult(['error' => 'Mật khẩu hiện tại không đúng'], 401);

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $mysqli->prepare('UPDATE users SET password=?, updated_at=NOW() WHERE id=?');
    $stmt->bind_param('si', $hash, $id);
    $stmt->execute();

    jsonResult(['success' => true, 'affected_rows' => $stmt->affected_rows]);
}

jsonResult(['error' => 'Action not found'], 404);
?>
