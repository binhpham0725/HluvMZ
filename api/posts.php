<?php
require_once __DIR__ . '/db.php';
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($action === 'list' && $method === 'GET') {
    $q = trim($_GET['q'] ?? '');
    $cat = trim($_GET['category'] ?? '');
    $sql = 'SELECT p.*, u.name AS author_name, u.avatar AS author_avatar FROM posts p JOIN users u ON p.user_id = u.id WHERE p.status = "published"';
    $params = [];
    if ($q) { $sql .= ' AND (p.title LIKE ? OR p.content LIKE ?)'; $qlike = "%{$q}%"; $params[] = &$qlike; $params[] = &$qlike; }
    if ($cat) { $sql .= ' AND p.category = ?'; $params[] = &$cat; }
    $sql .= ' ORDER BY p.created_at DESC';

    $stmt = $mysqli->prepare($sql);
    if (!empty($params)) { $types = str_repeat('s', count($params)); $stmt->bind_param($types, ...$params); }
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = $result->fetch_all(MYSQLI_ASSOC);
    jsonResult($rows);
}

if ($action === 'get' && $method === 'GET') {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) jsonResult(['error' => 'id required'], 400);
    $stmt = $mysqli->prepare('SELECT p.*, u.name AS author_name, u.avatar AS author_avatar FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id=? LIMIT 1');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows !== 1) jsonResult(['error' => 'Post not found'], 404);
    $post = $res->fetch_assoc();
    $upd = $mysqli->prepare('UPDATE posts SET views = views + 1 WHERE id=?');
    $upd->bind_param('i', $id); $upd->execute();
    jsonResult($post);
}

if ($action === 'create' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $user_id = intval($body['user_id'] ?? 0);
    $title = trim($body['title'] ?? '');
    $category = trim($body['category'] ?? '');
    $content = trim($body['content'] ?? '');
    $image_url = trim($body['image_url'] ?? '');
    if (!$user_id || !$title || !$category || !$content) jsonResult(['error' => 'missing fields'], 400);

    $excerpt = mb_substr(strip_tags($content), 0, 210);
    $stmt = $mysqli->prepare('INSERT INTO posts (user_id,title,category,content,excerpt,image_url) VALUES (?,?,?,?,?,?)');
    $stmt->bind_param('isssss', $user_id, $title, $category, $content, $excerpt, $image_url);
    $stmt->execute();
    jsonResult(['success'=>true,'id'=>$stmt->insert_id]);
}

if ($action === 'update' && $method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);
    $id = intval($body['id'] ?? 0);
    $title = trim($body['title'] ?? '');
    $category = trim($body['category'] ?? '');
    $content = trim($body['content'] ?? '');
    $image_url = trim($body['image_url'] ?? '');
    if (!$id || !$title || !$category || !$content) jsonResult(['error' => 'missing fields'],400);

    $excerpt = mb_substr(strip_tags($content), 0, 210);
    $stmt = $mysqli->prepare('UPDATE posts SET title=?, category=?, content=?, excerpt=?, image_url=?, updated_at=NOW() WHERE id=?');
    $stmt->bind_param('sssssi',$title,$category,$content,$excerpt,$image_url,$id);
    $stmt->execute();
    jsonResult(['success'=>true,'affected_rows'=>$stmt->affected_rows]);
}

if ($action === 'delete' && $method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0); if (!$id) jsonResult(['error'=>'id required'],400);
    $stmt = $mysqli->prepare('DELETE FROM posts WHERE id=?');
    $stmt->bind_param('i',$id); $stmt->execute();
    jsonResult(['success'=>true,'deleted'=>$stmt->affected_rows]);
}

jsonResult(['error'=>'Action not found'],404);
?>