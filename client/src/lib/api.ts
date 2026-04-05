const API_BASE = "";

/* ── 类型 ──────────────────────────────────── */
export type PostMeta = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  coverColor: string | null;
  createdAt: string;
  tags: string[];
};

export type Post = PostMeta & {
  content: string;
  published: boolean;
  listed: boolean;
  updatedAt: string;
};

/* ── 公开 API ──────────────────────────────── */
export async function fetchPosts(): Promise<PostMeta[]> {
  const res = await fetch(`${API_BASE}/api/posts`);
  if (!res.ok) throw new Error("获取文章列表失败");
  return res.json();
}

export async function fetchPost(slug: string): Promise<Post> {
  const res = await fetch(`${API_BASE}/api/posts/${slug}`);
  if (!res.ok) throw new Error("获取文章失败");
  return res.json();
}

export async function fetchTags(): Promise<{ id: number; name: string }[]> {
  const res = await fetch(`${API_BASE}/api/tags`);
  if (!res.ok) throw new Error("获取标签失败");
  return res.json();
}

/* ── 认证 ──────────────────────────────────── */
export function getToken(): string | null {
  return localStorage.getItem("monolith_token");
}

export function setToken(token: string) {
  localStorage.setItem("monolith_token", token);
}

export function clearToken() {
  localStorage.removeItem("monolith_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error("密码错误");
  const data = await res.json();
  setToken(data.token);
  return data.token;
}

export async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    return data.authenticated;
  } catch {
    return false;
  }
}

/* ── 管理 API ──────────────────────────────── */
export async function fetchAdminPosts(): Promise<Post[]> {
  const res = await fetch(`${API_BASE}/api/admin/posts`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("获取文章列表失败");
  return res.json();
}

export async function createPost(data: {
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  coverColor?: string;
  published?: boolean;
  tags?: string[];
}): Promise<Post> {
  const res = await fetch(`${API_BASE}/api/admin/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("创建文章失败");
  return res.json();
}

export async function updatePost(
  slug: string,
  data: Partial<Post & { tags: string[] }>
): Promise<Post> {
  const res = await fetch(`${API_BASE}/api/admin/posts/${slug}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("更新文章失败");
  return res.json();
}

export async function deletePost(slug: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/posts/${slug}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("删除文章失败");
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/admin/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error("上传失败");
  return res.json();
}
