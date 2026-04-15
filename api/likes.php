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

function createNotification(mysqli $mysqli, ?int $userId, int $actorId, string $type, string $message, int $postId = 0): void {
    if ($userId && $userId === $actorId) return;
    $exists = $mysqli->query("SHOW TABLES LIKE 'notifications'");
    if (!$exists || $exists->num_rows === 0) return;

    $actor=$mysqli->prepare('SELECT name,email FROM users WHERE id=? LIMIT 1');
    $actor->bind_param('i',$actorId);$actor->execute();$actorRow=$actor->get_result()->fetch_assoc();
    $actorName=$actorRow['name'] ?: ($actorRow['email'] ?: 'Một người dùng');
    $stmt=$mysqli->prepare('INSERT INTO notifications (user_id,actor_id,actor_name,type,post_id,message) VALUES (?,?,?,?,?,?)');
    $stmt->bind_param('iissis',$userId,$actorId,$actorName,$type,$postId,$message);
    $stmt->execute();
}

if ($action === 'toggle' && $method === 'POST') {
    $body=json_decode(file_get_contents('php://input'),true);
    $user_id=intval($body['user_id'] ?? 0); $post_id=intval($body['post_id'] ?? 0);
    if(!$user_id||!$post_id) jsonResult(['error'=>'user_id/post_id required'],400);

    $stmt=$mysqli->prepare('SELECT id FROM likes WHERE user_id=? AND post_id=?');
    $stmt->bind_param('ii',$user_id,$post_id); $stmt->execute(); $res=$stmt->get_result();
    if($res->num_rows){$d=$mysqli->prepare('DELETE FROM likes WHERE id=?');$row=$res->fetch_assoc();$d->bind_param('i',$row['id']);$d->execute();jsonResult(['liked'=>false]);}
    $i=$mysqli->prepare('INSERT INTO likes(user_id,post_id) VALUES(?,?)');$i->bind_param('ii',$user_id,$post_id);$i->execute();
    addUserXp($mysqli,$user_id,1);
    $author=$mysqli->prepare('SELECT user_id,title FROM posts WHERE id=? LIMIT 1');$author->bind_param('i',$post_id);$author->execute();$authorRow=$author->get_result()->fetch_assoc();
    $authorId=intval($authorRow['user_id'] ?? 0);
    if($authorId && $authorId!==$user_id){
        addUserXp($mysqli,$authorId,2);
        createNotification($mysqli,$authorId,$user_id,'like','Có người vừa thích bài viết "'.($authorRow['title'] ?? 'không có tiêu đề').'".',$post_id);
    }
    jsonResult(['liked'=>true]);
}
if ($action==='count' && $method==='GET') {
    $post_id=intval($_GET['post_id'] ?? 0); if(!$post_id) jsonResult(['error'=>'post_id required'],400);
    $stmt=$mysqli->prepare('SELECT COUNT(*) AS total FROM likes WHERE post_id=?');$stmt->bind_param('i',$post_id);$stmt->execute();$r=$stmt->get_result()->fetch_assoc();jsonResult(['total'=>intval($r['total'])]);
}
if ($action==='check' && $method==='GET') {
    $user_id=intval($_GET['user_id'] ?? 0); $post_id=intval($_GET['post_id'] ?? 0);
    if(!$user_id||!$post_id) jsonResult(['error'=>'user_id/post_id required'],400);
    $stmt=$mysqli->prepare('SELECT id FROM likes WHERE user_id=? AND post_id=?');$stmt->bind_param('ii',$user_id,$post_id);$stmt->execute();$res=$stmt->get_result();
    jsonResult(['liked'=>$res->num_rows>0]);
}
jsonResult(['error'=>'Action not found'],404);
?>
