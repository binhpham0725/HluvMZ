import { renderHeader, initHeader } from "../components/header.js";
import { renderFooter } from "../components/footer.js";
import { createArticleCard, bindArticleCardClick } from "../components/articleCard.js";
import { getPosts } from "../services/postService.js";
import { getQueryParam } from "../utils/helpers.js";

document.getElementById("app-header").innerHTML = renderHeader("search");
document.getElementById("app-footer").innerHTML = renderFooter();
initHeader();

const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const resultList = document.getElementById("search-result-list");

async function searchPosts() {
  const q = searchInput.value.trim();
  if (!q) {
    resultList.innerHTML = `<div class="empty-box">Nhập từ khóa để tìm kiếm.</div>`;
    return;
  }

  try {
    const posts = await getPosts({ q });
    resultList.innerHTML = posts.length
      ? posts.map(createArticleCard).join("")
      : `<div class="empty-box">Không tìm thấy kết quả.</div>`;
    bindArticleCardClick("#search-result-list");
  } catch (error) {
    resultList.innerHTML = `<div class="empty-box">${error.message}</div>`;
  }
}

searchButton.addEventListener("click", searchPosts);
searchInput.addEventListener("keyup", (event) => {
  if (event.key === "Enter") searchPosts();
});

const initialQuery = getQueryParam("q");
if (initialQuery) {
  searchInput.value = initialQuery;
  searchPosts();
}