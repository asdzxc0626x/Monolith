import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { AnimateIn } from "@/hooks/use-animate";

type PublicSettings = {
  footer_text: string;
  github_url: string;
  twitter_url: string;
  email: string;
  rss_enabled: string;
};

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(() => {});
  }, []);

  // 构建动态链接列表
  const links: { label: string; href: string; external?: boolean }[] = [];
  if (settings?.github_url) links.push({ label: "GitHub", href: settings.github_url, external: true });
  if (settings?.twitter_url) links.push({ label: "X / Twitter", href: settings.twitter_url, external: true });
  if (settings?.email) links.push({ label: "邮箱", href: `mailto:${settings.email}` });
  if (settings?.rss_enabled !== "false") links.push({ label: "RSS", href: "/rss.xml" });

  const footerText = settings?.footer_text || `© ${currentYear} Monolith. 使用 Hono + Vite 构建，部署于 Cloudflare 边缘。`;

  return (
    <footer className="mt-auto border-t border-border/40">
      <AnimateIn animation="animate-fade-in" className="mx-auto flex max-w-[1440px] flex-col items-center gap-[12px] px-[20px] py-[32px] lg:px-[40px]">
        {links.length > 0 && (
          <div className="flex items-center gap-[16px] text-[13px] text-muted-foreground">
            {links.map((link, i) => (
              <span key={link.label} className="flex items-center gap-[16px]">
                {i > 0 && <Separator orientation="vertical" className="h-[12px] bg-border/50" />}
                <a
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="link-underline transition-colors duration-200 hover:text-foreground"
                >
                  {link.label}
                </a>
              </span>
            ))}
          </div>
        )}
        <p className="text-[12px] text-muted-foreground/60">
          {footerText}
        </p>
      </AnimateIn>
    </footer>
  );
}
