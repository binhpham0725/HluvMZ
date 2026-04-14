import { callApi } from "./api.js";

export function getUserProfile(userId) {
  return callApi(`users.php?action=profile&id=${userId}`);
}

export function updateUserProfile(payload) {
  return callApi("users.php?action=update", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}