import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { checkAuth, getToken } from "@/lib/api";
import { ArrowLeft, HardDrive, Cloud, Globe, Download, Trash2, RefreshCw, Shield, Clock, Upload, Eye, FileUp, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";

type R2Backup = { key: string; name: string; size: number; uploaded: string };
type PreviewData = { version: string; exportedAt: string; postCount: number; tagCount: number; postTitles: { title: string; slug: string }[]; settingsKeys: string[] };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days} 天前` : new Date(d).toLocaleDateString("zh-CN");
}

export function AdminBackup() {
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState({ text: "", type: "" as "" | "success" | "error" });
  const [r2Backups, setR2Backups] = useState<R2Backup[]>([]);
  const [r2Loading, setR2Loading] = useState(false);
  const [backing, setBacking] = useState("");
  const [preview, setPreview] = useState<{ name: string; data: PreviewData } | null>(null);
  const [previewLoading, setPreviewLoading] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [restoreMode, setRestoreMode] = useState<"merge" | "overwrite">("merge");
  const [webdavExpanded, setWebdavExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [webdavConfig, setWebdavConfig] = useState({ url: "", username: "", password: "", path: "/monolith-backups" });

  useEffect(() => {
    document.title = "备份管理 | Monolith";
    loadR2Backups();
    loadWebdavConfig();
  }, []);


  const showMsg = useCallback((text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  }, []);

  const authHeaders = { Authorization: `Bearer ${getToken()}` };
  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  // ─── R2 操作 ───
  const loadR2Backups = async () => {
    setR2Loading(true);
    try {
      const res = await fetch("/api/admin/backup/r2-list", { headers: authHeaders });
      const data = await res.json();
      setR2Backups(Array.isArray(data) ? data : []);
    } catch { setR2Backups([]); }
    setR2Loading(false);
  };

  const backupToR2 = async () => {
    setBacking("r2");
    try {
      const res = await fetch("/api/admin/backup/r2", { method: "POST", headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        showMsg(`已备份到 R2（${formatSize(data.size)}）`, "success");
        loadR2Backups();
      } else showMsg("R2 备份失败", "error");
    } catch { showMsg("R2 备份失败", "error"); }
    setBacking("");
  };

  const deleteR2Backup = async (name: string) => {
    if (!confirm(`确定删除备份「${name}」？`)) return;
    try {
      const res = await fetch("/api/admin/backup/r2-delete", {
        method: "POST", headers: jsonHeaders, body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.success) {
        setR2Backups((prev) => prev.filter((b) => b.name !== name));
        if (preview?.name === name) setPreview(null);
        showMsg("已删除", "success");
      } else showMsg(data.error || "删除失败", "error");
    } catch { showMsg("删除失败", "error"); }
  };

  const previewR2Backup = async (name: string) => {
    if (preview?.name === name) { setPreview(null); return; }
    setPreviewLoading(name);
    try {
      const res = await fetch("/api/admin/backup/r2-preview", {
        method: "POST", headers: jsonHeaders, body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.error) { showMsg(data.error, "error"); }
      else { setPreview({ name, data }); }
    } catch { showMsg("预览失败", "error"); }
    setPreviewLoading("");
  };

  const restoreFromR2 = async (name: string) => {
    if (!confirm(`确定从「${name}」恢复数据？\n模式: ${restoreMode === "merge" ? "合并（跳过已有文章）" : "覆盖（更新已有文章）"}\n\n此操作不可撤销，建议先备份当前数据！`)) return;
    setRestoring(true);
    try {
      const res = await fetch("/api/admin/backup/r2-restore", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ name, mode: restoreMode }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`恢复完成：导入 ${data.imported.posts} 篇文章、${data.imported.tags} 个标签`, "success");
      } else {
        showMsg(data.error || "恢复失败", "error");
      }
    } catch { showMsg("恢复请求失败，请检查网络连接", "error"); }
    setRestoring(false);
  };


  // ─── 本地下载 ───
  const downloadLocal = async () => {
    setBacking("local");
    try {
      const res = await fetch("/api/admin/backup/export", { headers: authHeaders });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `monolith-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
      showMsg(`已下载（${data.meta?.postCount || 0} 篇文章）`, "success");
    } catch { showMsg("导出失败", "error"); }
    setBacking("");
  };

  // ─── 本地文件导入 ───
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.posts && !data.tags && !data.settings) {
        showMsg("无效的备份文件格式", "error"); return;
      }

      const postCount = data.posts?.length || 0;
      const tagCount = data.tags?.length || 0;
      if (!confirm(`将导入 ${postCount} 篇文章、${tagCount} 个标签\n模式: ${restoreMode === "merge" ? "合并（跳过已有）" : "覆盖（更新已有）"}\n\n确定继续？`)) return;

      setRestoring(true);
      const res = await fetch("/api/admin/backup/restore", {
        method: "POST", headers: jsonHeaders,
        body: JSON.stringify({ ...data, mode: restoreMode }),
      });
      const result = await res.json();
      if (result.success) {
        showMsg(`导入完成：${result.imported.posts} 篇文章、${result.imported.tags} 个标签、${result.imported.settings} 项设置`, "success");
      } else {
        showMsg(result.error || "导入失败", "error");
      }
    } catch { showMsg("文件解析失败，请确认是有效的 JSON 备份", "error"); }
    setRestoring(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── WebDAV ───
  const loadWebdavConfig = async () => {
    try {
      const res = await fetch("/api/admin/settings", { headers: authHeaders });
      const s = await res.json();
      if (s.webdav_url) setWebdavConfig({ url: s.webdav_url || "", username: s.webdav_username || "", password: s.webdav_password || "", path: s.webdav_path || "/monolith-backups" });
    } catch {}
  };

  const saveWebdavConfig = async () => {
    try {
      await fetch("/api/admin/settings", { method: "PUT", headers: jsonHeaders, body: JSON.stringify({ webdav_url: webdavConfig.url, webdav_username: webdavConfig.username, webdav_password: webdavConfig.password, webdav_path: webdavConfig.path }) });
      showMsg("WebDAV 配置已保存", "success");
    } catch { showMsg("保存失败", "error"); }
  };

  const backupToWebdav = async () => {
    if (!webdavConfig.url || !webdavConfig.username) { showMsg("请先配置 WebDAV", "error"); return; }
    setBacking("webdav");
    try {
      const res = await fetch("/api/admin/backup/webdav", { method: "POST", headers: jsonHeaders, body: JSON.stringify(webdavConfig) });
      const data = await res.json();
      data.success ? showMsg(`已备份到 WebDAV（${formatSize(data.size)}）`, "success") : showMsg(data.error || "失败", "error");
    } catch { showMsg("WebDAV 连接失败", "error"); }
    setBacking("");
  };

  const inputClass = "h-[34px] w-full rounded-md border border-border/25 bg-background/20 px-[12px] text-[13px] text-foreground placeholder:text-muted-foreground/20 outline-none focus:border-foreground/15 transition-colors";

  return (
    <div className="mx-auto w-full max-w-[720px] py-[24px] sm:py-[32px] px-[16px] sm:px-0">
      {/* 顶栏 */}
      <div className="mb-[24px] flex flex-col sm:flex-row sm:items-center justify-between gap-[8px]">
        <div className="flex items-center gap-[16px]">
          <Link href="/admin" className="inline-flex items-center gap-[5px] text-[13px] text-muted-foreground/50 hover:text-foreground transition-colors">
            <ArrowLeft className="h-[13px] w-[13px]" />返回
          </Link>
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">备份管理</h1>
            <p className="text-[12px] text-muted-foreground/35 mt-[2px]">备份、恢复、管理你的博客数据</p>
          </div>
        </div>
        {message.text && (
          <span className={`text-[12px] px-[10px] py-[3px] rounded-md transition-all animate-fade-in ${message.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {message.type === "success" ? "✓" : "✕"} {message.text}
          </span>
        )}
      </div>

      {/* ─── 快速备份 ─── */}
      <section className="mb-[20px]">
        <SectionTitle icon={Shield} title="快速备份" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[8px]">
          <ActionCard icon={Cloud} color="orange" label="R2 云备份" desc="Cloudflare R2 存储" loading={backing === "r2"} onClick={backupToR2} disabled={!!backing} />
          <ActionCard icon={Globe} color="blue" label="WebDAV" desc="坚果云 / NextCloud" loading={backing === "webdav"} onClick={backupToWebdav} disabled={!!backing} />
          <ActionCard icon={HardDrive} color="emerald" label="本地下载" desc="JSON 文件" loading={backing === "local"} onClick={downloadLocal} disabled={!!backing} />
        </div>
      </section>

      {/* ─── 导入恢复 ─── */}
      <section className="mb-[20px]">
        <SectionTitle icon={FileUp} title="导入恢复" />
        <div className="rounded-lg border border-border/25 bg-card/15 p-[16px]">
          <div className="flex items-center justify-between mb-[10px]">
            <div>
              <p className="text-[13px] text-foreground">从 JSON 文件恢复</p>
              <p className="text-[11px] text-muted-foreground/35 mt-[1px]">上传之前导出的备份文件来恢复数据</p>
            </div>
            <div className="flex items-center gap-[6px]">
              <select value={restoreMode} onChange={(e) => setRestoreMode(e.target.value as "merge" | "overwrite")}
                className="h-[28px] rounded-md border border-border/25 bg-background/20 px-[8px] text-[11px] text-muted-foreground outline-none"
              >
                <option value="merge">合并导入</option>
                <option value="overwrite">覆盖导入</option>
              </select>
              <input type="file" ref={fileInputRef} accept=".json" className="hidden" onChange={handleFileImport} />
              <button onClick={() => fileInputRef.current?.click()} disabled={restoring}
                className="inline-flex items-center gap-[4px] h-[28px] px-[10px] rounded-md bg-foreground text-background text-[11px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Upload className="h-[10px] w-[10px]" />{restoring ? "导入中..." : "选择文件"}
              </button>
            </div>
          </div>
          <div className="flex gap-[12px] text-[10px] text-muted-foreground/25">
            <span>📋 <b>合并</b>：跳过已存在的文章，仅添加新数据</span>
            <span>🔄 <b>覆盖</b>：更新已存在的文章内容</span>
          </div>
        </div>
      </section>

      {/* ─── R2 备份历史 ─── */}
      <section className="mb-[20px]">
        <div className="flex items-center justify-between mb-[10px]">
          <SectionTitle icon={Clock} title="R2 备份历史" />
          <button onClick={loadR2Backups} className="p-[5px] rounded-md text-muted-foreground/25 hover:text-foreground transition-colors">
            <RefreshCw className={`h-[12px] w-[12px] ${r2Loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="rounded-lg border border-border/25 overflow-hidden">
          {r2Loading ? (
            <div className="py-[28px] text-center text-[11px] text-muted-foreground/25">加载中...</div>
          ) : r2Backups.length === 0 ? (
            <div className="py-[28px] text-center text-[11px] text-muted-foreground/20">还没有 R2 备份，点击上方"R2 云备份"创建第一个</div>
          ) : (
            r2Backups.map((backup, i) => (
              <div key={backup.key}>
                <div className={`flex items-center justify-between px-[14px] py-[10px] ${i < r2Backups.length - 1 && preview?.name !== backup.name ? "border-b border-border/10" : ""} hover:bg-card/10 transition-colors`}>
                  <div className="flex items-center gap-[8px]">
                    <Cloud className="h-[12px] w-[12px] text-orange-400/40 shrink-0" />
                    <div>
                      <p className="text-[11px] text-foreground/70 font-mono truncate max-w-[320px]">{backup.name}</p>
                      <p className="text-[10px] text-muted-foreground/25">{formatSize(backup.size)} · {timeAgo(backup.uploaded)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-[1px] shrink-0">
                    <button onClick={() => previewR2Backup(backup.name)} title="预览内容"
                      className={`p-[5px] rounded-md transition-colors ${preview?.name === backup.name ? "text-foreground bg-accent/15" : "text-muted-foreground/20 hover:text-foreground"}`}
                    >
                      <Eye className={`h-[11px] w-[11px] ${previewLoading === backup.name ? "animate-pulse" : ""}`} />
                    </button>
                    <button onClick={() => deleteR2Backup(backup.name)} title="删除"
                      className="p-[5px] rounded-md text-muted-foreground/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-[11px] w-[11px]" />
                    </button>
                  </div>
                </div>
                {/* 预览面板 */}
                {preview?.name === backup.name && (
                  <div className="px-[14px] pb-[12px] pt-[4px] border-b border-border/10 bg-card/5 animate-fade-in">
                    <div className="grid grid-cols-4 gap-[8px] mb-[8px]">
                      <MiniStat label="版本" value={preview.data.version} />
                      <MiniStat label="文章" value={String(preview.data.postCount)} />
                      <MiniStat label="标签" value={String(preview.data.tagCount)} />
                      <MiniStat label="设置项" value={String(preview.data.settingsKeys.length)} />
                    </div>
                    {preview.data.postTitles.length > 0 && (
                      <div className="mb-[8px]">
                        <p className="text-[9px] text-muted-foreground/25 uppercase tracking-wider mb-[4px]">包含文章</p>
                        <div className="flex flex-wrap gap-[4px]">
                          {preview.data.postTitles.map((p) => (
                            <span key={p.slug} className="text-[10px] text-muted-foreground/40 bg-card/20 px-[6px] py-[1px] rounded">{p.title}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-[9px] text-muted-foreground/20">备份时间: {new Date(preview.data.exportedAt).toLocaleString("zh-CN")}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* ─── WebDAV 配置（可折叠） ─── */}
      <section>
        <button onClick={() => setWebdavExpanded(!webdavExpanded)} className="flex w-full items-center justify-between mb-[10px] group">
          <SectionTitle icon={Globe} title="WebDAV 配置" />
          {webdavExpanded ? <ChevronUp className="h-[12px] w-[12px] text-muted-foreground/25" /> : <ChevronDown className="h-[12px] w-[12px] text-muted-foreground/25" />}
        </button>
        {webdavExpanded && (
          <div className="rounded-lg border border-border/25 bg-card/15 p-[16px] space-y-[10px] animate-fade-in">
            <div>
              <label className="mb-[2px] block text-[10px] text-muted-foreground/30 uppercase tracking-wider">服务器地址</label>
              <input value={webdavConfig.url} onChange={(e) => setWebdavConfig((p) => ({ ...p, url: e.target.value }))} placeholder="https://dav.jianguoyun.com/dav/" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-[8px]">
              <div>
                <label className="mb-[2px] block text-[10px] text-muted-foreground/30 uppercase tracking-wider">用户名</label>
                <input value={webdavConfig.username} onChange={(e) => setWebdavConfig((p) => ({ ...p, username: e.target.value }))} placeholder="you@example.com" className={inputClass} />
              </div>
              <div>
                <label className="mb-[2px] block text-[10px] text-muted-foreground/30 uppercase tracking-wider">密码 / 应用密钥</label>
                <input type="password" value={webdavConfig.password} onChange={(e) => setWebdavConfig((p) => ({ ...p, password: e.target.value }))} placeholder="••••••••" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="mb-[2px] block text-[10px] text-muted-foreground/30 uppercase tracking-wider">远程路径</label>
              <input value={webdavConfig.path} onChange={(e) => setWebdavConfig((p) => ({ ...p, path: e.target.value }))} placeholder="/monolith-backups" className={inputClass} />
            </div>
            <div className="flex items-center justify-between pt-[2px]">
              <p className="text-[10px] text-muted-foreground/20">坚果云 / NextCloud / Synology 等</p>
              <button onClick={saveWebdavConfig} className="h-[28px] px-[10px] rounded-md bg-foreground text-background text-[11px] font-medium hover:opacity-90 transition-opacity">保存配置</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── 子组件 ───
function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-[6px] mb-[10px]">
      <Icon className="h-[13px] w-[13px] text-muted-foreground/30" />
      <h2 className="text-[12px] font-medium text-muted-foreground/50 uppercase tracking-[0.06em]">{title}</h2>
    </div>
  );
}

function ActionCard({ icon: Icon, color, label, desc, loading, onClick, disabled }: {
  icon: React.ElementType; color: string; label: string; desc: string; loading: boolean; onClick: () => void; disabled: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="rounded-lg border border-border/25 bg-card/15 p-[14px] text-left hover:bg-card/25 transition-all disabled:opacity-40 card-hover"
    >
      <div className="flex items-center gap-[8px] mb-[6px]">
        <div className={`flex h-[28px] w-[28px] items-center justify-center rounded-md bg-${color}-500/10`}>
          <Icon className={`h-[12px] w-[12px] text-${color}-400 ${loading ? "animate-spin" : ""}`} />
        </div>
        <span className="text-[12px] font-medium">{label}</span>
      </div>
      <p className="text-[10px] text-muted-foreground/30 leading-[1.4]">{desc}</p>
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-card/15 px-[8px] py-[5px] text-center">
      <p className="text-[13px] font-semibold text-foreground/70">{value}</p>
      <p className="text-[9px] text-muted-foreground/25">{label}</p>
    </div>
  );
}
