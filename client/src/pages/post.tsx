import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fetchPost, type Post } from "@/lib/api";
import { renderMarkdown } from "@/lib/markdown";
import { ArrowLeft } from "lucide-react";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}



export function PostPage() {
  const params = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.slug) return;
    document.title = "加载中... | Monolith";
    fetchPost(params.slug)
      .then((p) => {
        setPost(p);
        document.title = `${p.title} | Monolith`;
      })
      .catch(() => setError("文章未找到"))
      .finally(() => setLoading(false));
  }, [params.slug]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[720px] py-[56px]">
        <div className="animate-pulse space-y-[16px]">
          <div className="h-[20px] w-[100px] rounded bg-card/30" />
          <div className="h-[40px] w-3/4 rounded bg-card/30" />
          <div className="h-[16px] w-full rounded bg-card/30" />
          <div className="h-[16px] w-5/6 rounded bg-card/30" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <h1 className="text-[20px] text-muted-foreground">{error || "文章未找到"}</h1>
      </div>
    );
  }

  return (
    <article className="mx-auto w-full max-w-[720px] py-[40px] lg:py-[56px]">
      <Link href="/" className="mb-[32px] inline-flex items-center gap-[6px] text-[13px] text-muted-foreground/60 transition-all duration-200 hover:text-foreground hover:-translate-x-[2px] animate-fade-in">
        <ArrowLeft className="h-[14px] w-[14px]" />返回首页
      </Link>

      <header className="mb-[32px] animate-fade-in-up delay-1">
        <div className={`mb-[24px] h-[3px] w-[60px] rounded-full bg-gradient-to-r ${post.coverColor || "from-gray-500/20 to-gray-600/20"}`} />
        <div className="mb-[16px] flex flex-wrap items-center gap-[8px]">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="h-[22px] rounded-[4px] px-[8px] text-[12px] font-normal">{tag}</Badge>
          ))}
          <span className="text-[12px] text-muted-foreground/50">{formatDate(post.createdAt)}</span>
        </div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] leading-[1.3] lg:text-[32px]">{post.title}</h1>
        <p className="mt-[16px] text-[15px] leading-[1.8] text-muted-foreground">{post.excerpt}</p>
      </header>

      <Separator className="mb-[32px] bg-border/30" />

      <div className="prose-monolith animate-fade-in delay-3" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />

      <Separator className="mt-[48px] bg-border/30" />
      <div className="mt-[24px] flex items-center justify-between animate-fade-in delay-4">
        <Link href="/" className="inline-flex items-center gap-[6px] text-[13px] text-muted-foreground/60 transition-all duration-200 hover:text-foreground hover:-translate-x-[2px]">
          <ArrowLeft className="h-[14px] w-[14px]" />返回首页
        </Link>
        <span className="text-[12px] text-muted-foreground/40">发布于 {formatDate(post.createdAt)}</span>
      </div>
    </article>
  );
}
