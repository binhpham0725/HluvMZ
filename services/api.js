import { API_BASE_URL } from "../config/constants.js";

export async function callApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}/${endpoint}`;
  const config = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const errorMessage =
        typeof data === "object" && data?.error
          ? data.error
          : `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}