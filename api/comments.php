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

function createNotification(mysqli $mysqli, ?int $userId, int $actorId, string $type, string $message, int $postId = 0, int $commentId = 0, int $parentCommentId = 0): void {
    if ($userId && $userId === $actorId) return;
    $exists = $mysqli->query("SHOW TABLES LIKE 'notifications'");
    if (!$exists || $exists->num_rows === 0) return;

    $actor = $mysqli->prepare('SELECT name,email FROM users WHERE id=? LIMIT 1');
    $actor->bind_param('i', $actorId);
    $actor->execute();
    $actorRow = $actor->get_result()->fetch_assoc();
    $actorName = $actorRow['name'] ?: ($actorRow['email'] ?: 'Một người dùng');

    $stmt = $mysqli->prepare('INSERT INTO notifications (user_id,actor_id,actor_name,type,post_id,comment_id,parent_comment_id,message) VALUES (?,?,?,?,?,?,?,?)');
    $stmt->bind_param('iissiiis', $userId, $actorId, $actorName, $type, $postId, $commentId, $parentCommentId, $message);
    $stmt->execute();
}

if ($action === 'list' && $method === 'GET') {
    $postId = intval($_GET['post_id'] ?? 0);
    if (!$postId) jsonResult(['error' => 'post_id required'], 400);

    $stmt = $mysqli->prepare(
        'SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at, u.name AS author_name, u.avatar AS author_avatar, u.role AS author_role, u.xp AS author_xp, u.rank AS author_rank, u.rank_manual AS author_rank_manual
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.post_id=?
         ORDER BY c.created_at ASC, c.id ASC'
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
    $parentId = intval($body['parent_id'] ?? 0);
    $content = trim($body['content'] ?? '');

    if (!$postId || !$userId || !$content) jsonResult(['error' => 'post_id/user_id/content required'], 400);
    if (function_exists('mb_strlen') ? mb_strlen($content) > 1000 : strlen($content) > 1000) {
        jsonResult(['error' => 'Bình luận tối đa 1000 ký tự'], 400);
    }
    if (!entityExists($mysqli, 'posts', $postId)) jsonResult(['error' => 'Post not found'], 404);
    if (!entityExists($mysqli, 'users', $userId)) jsonResult(['error' => 'User not found'], 404);
    if ($parentId) {
        $stmt = $mysqli->prepare('SELECT id FROM comments WHERE id=? AND post_id=? LIMIT 1');
        $stmt->bind_param('ii', $parentId, $postId);
        $stmt->execute();
        $stmt->store_result();
        if ($stmt->num_rows !== 1) jsonResult(['error' => 'Parent comment not found'], 404);
    }

    $parentValue = $parentId ?: null;
    $stmt = $mysqli->prepare('INSERT INTO comments (post_id,user_id,parent_id,content) VALUES (?,?,?,?)');
    $stmt->bind_param('iiis', $postId, $userId, $parentValue, $content);
    $stmt->execute();
    $commentId = $stmt->insert_id;

    $postStmt = $mysqli->prepare('SELECT user_id,title FROM posts WHERE id=? LIMIT 1');
    $postStmt->bind_param('i', $postId);
    $postStmt->execute();
    $post = $postStmt->get_result()->fetch_assoc();
    $postOwnerId = intval($post['user_id'] ?? 0);
    $postTitle = $post['title'] ?? 'không có tiêu đề';
    $notified = [];

    if ($parentId) {
        $parentStmt = $mysqli->prepare('SELECT user_id FROM comments WHERE id=? LIMIT 1');
        $parentStmt->bind_param('i', $parentId);
        $parentStmt->execute();
        $parent = $parentStmt->get_result()->fetch_assoc();
        $parentOwnerId = intval($parent['user_id'] ?? 0);
        if ($parentOwnerId && $parentOwnerId !== $userId) {
            createNotification($mysqli, $parentOwnerId, $userId, 'reply', 'Có người đã trả lời bình luận của bạn trong bài "'.$postTitle.'".', $postId, $commentId, $parentId);
            $notified[] = $parentOwnerId;
        }
    }

    if ($postOwnerId && $postOwnerId !== $userId && !in_array($postOwnerId, $notified, true)) {
        createNotification($mysqli, $postOwnerId, $userId, $parentId ? 'reply_on_post' : 'comment', $parentId ? 'Có người đã trả lời bình luận trong bài "'.$postTitle.'".' : 'Có người đã bình luận bài viết "'.$postTitle.'".', $postId, $commentId, $parentId);
    }

    jsonResult(['success' => true, 'id' => $commentId]);
}

if ($action === 'delete' && $method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    $userId = intval($_GET['user_id'] ?? 0);
    if (!$id || !$userId) jsonResult(['error' => 'id/user_id required'], 400);

    $isAdmin = isAdminUser($mysqli, $userId);
    if (!$isAdmin) {
        $ownStmt = $mysqli->prepare('SELECT id FROM comments WHERE id=? AND user_id=? LIMIT 1');
        $ownStmt->bind_param('ii', $id, $userId);
        $ownStmt->execute();
        $ownStmt->store_result();
        if ($ownStmt->num_rows !== 1) jsonResult(['error' => 'Forbidden'], 403);
    }

    $replyStmt = $mysqli->prepare('DELETE FROM comments WHERE parent_id=?');
    $replyStmt->bind_param('i', $id);
    $replyStmt->execute();

    if ($isAdmin) {
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
