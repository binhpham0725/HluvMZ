<?php
require_once __DIR__ . '/db.php';
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($action === 'register' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResult(['error' => 'Payload invalid'], 400);

    $name = trim($body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $password = trim($body['password'] ?? '');
    $avatar = trim($body['avatar'] ?? '');

    if (!$name || !$email || !$password) {
        jsonResult(['error' => 'Yêu cầu name/email/password'], 400);
    }

    $stmt = $mysqli->prepare('SELECT id FROM users WHERE email=?');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows > 0) {
        jsonResult(['error' => 'Email đã tồn tại'], 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $mysqli->prepare('INSERT INTO users (name,email,password,avatar) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('ssss', $name, $email, $hash, $avatar);
    $stmt->execute();

    jsonResult(['success' => true, 'id' => $stmt->insert_id]);
}

if ($action === 'login' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResult(['error' => 'Payload invalid'], 400);
    $email = trim($body['email'] ?? '');
    $password = trim($body['password'] ?? '');
    if (!$email || !$password) { jsonResult(['error' => 'Email, password required'], 400);}

    $stmt = $mysqli->prepare('SELECT id,name,email,password,avatar,role FROM users WHERE email=? LIMIT 1');
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
    $stmt = $mysqli->prepare('SELECT id,name,email,avatar,bio,role,created_at,updated_at FROM users WHERE id=?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows !== 1) jsonResult(['error' => 'User not found'], 404);
    jsonResult($res->fetch_assoc());
}

if ($action === 'update' && $method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResult(['error' => 'Payload invalid'], 400);
    $id = intval($body['id'] ?? 0);
    $name = trim($body['name'] ?? '');
    $bio = trim($body['bio'] ?? '');
    $avatar = trim($body['avatar'] ?? '');
    if (!$id || !$name) jsonResult(['error' => 'id/name required'], 400);

    $stmt = $mysqli->prepare('UPDATE users SET name=?, bio=?, avatar=?, updated_at=NOW() WHERE id=?');
    $stmt->bind_param('sssi', $name, $bio, $avatar, $id);
    $stmt->execute();
    jsonResult(['success' => true, 'affected_rows' => $stmt->affected_rows]);
}

jsonResult(['error' => 'Action not found'], 404);
?>