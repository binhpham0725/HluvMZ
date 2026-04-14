<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function excerptFromContent(string $content): string {
    if (function_exists('mb_substr')) {
        return mb_substr(strip_tags($content), 0, 210);
    }
    return substr(strip_tags($content), 0, 210);
}

function isAdminUser(mysqli $mysqli, int $userId): bool {
    $stmt = $mysqli->prepare('SELECT email,role FROM users WHERE id=? LIMIT 1');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows !== 1) return false;

    $user = $res->fetch_assoc();
    return ($user['role'] ?? '') === 'admin' || strtolower($user['email'] ?? '') === 'admin@webtapchi.local';
}

function rankFromXp(int $xp): string {
    if ($xp < 20) return 'Bần Nông';
    if ($xp < 50) return 'Thường Dân';
    if ($xp < 100) return 'Học Sĩ';
    if ($xp < 200) return 'Quý Tộc';
    return 'Vương Giả';
}

function addUserXp(mysqli $mysqli, int $userId, int $amount): void {
    if ($amount <= 0) return;
    $stmt = $mysqli->prepare('SELECT role,xp,rank,rank_manual FROM users WHERE id=? LIMIT 1');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows !== 1) return;

    $user = $res->fetch_assoc();
    if (($user['role'] ?? '') === 'admin') return;
    $xp = max(0, intval($user['xp'] ?? 0) + $amount);
    $rank = intval($user['rank_manual'] ?? 0) ? ($user['rank'] ?: 'Bần Nông') : rankFromXp($xp);

    $upd = $mysqli->prepare('UPDATE users SET xp=?, rank=?, updated_at=NOW() WHERE id=?');
    $upd->bind_param('isi', $xp, $rank, $userId);
    $upd->execute();
}

if ($action === 'list' && $method === 'GET') {
    $q = trim($_GET['q'] ?? '');
    $cat = trim($_GET['category'] ?? '');
    $userId = intval($_GET['user_id'] ?? 0);

    $sql = 'SELECT p.*, u.name AS author_name, u.avatar AS author_avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = "published"';
    $params = [];
    $types = '';

    if ($q !== '') {
        $sql .= ' AND (p.title LIKE ? OR p.content LIKE ? OR p.excerpt LIKE ?)';
        $like = "%{$q}%";
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $types .= 'sss';
    }

    if ($cat !== '') {
        $sql .= ' AND p.category = ?';
        $params[] = $cat;
        $types .= 's';
    }

    if ($userId > 0) {
        $sql .= ' AND p.user_id = ?';
        $params[] = $userId;
        $types .= 'i';
    }

    $sql .= ' ORDER BY p.created_at DESC, p.id DESC';
    $stmt = $mysqli->prepare($sql);
    if ($types !== '') {
        $bindParams = [$types];
        foreach ($params as $key => &$value) {
            $bindParams[] = &$params[$key];
        }
        $stmt->bind_param(...$bindParams);
        unset($value);
    }
    $stmt->execute();
    jsonResult($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
}

if ($action === 'get' && $method === 'GET') {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) jsonResult(['error' => 'id required'], 400);

    $stmt = $mysqli->prepare('SELECT p.*, u.name AS author_name, u.avatar AS author_avatar FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id=? AND p.status = "published" LIMIT 1');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows !== 1) jsonResult(['error' => 'Post not found'], 404);

    $post = $res->fetch_assoc();
    $upd = $mysqli->prepare('UPDATE posts SET views = views + 1 WHERE id=?');
    $upd->bind_param('i', $id);
    $upd->execute();
    jsonResult($post);
}

if ($action === 'create' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResult(['error' => 'Payload invalid'], 400);

    $userId = intval($body['user_id'] ?? 0);
    $title = trim($body['title'] ?? '');
    $category = trim($body['category'] ?? '');
    $content = trim($body['content'] ?? '');
    $imageUrl = trim($body['image_url'] ?? $body['image'] ?? '');
    if (!$userId || !$title || !$category || !$content) jsonResult(['error' => 'missing fields'], 400);

    $excerpt = excerptFromContent($content);
    $stmt = $mysqli->prepare('INSERT INTO posts (user_id,title,category,content,excerpt,image_url,status) VALUES (?,?,?,?,?,?,"published")');
    $stmt->bind_param('isssss', $userId, $title, $category, $content, $excerpt, $imageUrl);
    $stmt->execute();
    addUserXp($mysqli, $userId, 10);
    jsonResult(['success' => true, 'id' => $stmt->insert_id]);
}

if ($action === 'update' && $method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResult(['error' => 'Payload invalid'], 400);

    $id = intval($body['id'] ?? 0);
    $userId = intval($body['user_id'] ?? 0);
    $title = trim($body['title'] ?? '');
    $category = trim($body['category'] ?? '');
    $content = trim($body['content'] ?? '');
    $imageUrl = trim($body['image_url'] ?? $body['image'] ?? '');
    if (!$id || !$userId || !$title || !$category || !$content) jsonResult(['error' => 'missing fields'], 400);

    $excerpt = excerptFromContent($content);
    $stmt = $mysqli->prepare('UPDATE posts SET title=?, category=?, content=?, excerpt=?, image_url=?, updated_at=NOW() WHERE id=? AND user_id=?');
    $stmt->bind_param('sssssii', $title, $category, $content, $excerpt, $imageUrl, $id, $userId);
    $stmt->execute();
    jsonResult(['success' => true, 'affected_rows' => $stmt->affected_rows]);
}

if ($action === 'delete' && $method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    $userId = intval($_GET['user_id'] ?? 0);
    if (!$id || !$userId) jsonResult(['error' => 'id/user_id required'], 400);

    if (isAdminUser($mysqli, $userId)) {
        $stmt = $mysqli->prepare('DELETE FROM posts WHERE id=?');
        $stmt->bind_param('i', $id);
    } else {
        $stmt = $mysqli->prepare('DELETE FROM posts WHERE id=? AND user_id=?');
        $stmt->bind_param('ii', $id, $userId);
    }
    $stmt->execute();
    jsonResult(['success' => true, 'deleted' => $stmt->affected_rows]);
}

jsonResult(['error' => 'Action not found'], 404);
?>
