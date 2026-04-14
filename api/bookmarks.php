<?php
require_once __DIR__ . '/db.php';
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
if ($action === 'list' && $method === 'GET') {
    $user_id = intval($_GET['user_id'] ?? 0);
    if (!$user_id) { jsonResult(['error'=>'user_id required'],400); }
    $stmt = $mysqli->prepare('SELECT b.post_id,p.title,p.category,p.excerpt,p.image_url,p.created_at FROM bookmarks b JOIN posts p ON b.post_id=p.id WHERE b.user_id=? ORDER BY b.created_at DESC');
    $stmt->bind_param('i',$user_id);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    jsonResult($rows);
}
if ($action === 'toggle' && $method === 'POST') {
    $body=json_decode(file_get_contents('php://input'),true);
    $user_id=intval($body['user_id'] ?? 0); $post_id=intval($body['post_id'] ?? 0);
    if(!$user_id||!$post_id){jsonResult(['error'=>'user_id/post_id required'],400);}    
    $stmt=$mysqli->prepare('SELECT id FROM bookmarks WHERE user_id=? AND post_id=?');
    $stmt->bind_param('ii',$user_id,$post_id);$stmt->execute();$res=$stmt->get_result();
    if($res->num_rows){$row=$res->fetch_assoc();$del=$mysqli->prepare('DELETE FROM bookmarks WHERE id=?');$del->bind_param('i',$row['id']);$del->execute();jsonResult(['removed'=>true]);}
    $ins=$mysqli->prepare('INSERT INTO bookmarks (user_id,post_id) VALUES (?,?)');$ins->bind_param('ii',$user_id,$post_id);$ins->execute();jsonResult(['added'=>true]);
}
if ($action==='check' && $method==='GET') {
    $user_id=intval($_GET['user_id'] ?? 0); $post_id=intval($_GET['post_id'] ?? 0);
    if(!$user_id||!$post_id) jsonResult(['error'=>'user_id/post_id required'],400);
    $stmt=$mysqli->prepare('SELECT id FROM bookmarks WHERE user_id=? AND post_id=?');
    $stmt->bind_param('ii',$user_id,$post_id);$stmt->execute();$res=$stmt->get_result();
    jsonResult(['bookmarked'=>$res->num_rows>0]);
}
jsonResult(['error'=>'Action not found'],404);
?>