import { marked } from "marked";
import hljs from "highlight.js/lib/core";

// 按需注册语言（避免打包过大）
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import python from "highlight.js/lib/languages/python";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import diff from "highlight.js/lib/languages/diff";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("shell", bash);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("go", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("yml", yaml);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("md", markdown);
hljs.registerLanguage("diff", diff);

// 配置 marked
const renderer = new marked.Renderer();

// 标题：注入 id 属性（用于 TOC 锚点）
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, "")      // 去除 HTML 标签
    .replace(/[^\w\u4e00-\u9fff\s-]/g, "") // 保留中文、字母、数字、空格、连字符
    .replace(/\s+/g, "-")          // 空格转连字符
    .replace(/-+/g, "-")           // 合并连续连字符
    .replace(/^-|-$/g, "");        // 去除首尾连字符
}

renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
  const id = slugify(text);
  return `<h${depth} id="${id}">${text}</h${depth}>`;
};

// 代码块：高亮 + 语言标签
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : "";
  const highlighted = language
    ? hljs.highlight(text, { language }).value
    : escapeHtml(text);
  const langLabel = language ? `<span class="code-lang">${language}</span>` : "";
  return `<pre class="hljs">${langLabel}<code class="hljs language-${language || "text"}">${highlighted}</code></pre>`;
};

// 图片：懒加载 + 圆角
renderer.image = ({ href, title, text }: { href: string; title?: string | null; text: string }) => {
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
  return `<figure class="md-figure"><img src="${href}" alt="${escapeHtml(text)}" loading="lazy" decoding="async"${titleAttr}/>${text ? `<figcaption>${escapeHtml(text)}</figcaption>` : ""}</figure>`;
};

// 表格：响应式包裹
renderer.table = (token: any) => {
  const header = token.header || '';
  const body = token.body || token.rows || '';
  return `<div class="table-wrapper"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
};

// 链接：外部链接自动 target="_blank"
renderer.link = (token: any) => {
  const href = token.href || '';
  const title = token.title || '';
  const text = token.text || '';
  const isExternal = href.startsWith("http");
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
  const externalAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
  return `<a href="${href}"${titleAttr}${externalAttrs}>${text}</a>`;
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: false,
});

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * 渲染 Markdown 为 HTML
 * 支持：标题/粗体/斜体/删除线/链接/图片/代码块(高亮)/行内代码/
 *       表格/任务列表/有序无序列表/引用/分隔线/脚注
 */
export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

/* ── TOC 辅助函数 ─────────────────────────── */

export type TocHeading = {
  id: string;
  text: string;
  level: number;
};

/**
 * 从 Markdown 源文本中提取标题列表（h2-h4）
 * 用于生成 Table of Contents
 */
export function extractHeadings(md: string): TocHeading[] {
  const headings: TocHeading[] = [];
  // 匹配 Markdown 标题语法：## ~ ####
  const regex = /^(#{2,4})\s+(.+)$/gm;
  let match;
  while ((match = regex.exec(md)) !== null) {
    const level = match[1].length;
    const rawText = match[2].trim();
    // 去除 Markdown 行内格式（粗体、斜体、代码等）
    const plainText = rawText
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1");
    headings.push({
      id: slugify(plainText),
      text: plainText,
      level,
    });
  }
  return headings;
}
