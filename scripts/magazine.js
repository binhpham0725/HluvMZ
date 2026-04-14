import { renderHeader, initHeader } from "../components/header.js";
import { renderFooter } from "../components/footer.js";
import { createArticleCard, bindArticleCardClick } from "../components/articleCard.js";
import { getPosts } from "../services/postService.js";
import { CATEGORY_OPTIONS } from "../config/constants.js";

document.getElementById("app-header").innerHTML = renderHeader("magazine");
document.getElementById("app-footer").innerHTML = renderFooter();
initHeader();

const postList = document.getElementById("magazine-post-list");
const filterWrap = document.getElementById("magazine-category-filters");
const featuredWrap = document.getElementById("magazine-featured-categories");

async function loadMagazinePosts(category = "") {
  try {
    const posts = await getPosts({ category });
    postList.innerHTML = posts.length
      ? posts.map(createArticleCard).join("")
      : `<div class="empty-box">Chưa có bài viết.</div>`;
    bindArticleCardClick("#magazine-post-list");
  } catch (error) {
    postList.innerHTML = `<div class="empty-box">${error.message}</div>`;
  }
}

function renderCategoryButtons() {
  filterWrap.innerHTML = CATEGORY_OPTIONS.map(
    (item) => `<button class="chip category-filter-btn" data-category="${item}">${item}</button>`
  ).join("");

  featuredWrap.innerHTML = CATEGORY_OPTIONS.map(
    (item) => `<a class="chip" href="category.html?id=${CATEGORY_OPTIONS.indexOf(item) + 1}">${item}</a>`
  ).join("");

  filterWrap.addEventListener("click", (event) => {
    const button = event.target.closest(".category-filter-btn");
    if (!button) return;
    loadMagazinePosts(button.dataset.category);
  });
}

renderCategoryButtons();
loadMagazinePosts();