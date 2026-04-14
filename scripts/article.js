import { renderHeader, initHeader } from "../components/header.js";
import { renderFooter } from "../components/footer.js";
import { createArticleCard, bindArticleCardClick } from "../components/articleCard.js";
import { getPostById, getPosts } from "../services/postService.js";
import { checkBookmark, toggleBookmark } from "../services/bookmarkService.js";
import { getCurrentUser } from "../utils/storage.js";
import { getQueryParam, formatDate, estimateReadTime } from "../utils/helpers.js";

document.getElementById("app-header").innerHTML = renderHeader();
document.getElementById("app-footer").innerHTML = renderFooter();
initHeader();

const articleId = getQueryParam("id");
const currentUser = getCurrentUser();

const categoryEl = document.getElementById("article-category");
const titleEl = document.getElementById("article-title");
const authorEl = document.getElementById("article-author");
const dateEl = document.getElementById("article-date");
const readTimeEl = document.getElementById("article-readtime");
const imageEl = document.getElementById("article-image");
const contentEl = document.getElementById("article-content");
const tagListEl = document.getElementById("tag-list");
const relatedListEl = document.getElementById("related-post-list");
const bookmarkBtn = document.getElementById("bookmark-btn");
const shareBtn = document.getElementById("share-btn");
const backTop = document.getElementById("back-top");

let currentPost = null;

async function loadArticle() {
  if (!articleId) {
    titleEl.textContent = "Không tìm thấy bài viết";
    return;
  }

  try {
    const post = await getPostById(articleId);
    currentPost = post;

    categoryEl.textContent = post.category || "Chuyên mục";
    titleEl.textContent = post.title || "Không có tiêu đề";
    authorEl.textContent = post.author_name || "Ban biên tập";
    dateEl.textContent = formatDate(post.created_at);
    readTimeEl.textContent = `${estimateReadTime(post.content)} phút`;
    imageEl.src = post.image_url || "../assets/images/placeholder.svg";
    contentEl.textContent = post.content || "";

    tagListEl.innerHTML = `
      <span class="tag-pill">${post.category || "Bài viết"}</span>
    `;

    await loadRelatedPosts(post.category, Number(post.id));
    await refreshBookmarkButton();
  } catch (error) {
    titleEl.textContent = error.message;
  }
}

async function loadRelatedPosts(category, postId) {
  try {
    const posts = await getPosts({ category });
    const related = posts.filter((item) => Number(item.id) !== postId).slice(0, 3);

    relatedListEl.innerHTML = related.length
      ? related.map(createArticleCard).join("")
      : `<div class="empty-box">Chưa có bài liên quan.</div>`;

    bindArticleCardClick("#related-post-list");
  } catch (error) {
    relatedListEl.innerHTML = `<div class="empty-box">${error.message}</div>`;
  }
}

async function refreshBookmarkButton() {
  if (!currentUser || !currentPost) {
    bookmarkBtn.textContent = "Đăng nhập để lưu";
    return;
  }

  try {
    const result = await checkBookmark(currentUser.id, currentPost.id);
    bookmarkBtn.textContent = result.bookmarked ? "Đã lưu" : "Lưu bài";
  } catch {
    bookmarkBtn.textContent = "Lưu bài";
  }
}

bookmarkBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Vui lòng đăng nhập để lưu bài.");
    window.location.href = "login.html";
    return;
  }

  if (!currentPost) return;

  try {
    await toggleBookmark(currentUser.id, currentPost.id);
    await refreshBookmarkButton();
    alert("Đã cập nhật bookmark.");
  } catch (error) {
    alert(error.message);
  }
});

shareBtn.addEventListener("click", async () => {
  if (!currentPost) return;

  if (navigator.share) {
    await navigator.share({
      title: currentPost.title,
      text: "Xem bài viết này",
      url: window.location.href,
    });
  } else {
    prompt("Sao chép liên kết:", window.location.href);
  }
});

backTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("scroll", () => {
  backTop.style.display = window.scrollY > 300 ? "flex" : "none";
});

loadArticle();