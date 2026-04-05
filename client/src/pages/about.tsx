import { useEffect } from "react";
import { Separator } from "@/components/ui/separator";

export function AboutPage() {
  useEffect(() => { document.title = "关于 | Monolith"; }, []);

  return (
    <div className="mx-auto w-full max-w-[720px] py-[40px] lg:py-[56px]">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">关于</h1>
      <Separator className="my-[24px] bg-border/30" />
      <div className="prose-monolith">
        <h2>Monolith 是什么？</h2>
        <p>Monolith（巨石碑）是一个关于代码、设计与边缘计算的个人博客。它的名字来源于库布里克《2001：太空漫游》中那块神秘的黑色石碑——一个超越时间、引领进化的静默存在。</p>
        <p>这个博客同样试图成为一块"巨石碑"：在信息洪流中保持沉默的力量，用深度的技术写作取代碎片化的速食内容。</p>
        <h2>技术栈</h2>
        <ul>
          <li><strong>前端</strong> — Vite + React 19 SPA，Tailwind CSS v4，Shadcn UI</li>
          <li><strong>后端</strong> — Hono.js，运行在 Cloudflare Workers 边缘</li>
          <li><strong>数据库</strong> — Cloudflare D1（边缘 SQLite）+ Drizzle ORM</li>
          <li><strong>存储</strong> — Cloudflare R2（S3 兼容对象存储）</li>
          <li><strong>部署</strong> — Cloudflare Pages + Workers，全球 300+ 节点</li>
        </ul>
        <h2>设计哲学</h2>
        <ul>
          <li>所有间距严格遵循 <strong>偶数模数体系</strong></li>
          <li>中文排版 <strong>零字间距</strong>，杜绝"机翻感"</li>
          <li>大标题使用 <strong>负向字距压缩</strong></li>
          <li>暗色主题基于 <strong>Oklch 色域</strong></li>
        </ul>
        <blockquote><p>最好的代码，是让你忘记代码存在的那一种。</p></blockquote>
      </div>
    </div>
  );
}
