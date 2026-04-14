import { renderHeader, initHeader } from "../components/header.js";
import { renderFooter } from "../components/footer.js";
import { createArticleCard, bindArticleCardClick } from "../components/articleCard.js";
import { getPosts } from "../services/postService.js";
import { CATEGORY_MAP } from "../config/constants.js";
import { getQueryParam } from "../utils/helpers.js";

document.getElementById("app-header").innerHTML = renderHeader("category");
document.getElementById("app-footer").innerHTML = renderFooter();
initHeader();

const categoryId = getQueryParam("id") || "0";
const categoryName = CATEGORY_MAP[categoryId] || "Tất cả";

const titleEl = document.getElementById("category-title");
const countEl = document.getElementById("category-count");
const listEl = document.getElementById("category-post-list");

titleEl.textContent = categoryName;

async function loadCategoryPosts() {
  try {
    const posts = await getPosts({
      category: categoryName === "Tất cả" ? "" : categoryName,
    });

    countEl.textContent = `${posts.length} bài viết`;
    listEl.innerHTML = posts.length
      ? posts.map(createArticleCard).join("")
      : `<div class="empty-box">Chưa có bài viết trong chuyên mục này.</div>`;

    bindArticleCardClick("#category-post-list");
  } catch (error) {
    countEl.textContent = "0 bài viết";
    listEl.innerHTML = `<div class="empty-box">${error.message}</div>`;
  }
}

loadCategoryPosts();