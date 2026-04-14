<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function entityExists(mysqli $mysqli, string $table, int $id): bool {
    $allowedTables = ['posts', 'users'];
    if (!in_array($table, $allowedTables, true)) return false;

    $stmt = $mysqli->prepare("SELECT id FROM {$table} WHERE id=? LIMIT 1");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->store_result();
    return $stmt->num_rows === 1;
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

if ($action === 'list' && $method === 'GET') {
    $postId = intval($_GET['post_id'] ?? 0);
    if (!$postId) jsonResult(['error' => 'post_id required'], 400);

    $stmt = $mysqli->prepare(
        'SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.name AS author_name, u.avatar AS author_avatar, u.role AS author_role, u.xp AS author_xp, u.rank AS author_rank, u.rank_manual AS author_rank_manual
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.post_id=?
         ORDER BY c.created_at DESC, c.id DESC'
    );
    $stmt->bind_param('i', $postId);
    $stmt->execute();
    jsonResult($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
}

if ($action === 'create' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResult(['error' => 'Payload invalid'], 400);

    $postId = intval($body['post_id'] ?? 0);
    $userId = intval($body['user_id'] ?? 0);
    $content = trim($body['content'] ?? '');

    if (!$postId || !$userId || !$content) jsonResult(['error' => 'post_id/user_id/content required'], 400);
    if (function_exists('mb_strlen') ? mb_strlen($content) > 1000 : strlen($content) > 1000) {
        jsonResult(['error' => 'Bình luận tối đa 1000 ký tự'], 400);
    }
    if (!entityExists($mysqli, 'posts', $postId)) jsonResult(['error' => 'Post not found'], 404);
    if (!entityExists($mysqli, 'users', $userId)) jsonResult(['error' => 'User not found'], 404);

    $stmt = $mysqli->prepare('INSERT INTO comments (post_id,user_id,content) VALUES (?,?,?)');
    $stmt->bind_param('iis', $postId, $userId, $content);
    $stmt->execute();

    jsonResult(['success' => true, 'id' => $stmt->insert_id]);
}

if ($action === 'delete' && $method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    $userId = intval($_GET['user_id'] ?? 0);
    if (!$id || !$userId) jsonResult(['error' => 'id/user_id required'], 400);

    if (isAdminUser($mysqli, $userId)) {
        $stmt = $mysqli->prepare('DELETE FROM comments WHERE id=?');
        $stmt->bind_param('i', $id);
    } else {
        $stmt = $mysqli->prepare('DELETE FROM comments WHERE id=? AND user_id=?');
        $stmt->bind_param('ii', $id, $userId);
    }
    $stmt->execute();

    jsonResult(['success' => true, 'deleted' => $stmt->affected_rows]);
}

jsonResult(['error' => 'Action not found'], 404);
?>
