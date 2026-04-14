export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateLogin(email, password) {
  if (!email || !password) {
    return "Email và mật khẩu là bắt buộc.";
  }
  if (!isValidEmail(email)) {
    return "Email không đúng định dạng.";
  }
  if (password.length < 6) {
    return "Mật khẩu phải có ít nhất 6 ký tự.";
  }
  return "";
}

export function validateRegister(name, email, password, confirmPassword) {
  if (!name || !email || !password || !confirmPassword) {
    return "Vui lòng nhập đầy đủ thông tin.";
  }
  if (!isValidEmail(email)) {
    return "Email không đúng định dạng.";
  }
  if (password.length < 6) {
    return "Mật khẩu phải có ít nhất 6 ký tự.";
  }
  if (password !== confirmPassword) {
    return "Mật khẩu xác nhận không khớp.";
  }
  return "";
}

export function validatePostForm({ title, category, content }) {
  if (!title || !category || !content) {
    return "Tiêu đề, chuyên mục và nội dung là bắt buộc.";
  }
  return "";
}