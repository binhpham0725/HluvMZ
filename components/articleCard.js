import { formatDate, escapeHtml } from "../utils/helpers.js";

export function createArticleCard(post) {
  const image = post.image_url || "../assets/images/placeholder.svg";
  const excerpt = post.excerpt || post.content || "";
  return `
    <article class="story-card" data-id="${post.id}">
      <img src="${image}" alt="${escapeHtml(post.title)}" onerror="this.src='../assets/images/placeholder.svg'">
      <div class="story-body">
        <p class="story-meta">${escapeHtml(post.category || "")}</p>
        <h3 class="story-title">${escapeHtml(post.title || "")}</h3>
        <p class="story-desc">${escapeHtml(excerpt).slice(0, 140)}</p>
        <small>${formatDate(post.created_at)}</small>
      </div>
    </article>
  `;
}

export function bindArticleCardClick(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  container.addEventListener("click", (event) => {
    const card = event.target.closest(".story-card");
    if (!card) return;
    const { id } = card.dataset;
    if (id) {
      window.location.href = `article.html?id=${id}`;
    }
  });
}