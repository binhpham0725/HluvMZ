import { callApi } from "./api.js";

export function getBookmarks(userId) {
  return callApi(`bookmarks.php?action=list&user_id=${userId}`);
}

export function toggleBookmark(user_id, post_id) {
  return callApi("bookmarks.php?action=toggle", {
    method: "POST",
    body: JSON.stringify({ user_id, post_id }),
  });
}

export function checkBookmark(userId, postId) {
  return callApi(
    `bookmarks.php?action=check&user_id=${userId}&post_id=${postId}`
  );
}