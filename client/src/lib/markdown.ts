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
