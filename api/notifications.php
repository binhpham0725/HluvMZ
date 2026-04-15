<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function notificationsTableExists(mysqli $mysqli): bool {
    $res = $mysqli->query("SHOW TABLES LIKE 'notifications'");
    return $res && $res->num_rows > 0;
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
    $userId = intval($_GET['user_id'] ?? 0);
    if (!$userId) jsonResult(['error' => 'user_id required'], 400);
    if (!notificationsTableExists($mysqli)) jsonResult([]);

    $stmt = $mysqli->prepare(
        'SELECT *
         FROM notifications
         WHERE user_id=? OR user_id IS NULL
         ORDER BY created_at DESC, id DESC
         LIMIT 30'
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    jsonResult($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
}

if ($action === 'read' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $userId = intval($body['user_id'] ?? 0);
    if (!$userId) jsonResult(['error' => 'user_id required'], 400);
    if (!notificationsTableExists($mysqli)) jsonResult(['success' => true]);

    $stmt = $mysqli->prepare('UPDATE notifications SET is_read=1 WHERE user_id=? AND is_read=0');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    jsonResult(['success' => true]);
}

if ($action === 'broadcast' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $adminId = intval($body['admin_id'] ?? 0);
    $message = trim($body['message'] ?? '');
    if (!$adminId || !$message) jsonResult(['error' => 'admin_id/message required'], 400);
    if (!isAdminUser($mysqli, $adminId)) jsonResult(['error' => 'Admin required'], 403);
    if (!notificationsTableExists($mysqli)) jsonResult(['error' => 'Bảng notifications chưa tồn tại'], 500);

    $stmt = $mysqli->prepare('SELECT name,email FROM users WHERE id=? LIMIT 1');
    $stmt->bind_param('i', $adminId);
    $stmt->execute();
    $admin = $stmt->get_result()->fetch_assoc();
    $actorName = $admin['name'] ?: ($admin['email'] ?: 'Admin');

    $stmt = $mysqli->prepare('INSERT INTO notifications (user_id,actor_id,actor_name,type,message) VALUES (NULL,?,?, "admin", ?)');
    $stmt->bind_param('iss', $adminId, $actorName, $message);
    $stmt->execute();
    jsonResult(['success' => true, 'id' => $stmt->insert_id]);
}

jsonResult(['error' => 'Action not found'], 404);
?>
