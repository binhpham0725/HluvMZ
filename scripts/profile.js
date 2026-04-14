import { renderHeader, initHeader } from "../components/header.js";
import { renderFooter } from "../components/footer.js";
import { createArticleCard, bindArticleCardClick } from "../components/articleCard.js";
import { getCurrentUser, clearCurrentUser, setCurrentUser } from "../utils/storage.js";
import { getUserProfile, updateUserProfile } from "../services/userService.js";
import { getBookmarks } from "../services/bookmarkService.js";
import { getPosts, createPost, updatePost, deletePost } from "../services/postService.js";
import { validatePostForm } from "../utils/validators.js";

document.getElementById("app-header").innerHTML = renderHeader();
document.getElementById("app-footer").innerHTML = renderFooter();
initHeader();

const currentUser = getCurrentUser();

if (!currentUser) {
  alert("Vui lòng đăng nhập.");
  window.location.href = "login.html";
}

const profileAvatar = document.getElementById("profile-avatar");
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const bookmarkCount = document.getElementById("bookmark-count");
const postCount = document.getElementById("post-count");
const bookmarkList = document.getElementById("bookmark-list");
const myPostList = document.getElementById("my-post-list");

const editProfileButton = document.getElementById("edit-profile-button");
const logoutPageButton = document.getElementById("logout-page-button");

const postForm = document.getElementById("post-form");
const postIdInput = document.getElementById("post-id");
const postTitleInput = document.getElementById("post-title");
const postCategoryInput = document.getElementById("post-category");
const postImageUrlInput = document.getElementById("post-image-url");
const postContentInput = document.getElementById("post-content");

async function loadProfile() {
  try {
    const user = await getUserProfile(currentUser.id);
    profileAvatar.src =
      user.avatar || `https://i.pravatar.cc/100?u=${encodeURIComponent(user.email)}`;
    profileName.textContent = user.name || "Người dùng";
    profileEmail.textContent = user.email || "";
  } catch (error) {
    alert(error.message);
  }
}

async function loadBookmarks() {
  try {
    const bookmarks = await getBookmarks(currentUser.id);
    bookmarkCount.textContent = bookmarks.length;
    bookmarkList.innerHTML = bookmarks.length
      ? bookmarks.map(createArticleCard).join("")
      : `<div class="empty-box">Chưa có bài viết đã lưu.</div>`;
    bindArticleCardClick("#bookmark-list");
  } catch (error) {
    bookmarkList.innerHTML = `<div class="empty-box">${error.message}</div>`;
  }
}

async function loadMyPosts() {
  try {
    const posts = await getPosts();
    const myPosts = posts.filter((item) => Number(item.user_id) === Number(currentUser.id));

    postCount.textContent = myPosts.length;

    if (!myPosts.length) {
      myPostList.innerHTML = `<div class="empty-box">Bạn chưa có bài viết nào.</div>`;
      return;
    }

    myPostList.innerHTML = myPosts
      .map(
        (post) => `
          <div>
            ${createArticleCard(post)}
            <div class="stat-list" style="margin-top:10px;">
              <button class="chip edit-post-btn" data-id="${post.id}">Sửa</button>
              <button class="chip danger delete-post-btn" data-id="${post.id}">Xóa</button>
            </div>
          </div>
        `
      )
      .join("");

    bindArticleCardClick("#my-post-list");
    bindPostActions(myPosts);
  } catch (error) {
    myPostList.innerHTML = `<div class="empty-box">${error.message}</div>`;
  }
}

function bindPostActions(myPosts) {
  document.querySelectorAll(".edit-post-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const post = myPosts.find((item) => Number(item.id) === Number(button.dataset.id));
      if (!post) return;

      postIdInput.value = post.id;
      postTitleInput.value = post.title || "";
      postCategoryInput.value = post.category || "";
      postImageUrlInput.value = post.image_url || "";
      postContentInput.value = post.content || "";
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  });

  document.querySelectorAll(".delete-post-btn").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();

      const id = Number(button.dataset.id);
      if (!confirm("Bạn có chắc muốn xóa bài viết này?")) return;

      try {
        await deletePost(id);
        alert("Xóa bài viết thành công.");
        loadMyPosts();
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

editProfileButton.addEventListener("click", async () => {
  const newName = prompt("Nhập tên mới:", profileName.textContent);
  if (!newName) return;

  const newAvatar = prompt("Nhập avatar URL mới:", profileAvatar.src) || "";

  try {
    await updateUserProfile({
      id: currentUser.id,
      name: newName.trim(),
      bio: "",
      avatar: newAvatar.trim(),
    });

    const updatedUser = {
      ...currentUser,
      name: newName.trim(),
      avatar: newAvatar.trim(),
    };
    setCurrentUser(updatedUser);

    alert("Cập nhật hồ sơ thành công.");
    loadProfile();
    document.getElementById("app-header").innerHTML = renderHeader();
    initHeader();
  } catch (error) {
    alert(error.message);
  }
});

logoutPageButton.addEventListener("click", () => {
  clearCurrentUser();
  window.location.href = "index.html";
});

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    id: postIdInput.value ? Number(postIdInput.value) : undefined,
    user_id: currentUser.id,
    title: postTitleInput.value.trim(),
    category: postCategoryInput.value.trim(),
    image_url: postImageUrlInput.value.trim(),
    content: postContentInput.value.trim(),
  };

  const validationMessage = validatePostForm(payload);
  if (validationMessage) {
    alert(validationMessage);
    return;
  }

  try {
    if (payload.id) {
      await updatePost({
        id: payload.id,
        title: payload.title,
        category: payload.category,
        image_url: payload.image_url,
        content: payload.content,
      });
      alert("Cập nhật bài viết thành công.");
    } else {
      await createPost(payload);
      alert("Đăng bài thành công.");
    }

    postForm.reset();
    postIdInput.value = "";
    loadMyPosts();
  } catch (error) {
    alert(error.message);
  }
});

await loadProfile();
await loadBookmarks();
await loadMyPosts();