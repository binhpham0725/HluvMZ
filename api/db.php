<?php
// c:\xampp\htdocs\xampp\HLUVmagazine\api\db.php
$DB_HOST = '127.0.0.1';
$DB_NAME = 'hluvmagazine';
$DB_USER = 'root';
$DB_PASS = ''; // Nếu cấp khác, chỉnh lại.

$mysqli = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
if ($mysqli->connect_errno) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Không thể kết nối DB: ' . $mysqli->connect_error]);
    exit;
}
$mysqli->set_charset('utf8mb4');
function jsonResult($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
?>
