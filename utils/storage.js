import { STORAGE_KEYS } from "../config/constants.js";

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || "null");
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
}

export function clearCurrentUser() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

export function getTheme() {
  return localStorage.getItem(STORAGE_KEYS.THEME) || "light";
}

export function setTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}