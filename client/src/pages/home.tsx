import { useEffect, useState } from "react";
import { Hero } from "@/components/hero";
import { ArticleCard } from "@/components/article-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fetchPosts, type PostMeta } from "@/lib/api";
import { AnimateIn } from "@/hooks/use-animate";
import { SeoHead } from "@/components/seo-head";

export function HomePage() {
  const [posts, setPosts] = useState<PostMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts()
      .then(setPosts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags)));

  return (
    <div className="flex flex-col">
      <SeoHead url="/" />
      <Hero />
      <Separator className="bg-border/30" />
      <div className="grid grid-cols-1 gap-[32px] py-[40px] lg:grid-cols-[1fr_280px] lg:gap-[40px]">
        <section>
          <AnimateIn>
            <h2 className="mb-[24px] text-[14px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">最新文章</h2>
          </AnimateIn>
          {loading ? (
            <div className="flex flex-col gap-[16px]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[180px] animate-pulse rounded-lg bg-card/20" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-[16px]">
              {posts.map((post, i) => (
                <AnimateIn key={post.slug} delay={`delay-${Math.min(i, 6)}`}>
                  <ArticleCard post={post} />
                </AnimateIn>
              ))}
            </div>
          )}
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-[72px] flex flex-col gap-[24px]">
            <AnimateIn animation="animate-fade-in" delay="delay-2">
              <div className="rounded-lg border border-border/40 bg-card/30 p-[20px]">
                <div className="mb-[12px] flex items-center gap-[12px]">
                  <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-[14px] font-semibold text-foreground">M</div>
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">Monolith</p>
                    <p className="text-[12px] text-muted-foreground/60">独立开发者</p>
                  </div>
                </div>
                <p className="text-[13px] leading-[1.7] text-muted-foreground">热衷于前端架构、设计系统与边缘计算。相信技术应当服务于人，而非反过来。</p>
              </div>
            </AnimateIn>

            <AnimateIn animation="animate-fade-in" delay="delay-3">
              <div className="rounded-lg border border-border/40 bg-card/30 p-[20px]">
                <h3 className="mb-[12px] text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">标签</h3>
                <div className="flex flex-wrap gap-[6px]">
                  {allTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="h-[24px] rounded-[4px] px-[8px] text-[12px] font-normal text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground cursor-pointer">{tag}</Badge>
                  ))}
                </div>
              </div>
            </AnimateIn>

            <AnimateIn animation="animate-fade-in" delay="delay-4">
              <div className="rounded-lg border border-border/40 bg-card/30 p-[20px]">
                <h3 className="mb-[12px] text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">构建</h3>
                <div className="flex flex-col gap-[8px] text-[13px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">前端</span><span className="font-medium text-foreground">Vite + React</span></div>
                  <Separator className="bg-border/20" />
                  <div className="flex justify-between"><span className="text-muted-foreground">后端</span><span className="font-medium text-foreground">Hono Workers</span></div>
                  <Separator className="bg-border/20" />
                  <div className="flex justify-between"><span className="text-muted-foreground">数据</span><span className="font-medium text-foreground">D1 + R2</span></div>
                </div>
              </div>
            </AnimateIn>
          </div>
        </aside>
      </div>
    </div>
  );
}
