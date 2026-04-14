import { callApi } from "./api.js";

export function getPosts(params = {}) {
  const query = new URLSearchParams();

  if (params.q) query.set("q", params.q);
  if (params.category && params.category !== "Tất cả") {
    query.set("category", params.category);
  }

  return callApi(`posts.php?action=list&${query.toString()}`);
}

export function getPostById(id) {
  return callApi(`posts.php?action=get&id=${id}`);
}

export function createPost(payload) {
  return callApi("posts.php?action=create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePost(payload) {
  return callApi("posts.php?action=update", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deletePost(id) {
  return callApi(`posts.php?action=delete&id=${id}`, {
    method: "DELETE",
  });
}