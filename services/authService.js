import { callApi } from "./api.js";

export function login(payload) {
  return callApi("users.php?action=login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(payload) {
  return callApi("users.php?action=register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}