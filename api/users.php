<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function publicUser(mysqli $mysqli, int $id) {
    $stmt = $mysqli->prepare('SELECT id,name,email,avatar,gender,birthdate,bio,role,created_at,updated_at FROM users WHERE id=? LIMIT 1');
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

function passwordMatches(mysqli $mysqli, int $id, string $password): bool {
    $stmt = $mysqli->prepare('SELECT password FROM users WHERE id=? LIMIT 1');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows !== 1) return false;

    $user = $res->fetch_assoc();
    return password_verify($password, $user['password']);
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

    $stmt = $mysqli->prepare('SELECT id,name,email,password,avatar,gender,birthdate,bio,role FROM users WHERE email=? LIMIT 1');
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
