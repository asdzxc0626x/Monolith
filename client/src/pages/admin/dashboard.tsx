import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { checkAuth, clearToken, fetchAdminPosts, deletePost, fetchViewStats, type Post, type ViewStats } from "@/lib/api";
import { Plus, Edit, Trash2, LogOut, Eye, FileText, Tag, Clock, Search, Settings, ExternalLink, Filter, HardDrive, StickyNote, TrendingUp, BarChart3, MessageCircle, Image as ImageIcon, ArrowLeft } from "lucide-react";
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
  const [viewStats, setViewStats] = useState<ViewStats | null>(null);

  useEffect(() => {
    document.title = "管理后台 | Monolith";
    checkAuth().then((ok) => {
      if (!ok) { setLocation("/admin/login"); return; }
      fetchAdminPosts().then(setPosts).finally(() => setLoading(false));
      fetchViewStats().then(setViewStats).catch(() => {});
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
    <div className="mx-auto w-full max-w-[1020px] py-[24px] sm:py-[40px] px-[16px] sm:px-[20px]">
      {/* ─── 顶栏 ─── */}
      <div className="mb-[24px] sm:mb-[32px]">
        <div className="flex items-start justify-between mb-[16px]">
          <div className="min-w-0">
            <h1 className="text-[22px] sm:text-[32px] font-semibold tracking-[-0.02em] whitespace-nowrap">管理后台</h1>
            <p className="mt-[2px] sm:mt-[6px] text-[12px] sm:text-[15px] text-muted-foreground/50 whitespace-nowrap">管理内容与站点配置</p>
          </div>
          <Link href="/admin/editor" className="inline-flex items-center gap-[5px] h-[34px] sm:h-[40px] px-[12px] sm:px-[16px] rounded-lg bg-foreground text-background text-[13px] sm:text-[14px] font-medium hover:opacity-90 transition-opacity shrink-0 ml-[12px]">
            <Plus className="h-[14px] w-[14px] sm:h-[16px] sm:w-[16px]" />新建
          </Link>
        </div>
        <div className="flex items-center gap-[6px] overflow-x-auto pb-[4px] scrollbar-none">
          <Link href="/admin/settings" className="inline-flex items-center justify-center h-[32px] w-[32px] sm:h-[40px] sm:w-[40px] rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-card/30 transition-all shrink-0" title="站点设置">
            <Settings className="h-[15px] w-[15px] sm:h-[18px] sm:w-[18px]" />
          </Link>
          <Link href="/admin/backup" className="inline-flex items-center justify-center h-[32px] w-[32px] sm:h-[40px] sm:w-[40px] rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-card/30 transition-all shrink-0" title="备份管理">
            <HardDrive className="h-[15px] w-[15px] sm:h-[18px] sm:w-[18px]" />
          </Link>
          <Link href="/admin/pages" className="inline-flex items-center justify-center h-[32px] w-[32px] sm:h-[40px] sm:w-[40px] rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-card/30 transition-all shrink-0" title="独立页">
            <StickyNote className="h-[15px] w-[15px] sm:h-[18px] sm:w-[18px]" />
          </Link>
          <Link href="/admin/comments" className="inline-flex items-center justify-center h-[32px] w-[32px] sm:h-[40px] sm:w-[40px] rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-card/30 transition-all shrink-0" title="评论管理">
            <MessageCircle className="h-[15px] w-[15px] sm:h-[18px] sm:w-[18px]" />
          </Link>
          <Link href="/admin/media" className="inline-flex items-center justify-center h-[32px] w-[32px] sm:h-[40px] sm:w-[40px] rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-card/30 transition-all shrink-0" title="媒体库">
            <ImageIcon className="h-[15px] w-[15px] sm:h-[18px] sm:w-[18px]" />
          </Link>
          <div className="w-[1px] h-[20px] bg-border/30 mx-[2px] shrink-0"></div>
          <button onClick={handleLogout} className="inline-flex items-center justify-center h-[32px] w-[32px] sm:h-[40px] sm:w-[40px] rounded-lg border border-border/40 text-red-400/60 hover:text-red-400 hover:border-red-400/40 hover:bg-red-400/10 transition-all shrink-0" title="退出登录">
            <LogOut className="h-[15px] w-[15px] sm:h-[18px] sm:w-[18px]" />
          </button>
        </div>
      </div>


      {/* ─── 统计卡片 ─── */}
      <div className="mb-[24px] sm:mb-[28px] grid grid-cols-2 md:grid-cols-4 gap-[10px] sm:gap-[16px]">
        <button onClick={() => { setFilter("all"); setSelectedTag(""); }} className={`rounded-xl border p-[12px] sm:p-[20px] text-left transition-all hover:-translate-y-[2px] shadow-sm ${filter === "all" && !selectedTag ? "border-cyan-500/30 bg-cyan-500/5 shadow-cyan-500/10" : "border-border/30 bg-card/10 hover:bg-card/40 hover:border-border/50"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] sm:text-[13px] text-muted-foreground/60 mb-[6px] sm:mb-[8px] font-medium">全部文章</p>
              <p className="text-[24px] sm:text-[32px] font-bold leading-none tracking-tight">{posts.length}</p>
            </div>
            <div className={`flex h-[36px] w-[36px] sm:h-[48px] sm:w-[48px] items-center justify-center rounded-2xl ${filter === "all" && !selectedTag ? "bg-cyan-500/20" : "bg-card/50 shadow-inner"}`}>
              <FileText className={`h-[24px] w-[24px] ${filter === "all" && !selectedTag ? "text-cyan-400" : "text-muted-foreground"}`} />
            </div>
          </div>
        </button>
        <button onClick={() => { setFilter("published"); setSelectedTag(""); }} className={`rounded-xl border p-[12px] sm:p-[20px] text-left transition-all hover:-translate-y-[2px] shadow-sm ${filter === "published" ? "border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/10" : "border-border/30 bg-card/10 hover:bg-card/40 hover:border-border/50"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] sm:text-[13px] text-muted-foreground/60 mb-[6px] sm:mb-[8px] font-medium">已发布</p>
              <p className="text-[24px] sm:text-[32px] font-bold leading-none tracking-tight">{publishedCount}</p>
            </div>
            <div className={`flex h-[36px] w-[36px] sm:h-[48px] sm:w-[48px] items-center justify-center rounded-2xl ${filter === "published" ? "bg-emerald-500/20" : "bg-card/50 shadow-inner"}`}>
              <Eye className={`h-[24px] w-[24px] ${filter === "published" ? "text-emerald-400" : "text-emerald-500/50"}`} />
            </div>
          </div>
        </button>
        <button onClick={() => { setFilter("draft"); setSelectedTag(""); }} className={`rounded-xl border p-[12px] sm:p-[20px] text-left transition-all hover:-translate-y-[2px] shadow-sm ${filter === "draft" ? "border-amber-500/30 bg-amber-500/5 shadow-amber-500/10" : "border-border/30 bg-card/10 hover:bg-card/40 hover:border-border/50"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] sm:text-[13px] text-muted-foreground/60 mb-[6px] sm:mb-[8px] font-medium">草稿</p>
              <p className="text-[24px] sm:text-[32px] font-bold leading-none tracking-tight">{draftCount}</p>
            </div>
            <div className={`flex h-[36px] w-[36px] sm:h-[48px] sm:w-[48px] items-center justify-center rounded-2xl ${filter === "draft" ? "bg-amber-500/20" : "bg-card/50 shadow-inner"}`}>
              <Clock className={`h-[24px] w-[24px] ${filter === "draft" ? "text-amber-400" : "text-amber-500/50"}`} />
            </div>
          </div>
        </button>
        <a href="/" target="_blank" className="rounded-xl border border-border/30 bg-card/10 hover:bg-card/40 hover:border-cyan-500/30 hover:-translate-y-[2px] shadow-sm p-[12px] sm:p-[20px] text-left transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] sm:text-[13px] text-muted-foreground/60 mb-[6px] sm:mb-[8px] font-medium">总浏览量</p>
              <p className="text-[24px] sm:text-[32px] font-bold leading-none tracking-tight">{viewStats?.totalViews?.toLocaleString() ?? "—"}</p>
            </div>
            <div className="flex h-[36px] w-[36px] sm:h-[48px] sm:w-[48px] items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 shadow-inner group-hover:from-cyan-500/20 group-hover:to-blue-600/20 transition-all">
              <TrendingUp className="h-[24px] w-[24px] text-cyan-400" />
            </div>
          </div>
        </a>
      </div>

      {/* ─── 搜索 & 标签筛选 ─── */}
      <div className="mb-[20px] flex flex-col sm:flex-row items-center gap-[16px]">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-[16px] top-1/2 -translate-y-1/2 h-[16px] w-[16px] text-muted-foreground/40" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索文章标题、Slug 或标签..."
            className="h-[44px] w-full rounded-xl border border-border/30 bg-card/20 pl-[44px] pr-[16px] text-[14px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 transition-all"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-[6px] shrink-0">
            <Filter className="h-[14px] w-[14px] text-muted-foreground/40 mr-[8px] hidden sm:block" />
            {allTags.slice(0, 5).map((tag) => (
              <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                className={`h-[30px] px-[12px] rounded-full text-[13px] border transition-all ${
                  selectedTag === tag
                    ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                    : "bg-card/30 text-muted-foreground/60 hover:text-foreground border-border/20 hover:border-border/40"
                }`}
              >{tag}</button>
            ))}
          </div>
        )}
      </div>

      {/* ─── 两栏自适应布局 ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
        {/* 左侧：文章列表区 */}
        <div className="lg:col-span-2">
          <div className="mb-[16px] flex items-center justify-between px-[4px]">
            <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-[8px]">
              <FileText className="h-[16px] w-[16px] text-muted-foreground/60" />
              {filter === "all" ? "所有内容" : filter === "published" ? "已发布内容" : "草稿箱"}
              {selectedTag && <><span className="text-muted-foreground/30">/</span><span className="text-cyan-400">{selectedTag}</span></>}
            </h2>
            <span className="text-[13px] text-muted-foreground/50">{filteredPosts.length} 篇</span>
          </div>

          {loading ? (
            <div className="space-y-[12px]">{[1, 2, 3].map((i) => <div key={i} className="h-[96px] animate-pulse rounded-xl border border-border/20 bg-card/15" />)}</div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/30 bg-card/10 py-[60px] text-center shadow-sm">
              <FileText className="mx-auto mb-[16px] h-[32px] w-[32px] text-muted-foreground/20" />
              <p className="text-[15px] text-muted-foreground/50">
                {search || selectedTag ? "没有找到符合条件的文章" : "内容库还是空的"}
              </p>
              {!search && !selectedTag && (
                <Link href="/admin/editor" className="mt-[16px] inline-flex items-center gap-[6px] h-[36px] px-[16px] rounded-lg bg-foreground/10 text-[14px] hover:bg-foreground/20 text-foreground transition-all">新建第一篇文章 <ArrowLeft className="h-[14px] w-[14px] rotate-180" /></Link>
              )}
            </div>
          ) : (
            <div className="space-y-[12px]">
              {filteredPosts.map((post) => (
                <div key={post.slug} className="group relative flex flex-col sm:flex-row items-stretch sm:items-center gap-[16px] rounded-xl border border-border/30 bg-card/20 p-[20px] shadow-sm hover:shadow-md hover:border-border/60 hover:bg-card/40 transition-all overflow-hidden text-left">
                  {/* 左侧发光修饰条 */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b ${post.coverColor || "from-gray-500/30 to-gray-600/30"} opacity-70 group-hover:opacity-100 transition-opacity`} />
                  
                  <div className="flex-1 min-w-0 pr-[40px] sm:pr-0 pl-[8px]">
                    <div className="flex flex-wrap items-center gap-[10px] mb-[8px]">
                      <Link href={`/admin/editor/${post.slug}`} className="text-[16px] font-semibold text-foreground truncate hover:text-cyan-400 transition-colors leading-tight">{post.title}</Link>
                      {post.pinned && (
                        <Badge variant="outline" className="h-[20px] rounded-md px-[6px] text-[11px] font-medium text-amber-500 border-amber-500/30 bg-amber-500/5">置顶</Badge>
                      )}
                      {!post.published && (
                        <Badge variant="outline" className="h-[20px] rounded-md px-[6px] text-[11px] font-medium text-muted-foreground/60 border-border/40 bg-card/60">草稿</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-[12px] text-[13px] text-muted-foreground/60">
                      <span className="flex items-center gap-[4px]"><Clock className="h-[12px] w-[12px] opacity-70" />{timeAgo(post.updatedAt || post.createdAt)}</span>
                      <span className="flex items-center gap-[4px]"><Eye className="h-[12px] w-[12px] opacity-70" />{(post.viewCount ?? 0).toLocaleString()} 次</span>
                      {post.tags.length > 0 && (
                        <span className="flex items-center gap-[4px]"><Tag className="h-[12px] w-[12px] opacity-70" />{post.tags.slice(0, 3).join(", ")}</span>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 (移动端浮动，桌面端并排) */}
                  <div className="absolute right-[16px] top-[16px] sm:relative sm:right-0 sm:top-0 flex items-center gap-[6px] shrink-0">
                    <a href={`/posts/${post.slug}`} target="_blank" title="在新标签页预览" className="flex h-[36px] w-[36px] items-center justify-center rounded-lg border border-border/40 bg-card/50 text-muted-foreground hover:text-cyan-400 hover:border-cyan-400/40 hover:bg-cyan-400/10 transition-all">
                      <ExternalLink className="h-[16px] w-[16px]" />
                    </a>
                    <Link href={`/admin/editor/${post.slug}`} title="编辑内容" className="flex h-[36px] w-[36px] items-center justify-center rounded-lg border border-border/40 bg-card/50 text-muted-foreground hover:text-amber-400 hover:border-amber-400/40 hover:bg-amber-400/10 transition-all">
                      <Edit className="h-[16px] w-[16px]" />
                    </Link>
                    <button onClick={() => handleDelete(post.slug, post.title)} disabled={deleting === post.slug} title="删除文章" className="flex h-[36px] w-[36px] items-center justify-center rounded-lg border border-border/40 bg-card/50 text-muted-foreground hover:text-red-400 hover:border-red-400/40 hover:bg-red-400/10 transition-all disabled:opacity-30">
                      <Trash2 className={`h-[16px] w-[16px] ${deleting === post.slug ? "animate-pulse" : ""}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧：标签 & 热门侧边栏 */}
        <div className="space-y-[32px]">
          {/* 标签聚合 */}
          {allTags.length > 0 && (
            <div className="rounded-xl border border-border/30 bg-card/10 p-[20px] shadow-sm">
              <h2 className="mb-[16px] text-[14px] font-semibold text-foreground flex items-center gap-[8px]">
                <Tag className="h-[16px] w-[16px] text-muted-foreground/60" />标签分布
              </h2>
              <div className="flex flex-wrap gap-[8px]">
                {allTags.map((tag) => {
                  const count = posts.filter((p) => p.tags.includes(tag)).length;
                  return (
                    <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                      className={`inline-flex items-center gap-[6px] h-[32px] px-[12px] rounded-lg text-[13px] border shadow-sm transition-all ${
                        selectedTag === tag
                          ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                          : "bg-card/40 text-muted-foreground/80 border-border/30 hover:bg-card/80 hover:text-foreground"
                      }`}
                    >
                      {tag}
                      <span className="text-[11px] text-muted-foreground/50 bg-background/50 px-[6px] rounded-full">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 热门文章 Top 5 */}
          {viewStats && viewStats.topPosts.length > 0 && (
            <div className="rounded-xl border border-border/30 bg-card/10 p-[20px] shadow-sm">
              <h2 className="mb-[16px] text-[14px] font-semibold text-foreground flex items-center gap-[8px]">
                <BarChart3 className="h-[16px] w-[16px] text-amber-500/80" />热门内容浏览
              </h2>
              <div className="space-y-[12px]">
                {viewStats.topPosts.slice(0, 5).map((item, i) => (
                  <div key={item.slug} className="group flex items-start gap-[12px]">
                    <div className={`mt-[2px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md text-[12px] font-bold ${
                      i === 0 ? "bg-amber-500/20 text-amber-500" : i === 1 ? "bg-slate-400/20 text-slate-300" : i === 2 ? "bg-amber-700/20 text-amber-600" : "bg-card/50 text-muted-foreground/40 border border-border/30"
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/posts/${item.slug}`} className="block text-[14px] text-foreground/80 hover:text-cyan-400 truncate transition-colors leading-snug">
                        {item.title}
                      </Link>
                      <span className="mt-[4px] flex items-center gap-[4px] text-[12px] text-muted-foreground/50">
                        <Eye className="h-[12px] w-[12px]" />{item.viewCount.toLocaleString()} 次
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
