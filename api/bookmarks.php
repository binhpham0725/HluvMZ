<?php
require_once __DIR__ . '/db.php';
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

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
    $ins=$mysqli->prepare('INSERT INTO bookmarks (user_id,post_id) VALUES (?,?)');$ins->bind_param('ii',$user_id,$post_id);$ins->execute();
    addUserXp($mysqli,$user_id,2);
    $author=$mysqli->prepare('SELECT user_id FROM posts WHERE id=? LIMIT 1');$author->bind_param('i',$post_id);$author->execute();$authorRow=$author->get_result()->fetch_assoc();
    $authorId=intval($authorRow['user_id'] ?? 0);
    if($authorId && $authorId!==$user_id){addUserXp($mysqli,$authorId,3);}
    jsonResult(['added'=>true]);
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
