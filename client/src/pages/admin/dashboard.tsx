import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { checkAuth, clearToken, fetchAdminPosts, deletePost, type Post } from "@/lib/api";
import { Plus, Edit, Trash2, LogOut, Eye, FileText, Tag, Clock, Search, Settings, ExternalLink, Filter, HardDrive, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
}

type FilterType = "all" | "published" | "draft";

export function AdminDashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedTag, setSelectedTag] = useState<string>("");

  useEffect(() => {
    document.title = "管理后台 | Monolith";
    checkAuth().then((ok) => {
      if (!ok) { setLocation("/admin/login"); return; }
      fetchAdminPosts().then(setPosts).finally(() => setLoading(false));
    });
  }, [setLocation]);

  const handleDelete = async (slug: string, title: string) => {
    if (!confirm(`确定删除「${title}」？此操作不可撤销。`)) return;
    setDeleting(slug);
    try {
      await deletePost(slug);
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
    } finally {
      setDeleting(null);
    }
  };

  const handleLogout = () => { clearToken(); setLocation("/admin/login"); };

  // 统计
  const publishedCount = posts.filter((p) => p.published).length;
  const draftCount = posts.filter((p) => !p.published).length;
  const allTags = useMemo(() => {
    const tagSet = new Set(posts.flatMap((p) => p.tags));
    return Array.from(tagSet).sort();
  }, [posts]);

  // 筛选后的文章
  const filteredPosts = useMemo(() => {
    let result = posts;
    // 发布状态筛选
    if (filter === "published") result = result.filter((p) => p.published);
    if (filter === "draft") result = result.filter((p) => !p.published);
    // 标签筛选
    if (selectedTag) result = result.filter((p) => p.tags.includes(selectedTag));
    // 搜索
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [posts, filter, selectedTag, search]);

  return (
    <div className="mx-auto w-full max-w-[960px] py-[32px]">
      {/* ─── 顶栏 ─── */}
      <div className="mb-[24px] flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em]">管理后台</h1>
          <p className="mt-[3px] text-[13px] text-muted-foreground/40">管理内容与站点配置</p>
        </div>
        <div className="flex items-center gap-[6px]">
          <Link href="/admin/editor" className="inline-flex items-center gap-[5px] h-[34px] px-[14px] rounded-md bg-foreground text-background text-[12px] font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-[13px] w-[13px]" />新建文章
          </Link>
          <Link href="/admin/settings" className="inline-flex items-center justify-center h-[34px] w-[34px] rounded-md border border-border/30 text-muted-foreground/50 hover:text-foreground hover:border-border/50 transition-colors" title="站点设置">
            <Settings className="h-[14px] w-[14px]" />
          </Link>
          <Link href="/admin/backup" className="inline-flex items-center justify-center h-[34px] w-[34px] rounded-md border border-border/30 text-muted-foreground/50 hover:text-foreground hover:border-border/50 transition-colors" title="备份管理">
            <HardDrive className="h-[14px] w-[14px]" />
          </Link>
          <Link href="/admin/pages" className="inline-flex items-center justify-center h-[34px] w-[34px] rounded-md border border-border/30 text-muted-foreground/50 hover:text-foreground hover:border-border/50 transition-colors" title="独立页">
            <StickyNote className="h-[14px] w-[14px]" />
          </Link>
          <button onClick={handleLogout} className="inline-flex items-center justify-center h-[34px] w-[34px] rounded-md border border-border/30 text-muted-foreground/50 hover:text-foreground hover:border-border/50 transition-colors" title="退出登录">
            <LogOut className="h-[14px] w-[14px]" />
          </button>
        </div>
      </div>

      {/* ─── 统计卡片 + 快捷操作 ─── */}
      <div className="mb-[20px] grid grid-cols-4 gap-[10px]">
        <button onClick={() => { setFilter("all"); setSelectedTag(""); }} className={`rounded-lg border p-[16px] text-left transition-all ${filter === "all" && !selectedTag ? "border-foreground/20 bg-card/30" : "border-border/25 bg-card/10 hover:bg-card/20"}`}>
          <div className="flex items-center gap-[8px]">
            <div className="flex h-[32px] w-[32px] items-center justify-center rounded-md bg-blue-500/10">
              <FileText className="h-[14px] w-[14px] text-blue-400" />
            </div>
            <div>
              <p className="text-[20px] font-semibold leading-none">{posts.length}</p>
              <p className="text-[11px] text-muted-foreground/40 mt-[2px]">全部</p>
            </div>
          </div>
        </button>
        <button onClick={() => { setFilter("published"); setSelectedTag(""); }} className={`rounded-lg border p-[16px] text-left transition-all ${filter === "published" ? "border-foreground/20 bg-card/30" : "border-border/25 bg-card/10 hover:bg-card/20"}`}>
          <div className="flex items-center gap-[8px]">
            <div className="flex h-[32px] w-[32px] items-center justify-center rounded-md bg-emerald-500/10">
              <Eye className="h-[14px] w-[14px] text-emerald-400" />
            </div>
            <div>
              <p className="text-[20px] font-semibold leading-none">{publishedCount}</p>
              <p className="text-[11px] text-muted-foreground/40 mt-[2px]">已发布</p>
            </div>
          </div>
        </button>
        <button onClick={() => { setFilter("draft"); setSelectedTag(""); }} className={`rounded-lg border p-[16px] text-left transition-all ${filter === "draft" ? "border-foreground/20 bg-card/30" : "border-border/25 bg-card/10 hover:bg-card/20"}`}>
          <div className="flex items-center gap-[8px]">
            <div className="flex h-[32px] w-[32px] items-center justify-center rounded-md bg-amber-500/10">
              <Clock className="h-[14px] w-[14px] text-amber-400" />
            </div>
            <div>
              <p className="text-[20px] font-semibold leading-none">{draftCount}</p>
              <p className="text-[11px] text-muted-foreground/40 mt-[2px]">草稿</p>
            </div>
          </div>
        </button>
        <a href="/" target="_blank" className="rounded-lg border border-border/25 bg-card/10 hover:bg-card/20 p-[16px] text-left transition-all">
          <div className="flex items-center gap-[8px]">
            <div className="flex h-[32px] w-[32px] items-center justify-center rounded-md bg-foreground/5">
              <ExternalLink className="h-[14px] w-[14px] text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-[13px] font-medium leading-none text-muted-foreground/60">查看前台</p>
              <p className="text-[11px] text-muted-foreground/30 mt-[3px]">新窗口打开</p>
            </div>
          </div>
        </a>
      </div>

      {/* ─── 搜索 & 标签筛选 ─── */}
      <div className="mb-[14px] flex items-center gap-[10px]">
        <div className="relative flex-1">
          <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 h-[13px] w-[13px] text-muted-foreground/25" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索文章标题、Slug 或标签..."
            className="h-[34px] w-full rounded-md border border-border/25 bg-background/20 pl-[32px] pr-[10px] text-[12px] text-foreground placeholder:text-muted-foreground/25 outline-none focus:border-foreground/15 transition-colors"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-[3px] shrink-0">
            <Filter className="h-[12px] w-[12px] text-muted-foreground/25 mr-[4px]" />
            {allTags.slice(0, 6).map((tag) => (
              <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                className={`h-[26px] px-[8px] rounded-full text-[10px] transition-all ${
                  selectedTag === tag
                    ? "bg-foreground/10 text-foreground border border-foreground/15"
                    : "text-muted-foreground/40 hover:text-muted-foreground/60 border border-transparent"
                }`}
              >{tag}</button>
            ))}
          </div>
        )}
      </div>

      {/* ─── 文章列表头 ─── */}
      <div className="mb-[8px] flex items-center justify-between">
        <h2 className="text-[12px] font-medium text-muted-foreground/40 uppercase tracking-[0.06em]">
          {filter === "all" ? "所有文章" : filter === "published" ? "已发布" : "草稿"}
          {selectedTag && ` · ${selectedTag}`}
        </h2>
        <span className="text-[11px] text-muted-foreground/25">{filteredPosts.length} 篇</span>
      </div>

      {/* ─── 文章列表 ─── */}
      {loading ? (
        <div className="space-y-[6px]">{[1, 2, 3].map((i) => <div key={i} className="h-[68px] animate-pulse rounded-lg bg-card/15" />)}</div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/25 py-[48px] text-center">
          <FileText className="mx-auto mb-[10px] h-[20px] w-[20px] text-muted-foreground/20" />
          <p className="text-[13px] text-muted-foreground/40">
            {search || selectedTag ? "没有匹配的文章" : "还没有文章"}
          </p>
          {!search && !selectedTag && (
            <Link href="/admin/editor" className="mt-[8px] inline-block text-[13px] text-foreground/60 hover:text-foreground transition-colors">创建第一篇 →</Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border/25 overflow-hidden">
          {filteredPosts.map((post, i) => (
            <div key={post.slug} className={`group flex items-center gap-[14px] px-[18px] py-[14px] ${i < filteredPosts.length - 1 ? "border-b border-border/12" : ""} hover:bg-card/15 transition-colors`}>
              {/* 封面色条 */}
              <div className={`h-[36px] w-[3px] rounded-full bg-gradient-to-b ${post.coverColor || "from-gray-500/30 to-gray-600/30"} shrink-0`} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[8px] mb-[3px]">
                  <Link href={`/admin/editor/${post.slug}`} className="text-[14px] font-medium text-foreground truncate hover:text-foreground/80 transition-colors">{post.title}</Link>
                  {!post.published && (
                    <Badge variant="outline" className="h-[16px] rounded-[3px] px-[5px] text-[9px] font-normal text-amber-400/70 border-amber-400/20">草稿</Badge>
                  )}
                </div>
                <div className="flex items-center gap-[6px] text-[11px] text-muted-foreground/35">
                  <span>{timeAgo(post.updatedAt || post.createdAt)}</span>
                  {post.tags.length > 0 && (
                    <>
                      <span className="text-border/40">·</span>
                      <span>{post.tags.slice(0, 3).join(", ")}</span>
                    </>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-[1px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={`/posts/${post.slug}`} target="_blank" title="预览" className="p-[7px] rounded-md text-muted-foreground/30 hover:text-foreground hover:bg-accent/15 transition-colors">
                  <Eye className="h-[13px] w-[13px]" />
                </a>
                <Link href={`/admin/editor/${post.slug}`} title="编辑" className="p-[7px] rounded-md text-muted-foreground/30 hover:text-foreground hover:bg-accent/15 transition-colors">
                  <Edit className="h-[13px] w-[13px]" />
                </Link>
                <button onClick={() => handleDelete(post.slug, post.title)} disabled={deleting === post.slug} title="删除" className="p-[7px] rounded-md text-muted-foreground/30 hover:text-red-400 hover:bg-red-400/8 transition-colors disabled:opacity-30">
                  <Trash2 className={`h-[13px] w-[13px] ${deleting === post.slug ? "animate-pulse" : ""}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── 标签总览 ─── */}
      {allTags.length > 0 && (
        <div className="mt-[24px]">
          <h2 className="mb-[10px] text-[12px] font-medium text-muted-foreground/40 uppercase tracking-[0.06em]">
            <Tag className="inline h-[11px] w-[11px] mr-[4px]" />标签总览
          </h2>
          <div className="flex flex-wrap gap-[6px]">
            {allTags.map((tag) => {
              const count = posts.filter((p) => p.tags.includes(tag)).length;
              return (
                <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                  className={`inline-flex items-center gap-[4px] h-[28px] px-[10px] rounded-full text-[11px] border transition-all ${
                    selectedTag === tag
                      ? "bg-foreground/8 text-foreground border-foreground/15"
                      : "text-muted-foreground/40 border-border/20 hover:text-muted-foreground/60 hover:border-border/30"
                  }`}
                >
                  {tag}
                  <span className="text-[10px] text-muted-foreground/25">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
