import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { fetchPost, createPost, updatePost, uploadImage, localizePostImages } from "@/lib/api";
import { renderMarkdown } from "@/lib/markdown";
import { ArrowLeft, Save, Eye, EyeOff, Upload, Image, ChevronDown, ChevronUp, Bold, Italic, Heading2, Heading3, Link2, Code, Quote, List, ListOrdered, Minus, Maximize2, Minimize2, Table, CheckSquare, FileCode, ImageDown } from "lucide-react";
import { Link } from "wouter";
import Editor, { type Monaco } from "@monaco-editor/react";
import type * as MonacoTypes from "monaco-editor";

/** 注册 Monolith 暗色主题 — 暗夜琥珀：黑 + 金点缀 */
function handleEditorWillMount(monaco: Monaco) {
  monaco.editor.defineTheme("monolith-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      // ─── Markdown 专属 ───
      { token: "markup.heading", foreground: "e0a84c", fontStyle: "bold" },       // 标题 → 琥珀金
      { token: "markup.bold", foreground: "e8e4df", fontStyle: "bold" },          // 粗体 → 暖白
      { token: "markup.italic", foreground: "d4a76a", fontStyle: "italic" },      // 斜体 → 淡金
      { token: "string.link", foreground: "6fb3d2" },                             // 链接 → 柔蓝
      { token: "markup.underline.link", foreground: "6fb3d2" },                   // 链接 URL
      { token: "markup.inline.raw", foreground: "7ec699" },                       // 行内代码 → 翡翠绿
      { token: "markup.fenced_code", foreground: "7ec699" },                      // 代码块 → 翡翠绿
      { token: "markup.list", foreground: "e0a84c" },                             // 列表标记 → 琥珀金
      { token: "markup.quote", foreground: "8a8a8a", fontStyle: "italic" },       // 引用 → 暖灰斜体
      // ─── 通用 ───
      { token: "comment", foreground: "6a6a6a", fontStyle: "italic" },            // 注释 → 中灰
      { token: "keyword", foreground: "e0a84c" },                                 // 关键字 → 琥珀金
      { token: "string", foreground: "7ec699" },                                  // 字符串 → 翡翠绿
      { token: "number", foreground: "d4a76a" },                                  // 数字 → 淡金
      { token: "type", foreground: "6fb3d2" },                                    // 类型 → 柔蓝
      { token: "variable", foreground: "ccc8c2" },                                // 变量 → 暖白
      { token: "operator", foreground: "a0a0a0" },                                // 运算符 → 浅灰
    ],
    colors: {
      // 背景：中性深灰（不带蓝紫调）
      "editor.background": "#1c1c1e",
      "editor.foreground": "#c8c4be",
      // 行高亮 — 微暖灰
      "editor.lineHighlightBackground": "#222224",
      "editor.lineHighlightBorder": "#00000000",
      // 选区 — 中性灰
      "editor.selectionBackground": "#44444450",
      "editor.inactiveSelectionBackground": "#33333330",
      "editor.selectionHighlightBackground": "#44444425",
      // 光标 — 琥珀金
      "editorCursor.foreground": "#e0a84c",
      "editorCursor.background": "#1c1c1e",
      // 辅助元素
      "editorWhitespace.foreground": "#2a2a2c",
      "editorIndentGuide.background": "#2a2a2c",
      "editorIndentGuide.activeBackground": "#3a3a3c",
      "editorLineNumber.foreground": "#3a3a3c",
      "editorLineNumber.activeForeground": "#6a6a6a",
      // 括号匹配 — 微金色
      "editorBracketMatch.background": "#e0a84c15",
      "editorBracketMatch.border": "#e0a84c40",
      // 滚动条
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#44444425",
      "scrollbarSlider.hoverBackground": "#44444450",
      "scrollbarSlider.activeBackground": "#44444470",
      // 搜索高亮 — 金色
      "editor.findMatchBackground": "#e0a84c33",
      "editor.findMatchHighlightBackground": "#e0a84c1a",
      // 概览标尺
      "editorOverviewRuler.border": "#00000000",
      // Widget
      "editorWidget.background": "#1c1c1e",
      "editorWidget.border": "#2a2a2c",
    },
  });
}



/** 生成 Slug（中文转拼音首字母 + 英文保留） */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "")
    .replace(/[\u4e00-\u9fa5]+/g, (m) => m.split("").map((c) => c.charCodeAt(0).toString(36)).join(""))
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** 本地草稿存储 */
const DRAFT_KEY = "monolith_editor_draft";
function saveDraft(slug: string, data: Record<string, unknown>) {
  try { localStorage.setItem(`${DRAFT_KEY}_${slug || "new"}`, JSON.stringify(data)); } catch { /* 忽略 */ }
}
function loadDraft(slug: string) {
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY}_${slug || "new"}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function clearDraft(slug: string) {
  try { localStorage.removeItem(`${DRAFT_KEY}_${slug || "new"}`); } catch { /* 忽略 */ }
}

export function AdminEditor() {
  const params = useParams<{ slug?: string }>();
  const [, setLocation] = useLocation();
  const isEdit = !!params.slug;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<MonacoTypes.editor.IStandaloneCodeEditor | null>(null);

  const [form, setForm] = useState({
    slug: "",
    title: "",
    content: "",
    excerpt: "",
    coverColor: "from-cyan-500/20 to-blue-600/20",
    tags: "",
    published: true,
    pinned: false,
    publishAt: "",
    seriesSlug: "",
    seriesOrder: 0,
    category: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" as "" | "success" | "error" });
  const [showPreview, setShowPreview] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [metaCollapsed, setMetaCollapsed] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!isEdit);
  const [lastSaved, setLastSaved] = useState<string>("");

  useEffect(() => {
    document.title = isEdit ? "编辑文章 | Monolith" : "新建文章 | Monolith";

    if (isEdit && params.slug) {
      fetchPost(params.slug).then((post) => {
        setForm({
          slug: post.slug,
          title: post.title,
          content: post.content,
          excerpt: post.excerpt || "",
          coverColor: post.coverColor || "",
          tags: post.tags.join(", "),
          published: post.published,
          pinned: post.pinned,
          publishAt: post.publishAt ? new Date(new Date(post.publishAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "",
          seriesSlug: post.seriesSlug || "",
          seriesOrder: post.seriesOrder ?? 0,
          category: post.category || "",
        });
        setAutoSlug(false);
      });
    } else {
      // 新建时尝试恢复草稿
      const draft = loadDraft("new");
      if (draft && draft.content) {
        setForm((prev) => ({ ...prev, ...draft }));
        showMsg("已恢复本地草稿", "success");
      }
    }
  }, [isEdit, params.slug, setLocation]);

  useEffect(() => {
    const chars = form.content.replace(/\s/g, "").length;
    setWordCount(chars);
  }, [form.content]);

  // 自动保存草稿（每 10 秒）
  useEffect(() => {
    const timer = setInterval(() => {
      if (form.content.trim()) {
        saveDraft(params.slug || "", form);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [form, params.slug]);

  // Ctrl+S 保存
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [form]);

  const showMsg = useCallback((text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  }, []);

  const handleSave = async () => {
    if (!form.slug || !form.title) {
      showMsg("请填写 Slug 和标题", "error");
      return;
    }

    setSaving(true);
    try {
      const tagsList = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const payload = {
        slug: form.slug,
        title: form.title,
        content: form.content,
        excerpt: form.excerpt,
        coverColor: form.coverColor,
        published: form.published,
        tags: tagsList,
        pinned: form.pinned,
        publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null,
        seriesSlug: form.seriesSlug || null,
        seriesOrder: form.seriesOrder,
        category: form.category,
      };

      if (isEdit && params.slug) {
        await updatePost(params.slug, payload);
        setLastSaved(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
        showMsg("已保存", "success");
        clearDraft(params.slug);
      } else {
        await createPost(payload);
        showMsg("已创建，即将跳转...", "success");
        clearDraft("new");
        setTimeout(() => setLocation("/admin"), 1200);
      }
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : "操作失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const placeholder = `![上传中... ${file.name}](uploading)`;
    insertText(placeholder);
    try {
      const result = await uploadImage(file);
      // 替换占位符为实际 URL
      const editor = editorRef.current;
      if (editor) {
        const model = editor.getModel();
        if (model) {
          const fullText = model.getValue();
          const idx = fullText.indexOf(placeholder);
          if (idx !== -1) {
            const before = fullText.substring(0, idx);
            const startLine = (before.match(/\n/g) || []).length + 1;
            const startCol = before.length - before.lastIndexOf("\n");
            const endCol = startCol + placeholder.length;
            editor.executeEdits("paste-image", [{
              range: {
                startLineNumber: startLine,
                startColumn: startCol,
                endLineNumber: startLine,
                endColumn: endCol,
              },
              text: `![${file.name}](${result.url})`,
            }]);
          } else {
            // 占位符未找到（可能被手动删除），直接插入
            insertText(`![${file.name}](${result.url})`);
          }
        }
      } else {
        // fallback：直接替换 form 中的内容
        setForm((prev) => ({
          ...prev,
          content: prev.content.replace(placeholder, `![${file.name}](${result.url})`),
        }));
      }
      showMsg("图片已上传", "success");
    } catch {
      // 上传失败，移除占位符
      const editor = editorRef.current;
      if (editor) {
        const model = editor.getModel();
        if (model) {
          const fullText = model.getValue();
          const newText = fullText.replace(placeholder, "");
          model.setValue(newText);
        }
      } else {
        setForm((prev) => ({ ...prev, content: prev.content.replace(placeholder, "") }));
      }
      showMsg("图片上传失败", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleImageUpload(file);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) handleImageUpload(file);
      }
    }
  }, []);

  const updateField = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // 标题变化时自动更新 Slug
      if (key === "title" && autoSlug && typeof value === "string") {
        next.slug = generateSlug(value);
      }
      return next;
    });
  };

  /** 在 Monaco 编辑器中插入文本 */
  const insertText = useCallback((text: string) => {
    const editor = editorRef.current;
    if (editor) {
      const selection = editor.getSelection();
      const position = selection ? selection.getStartPosition() : editor.getPosition();
      if (position) {
        editor.executeEdits("toolbar", [{
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          text: text,
        }]);
        editor.focus();
      }
    } else {
      setForm((prev) => ({ ...prev, content: prev.content + text }));
    }
  }, []);

  /** 在 Monaco 中包裹选中文本 */
  const wrapSelection = useCallback((before: string, after: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = editor.getSelection();
    if (!selection) return;

    const selectedText = editor.getModel()?.getValueInRange(selection) || "";
    const replacement = selectedText ? `${before}${selectedText}${after}` : `${before}文本${after}`;

    editor.executeEdits("toolbar", [{
      range: selection,
      text: replacement,
    }]);
    editor.focus();
  }, []);

  /** 在行首插入文本 */
  const insertLinePrefix = useCallback((prefix: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const position = editor.getPosition();
    if (!position) return;

    editor.executeEdits("toolbar", [{
      range: {
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: 1,
      },
      text: prefix,
    }]);
    editor.focus();
  }, []);

  const toolbarActions = [
    { icon: Bold, label: "粗体", shortcut: "Ctrl+B", action: () => wrapSelection("**", "**") },
    { icon: Italic, label: "斜体", shortcut: "Ctrl+I", action: () => wrapSelection("*", "*") },
    { icon: null, label: "sep1" },
    { icon: Heading2, label: "二级标题", action: () => insertLinePrefix("## ") },
    { icon: Heading3, label: "三级标题", action: () => insertLinePrefix("### ") },
    { icon: null, label: "sep2" },
    { icon: Link2, label: "链接", action: () => insertText("[链接文本](https://example.com)") },
    { icon: Code, label: "行内代码", action: () => wrapSelection("`", "`") },
    { icon: FileCode, label: "代码块", action: () => insertText("\n```typescript\n// 代码\n```\n") },
    { icon: Quote, label: "引用", action: () => insertLinePrefix("> ") },
    { icon: null, label: "sep3" },
    { icon: List, label: "无序列表", action: () => insertLinePrefix("- ") },
    { icon: ListOrdered, label: "有序列表", action: () => insertLinePrefix("1. ") },
    { icon: CheckSquare, label: "任务列表", action: () => insertLinePrefix("- [ ] ") },
    { icon: Table, label: "表格", action: () => insertText("\n| 列一 | 列二 | 列三 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n") },
    { icon: Minus, label: "分隔线", action: () => insertText("\n---\n") },
  ];

  const colorPresets = [
    { label: "赛博青", value: "from-cyan-500/20 to-blue-600/20" },
    { label: "冷翡翠", value: "from-emerald-500/20 to-teal-600/20" },
    { label: "深海蓝", value: "from-indigo-500/20 to-blue-700/20" },
    { label: "琥珀金", value: "from-amber-500/20 to-orange-600/20" },
    { label: "钛金灰", value: "from-zinc-500/20 to-slate-500/20" },
    { label: "石板墨", value: "from-slate-600/20 to-gray-700/20" },
  ];

  return (
    <div
      className="mx-auto w-full max-w-[1200px] py-[24px] flex flex-col h-[calc(100vh-56px)]"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onPaste={handlePaste}
    >
      {/* ─── 顶栏 ─── */}
      <div className="mb-[12px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-[12px]">
          <Link href="/admin" className="inline-flex items-center gap-[5px] text-[13px] text-muted-foreground/50 hover:text-foreground transition-colors">
            <ArrowLeft className="h-[13px] w-[13px]" />返回
          </Link>
          <span className="text-[12px] text-muted-foreground/20">|</span>
          <span className="text-[11px] text-muted-foreground/35 font-mono">{wordCount} 字</span>
          {lastSaved && (
            <>
              <span className="text-[12px] text-muted-foreground/20">|</span>
              <span className="text-[11px] text-muted-foreground/30">上次保存 {lastSaved}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-[6px]">
          {message.text && (
            <span className={`text-[12px] px-[10px] py-[3px] rounded-md transition-all ${
              message.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
            }`}>
              {message.type === "success" ? "✓" : "✕"} {message.text}
            </span>
          )}
          <button onClick={() => setZenMode(!zenMode)} title="专注模式" className="h-[30px] px-[8px] rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-accent/20 transition-colors">
            {zenMode ? <Minimize2 className="h-[13px] w-[13px]" /> : <Maximize2 className="h-[13px] w-[13px]" />}
          </button>
          <button onClick={() => setShowPreview(!showPreview)} title={showPreview ? "隐藏预览" : "显示预览"} className={`h-[30px] px-[8px] rounded-md transition-colors ${showPreview ? "text-foreground bg-accent/20" : "text-muted-foreground/40 hover:text-foreground"}`}>
            {showPreview ? <Eye className="h-[13px] w-[13px]" /> : <EyeOff className="h-[13px] w-[13px]" />}
          </button>
          <label className="flex items-center gap-[5px] text-[12px] text-muted-foreground/50 cursor-pointer select-none">
            <input type="checkbox" checked={form.published} onChange={(e) => updateField("published", e.target.checked)} className="rounded accent-foreground" />
            发布
          </label>
          <label className="flex items-center gap-[5px] text-[12px] text-amber-500/60 hover:text-amber-500/80 cursor-pointer select-none transition-colors">
            <input type="checkbox" checked={form.pinned} onChange={(e) => updateField("pinned", e.target.checked)} className="rounded accent-amber-500" />
            置顶
          </label>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-[4px] h-[30px] px-[12px] rounded-md bg-foreground text-background text-[12px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Save className="h-[11px] w-[11px]" />{saving ? "保存中..." : "保存"}
          </button>
          {isEdit && (
            <button
              onClick={async () => {
                if (!params.slug) return;
                try {
                  // 先保存当前修改，确保后端基于最新内容操作
                  showMsg("正在保存并转换外链图片...", "success");
                  await handleSave();
                  const result = await localizePostImages(params.slug);
                  if (result.replaced > 0) {
                    showMsg(`已转换 ${result.replaced} 张图片${result.failed ? `，${result.failed} 张失败` : ""}`, "success");
                    // 重新加载文章内容到编辑器
                    const fresh = await fetchPost(params.slug);
                    if (fresh) updateField("content", fresh.content);
                  } else {
                    showMsg(result.message || "未发现外链图片", "success");
                  }
                } catch { showMsg("外链转本地失败", "error"); }
              }}
              title="将文章中的外链图片下载到本地存储"
              className="inline-flex items-center gap-[4px] h-[30px] px-[8px] rounded-md text-[12px] text-muted-foreground/50 hover:text-foreground hover:bg-accent/15 transition-colors"
            >
              <ImageDown className="h-[12px] w-[12px]" />外链转本地
            </button>
          )}
        </div>
      </div>

      {/* ─── 元信息面板（可折叠） ─── */}
      {!zenMode && (
        <div className="mb-[8px] shrink-0 rounded-lg border border-border/25 bg-card/15 overflow-hidden transition-all">
          <button
            onClick={() => setMetaCollapsed(!metaCollapsed)}
            className="flex w-full items-center justify-between px-[16px] py-[8px] text-[11px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
          >
            <span className="uppercase tracking-[0.08em]">
              {form.title || "文章元信息"}
            </span>
            {metaCollapsed ? <ChevronDown className="h-[12px] w-[12px]" /> : <ChevronUp className="h-[12px] w-[12px]" />}
          </button>

          {!metaCollapsed && (
            <div className="px-[16px] pb-[14px] pt-[2px]">
              <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-3 lg:grid-cols-5">
                <div>
                  <label className="mb-[2px] block text-[10px] text-muted-foreground/35 uppercase tracking-wider">Slug {autoSlug && <span className="text-blue-400/50">（自动）</span>}</label>
                  <input
                    value={form.slug}
                    onChange={(e) => { updateField("slug", e.target.value); setAutoSlug(false); }}
                    placeholder="my-article" disabled={isEdit}
                    className="h-[30px] w-full rounded-md border border-border/25 bg-background/20 px-[10px] text-[12px] text-foreground font-mono placeholder:text-muted-foreground/20 outline-none focus:border-foreground/15 disabled:opacity-40 transition-colors"
                  />
                </div>
                <div>
                  <label className="mb-[2px] block text-[10px] text-muted-foreground/35 uppercase tracking-wider">标签</label>
                  <input
                    value={form.tags} onChange={(e) => updateField("tags", e.target.value)}
                    placeholder="Next.js, 前端"
                    className="h-[30px] w-full rounded-md border border-border/25 bg-background/20 px-[10px] text-[12px] text-foreground placeholder:text-muted-foreground/20 outline-none focus:border-foreground/15 transition-colors"
                  />
                </div>
                <div>
                  <label className="mb-[2px] block text-[10px] text-muted-foreground/35 uppercase tracking-wider">定时发布</label>
                  <input
                    type="datetime-local"
                    value={form.publishAt}
                    onChange={(e) => updateField("publishAt", e.target.value)}
                    className="h-[30px] w-full rounded-md border border-border/25 bg-background/20 px-[10px] text-[12px] text-foreground placeholder:text-muted-foreground/20 outline-none focus:border-foreground/15 transition-colors dark:[color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="mb-[2px] block text-[10px] text-muted-foreground/35 uppercase tracking-wider">封面色</label>
                  <div className="flex gap-[3px] h-[30px] items-center">
                    {colorPresets.map((preset) => (
                      <button key={preset.value} onClick={() => updateField("coverColor", preset.value)} title={preset.label}
                        className={`h-[20px] w-[20px] rounded-[3px] bg-gradient-to-r ${preset.value} border-2 transition-all ${
                          form.coverColor === preset.value ? "border-foreground/50 scale-110" : "border-transparent opacity-50 hover:opacity-90"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-[2px] block text-[10px] text-muted-foreground/35 uppercase tracking-wider">系列 Slug</label>
                  <input
                    value={form.seriesSlug}
                    onChange={(e) => updateField("seriesSlug", e.target.value)}
                    placeholder="如 react-tutorial"
                    className="h-[30px] w-full rounded-md border border-border/25 bg-background/20 px-[10px] text-[12px] text-foreground font-mono placeholder:text-muted-foreground/20 outline-none focus:border-foreground/15 transition-colors"
                  />
                </div>
                <div>
                  <label className="mb-[2px] block text-[10px] text-muted-foreground/35 uppercase tracking-wider">分类</label>
                  <input
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    placeholder="如 前端、后端、DevOps"
                    className="h-[30px] w-full rounded-md border border-border/25 bg-background/20 px-[10px] text-[12px] text-foreground placeholder:text-muted-foreground/20 outline-none focus:border-foreground/15 transition-colors"
                  />
                </div>
              </div>
              <input
                value={form.title} onChange={(e) => updateField("title", e.target.value)}
                placeholder="文章标题"
                className="mt-[10px] w-full border-none bg-transparent text-[20px] font-semibold tracking-[-0.02em] text-foreground placeholder:text-muted-foreground/20 outline-none"
              />
              <textarea
                value={form.excerpt} onChange={(e) => updateField("excerpt", e.target.value)}
                placeholder="文章摘要（可选，用于列表展示）" rows={1}
                className="mt-[6px] w-full resize-none bg-transparent text-[12px] leading-[1.7] text-muted-foreground/60 placeholder:text-muted-foreground/20 outline-none"
              />
            </div>
          )}
        </div>
      )}

      {/* ─── 编辑器 + 预览 ─── */}
      <div className={`flex-1 min-h-0 grid ${showPreview ? "grid-cols-2 gap-[1px]" : "grid-cols-1"} rounded-lg border border-border/25 overflow-hidden`}>
        {/* 左侧 Monaco 编辑器 */}
        <div className="flex flex-col min-h-0">
          {/* 工具栏 */}
          <div className="flex items-center justify-between px-[8px] py-[4px] border-b border-border/15 bg-card/10 shrink-0 overflow-x-auto">
            <div className="flex items-center gap-[1px] shrink-0">
              {toolbarActions.map((item) => {
                if (!item.icon) return <div key={item.label} className="w-[1px] h-[16px] bg-border/15 mx-[4px]" />;
                const Icon = item.icon;
                return (
                  <button key={item.label} onClick={item.action} title={`${item.label}${item.shortcut ? ` (${item.shortcut})` : ""}`}
                    className="h-[26px] w-[26px] rounded-[4px] inline-flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-accent/20 transition-colors"
                  >
                    <Icon className="h-[13px] w-[13px]" />
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-[4px]">
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="inline-flex items-center gap-[3px] h-[24px] px-[6px] rounded-[4px] text-[10px] text-muted-foreground/40 hover:text-foreground hover:bg-accent/20 transition-colors disabled:opacity-50"
              >
                {uploading ? <Upload className="h-[10px] w-[10px] animate-pulse" /> : <Image className="h-[10px] w-[10px]" />}
                {uploading ? "上传中" : "插图"}
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={form.content}
              onChange={(val) => updateField("content", val || "")}
              theme="monolith-dark"
              beforeMount={handleEditorWillMount}
              onMount={(editor) => {
                editorRef.current = editor;
                // 监听 Monaco 编辑器的 paste 事件（处理粘贴图片）
                const domNode = editor.getDomNode();
                if (domNode) {
                  domNode.addEventListener("paste", (e: Event) => {
                    const ce = e as ClipboardEvent;
                    const items = ce.clipboardData?.items;
                    if (!items) return;
                    for (const item of items) {
                      if (item.type.startsWith("image/")) {
                        ce.preventDefault();
                        ce.stopPropagation();
                        const file = item.getAsFile();
                        if (file) handleImageUpload(file);
                        return;
                      }
                    }
                  });
                  // 拖拽上传
                  domNode.addEventListener("drop", (e: Event) => {
                    const de = e as DragEvent;
                    de.preventDefault();
                    const file = de.dataTransfer?.files[0];
                    if (file?.type.startsWith("image/")) handleImageUpload(file);
                  });
                  domNode.addEventListener("dragover", (e: Event) => { e.preventDefault(); });
                }
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineHeight: 24,
                fontFamily: "'Cascadia Code', 'Fira Code', ui-monospace, monospace",
                wordWrap: "on",
                padding: { top: 12, bottom: 12 },
                scrollBeyondLastLine: false,
                renderLineHighlight: "none",
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
                scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
                guides: { indentation: false },
                lineNumbers: "off",
                folding: false,
                glyphMargin: false,
                lineDecorationsWidth: 16,
                lineNumbersMinChars: 0,
                tabSize: 2,
                suggest: { showWords: false },
                quickSuggestions: false,
              }}
            />
          </div>
        </div>

        {/* 右侧实时预览 */}
        {showPreview && (
          <div className="flex flex-col min-h-0 border-l border-border/15">
            <div className="px-[12px] py-[6px] border-b border-border/15 bg-card/10 shrink-0">
              <span className="text-[10px] text-muted-foreground/35">预览</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-[24px]">
              {form.title && (
                <h1 className="text-[22px] font-semibold tracking-[-0.02em] mb-[16px]">{form.title}</h1>
              )}
              <div className="prose-monolith" dangerouslySetInnerHTML={{ __html: renderMarkdown(form.content) }} />
            </div>
          </div>
        )}
      </div>

      {/* ─── 底部快捷键提示 ─── */}
      {!zenMode && (
        <div className="mt-[6px] flex items-center justify-center gap-[16px] text-[10px] text-muted-foreground/20 shrink-0">
          <span><kbd className="px-[4px] py-[1px] rounded border border-border/15 text-[9px]">Ctrl+S</kbd> 保存</span>
          <span><kbd className="px-[4px] py-[1px] rounded border border-border/15 text-[9px]">Ctrl+B</kbd> 粗体</span>
          <span><kbd className="px-[4px] py-[1px] rounded border border-border/15 text-[9px]">Ctrl+I</kbd> 斜体</span>
          <span><kbd className="px-[4px] py-[1px] rounded border border-border/15 text-[9px]">Ctrl+V</kbd> 粘贴图片</span>
          <span>拖拽上传图片</span>
        </div>
      )}
    </div>
  );
}
