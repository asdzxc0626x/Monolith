import { Route, Switch, useLocation } from "wouter";
import { useEffect, Suspense, lazy } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SearchOverlay } from "@/components/search";
import { ProtectedRoute } from "@/components/protected-route";

// 代码分割 (Code Splitting)
const HomePage = lazy(() => import("@/pages/home").then((m) => ({ default: m.HomePage })));
const PostPage = lazy(() => import("@/pages/post").then((m) => ({ default: m.PostPage })));
const ArchivePage = lazy(() => import("@/pages/archive").then((m) => ({ default: m.ArchivePage })));
const AboutPage = lazy(() => import("@/pages/about").then((m) => ({ default: m.AboutPage })));
const AdminLogin = lazy(() => import("@/pages/admin/login").then((m) => ({ default: m.AdminLogin })));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard").then((m) => ({ default: m.AdminDashboard })));
const AdminEditor = lazy(() => import("@/pages/admin/editor").then((m) => ({ default: m.AdminEditor })));
const AdminSettings = lazy(() => import("@/pages/admin/settings").then((m) => ({ default: m.AdminSettings })));
const AdminBackup = lazy(() => import("@/pages/admin/backup").then((m) => ({ default: m.AdminBackup })));
const AdminPages = lazy(() => import("@/pages/admin/pages").then((m) => ({ default: m.AdminPages })));
const AdminComments = lazy(() => import("@/pages/admin/comments").then((m) => ({ default: m.AdminComments })));
const AdminMedia = lazy(() => import("@/pages/admin/media").then((m) => ({ default: m.AdminMedia })));
const AdminAnalytics = lazy(() => import("@/pages/admin/analytics").then((m) => ({ default: m.AdminAnalytics })));
const DynamicPage = lazy(() => import("@/pages/dynamic-page").then((m) => ({ default: m.DynamicPage })));
const NotFoundPage = lazy(() => import("@/pages/not-found").then((m) => ({ default: m.NotFoundPage })));


/** 将 HTML 字符串安全注入到容器中（支持 script 标签执行） */
function injectHtml(container: HTMLElement, html: string) {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  Array.from(temp.childNodes).forEach((node) => {
    if (node instanceof HTMLScriptElement) {
      // script 需要重新创建才能执行
      const script = document.createElement("script");
      if (node.src) script.src = node.src;
      else script.textContent = node.textContent;
      Array.from(node.attributes).forEach((a) => script.setAttribute(a.name, a.value));
      container.appendChild(script);
    } else {
      container.appendChild(node.cloneNode(true));
    }
  });
}

export function App() {
  const [location] = useLocation();
  const isEditorPage = location.startsWith("/admin/editor");

  // 注入自定义 header/footer 代码（仅执行一次）
  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((s) => {
        if (s.custom_header) {
          const container = document.createElement("div");
          container.id = "monolith-custom-header";
          injectHtml(container, s.custom_header);
          // 将子节点移入 head
          Array.from(container.childNodes).forEach((n) => document.head.appendChild(n));
        }
        if (s.custom_footer) {
          const container = document.createElement("div");
          container.id = "monolith-custom-footer";
          injectHtml(container, s.custom_footer);
          document.body.appendChild(container);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <Navbar />
      <SearchOverlay />
      {isEditorPage ? (
        /* 编辑器全屏布局 — 不受 main 容器限制 */
        <main className="mx-auto w-full px-[16px] flex-1 flex flex-col">
          <Suspense fallback={<div className="p-8 flex justify-center text-zinc-500">Loading...</div>}>
            <Switch>
              <Route path="/admin/editor/:slug?">
                <ProtectedRoute>
                  <AdminEditor />
                </ProtectedRoute>
              </Route>
            </Switch>
          </Suspense>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-[1440px] px-[20px] lg:px-[40px] flex-1 flex flex-col">
          <Suspense fallback={<div className="p-8 flex justify-center text-zinc-500">Loading...</div>}>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/posts/:slug" component={PostPage} />
              <Route path="/archive" component={ArchivePage} />
              <Route path="/about" component={AboutPage} />
              {/* 登录页不需要守卫 */}
              <Route path="/admin/login" component={AdminLogin} />
              {/* 以下所有后台页面均需认证 */}
              <Route path="/admin/settings">
                <ProtectedRoute><AdminSettings /></ProtectedRoute>
              </Route>
              <Route path="/admin/backup">
                <ProtectedRoute><AdminBackup /></ProtectedRoute>
              </Route>
              <Route path="/admin/pages">
                <ProtectedRoute><AdminPages /></ProtectedRoute>
              </Route>
              <Route path="/admin/comments">
                <ProtectedRoute><AdminComments /></ProtectedRoute>
              </Route>
              <Route path="/admin/media">
                <ProtectedRoute><AdminMedia /></ProtectedRoute>
              </Route>
              <Route path="/admin/analytics">
                <ProtectedRoute><AdminAnalytics /></ProtectedRoute>
              </Route>
              <Route path="/admin">
                <ProtectedRoute><AdminDashboard /></ProtectedRoute>
              </Route>
              <Route path="/page/:slug" component={DynamicPage} />
              <Route>
                <NotFoundPage />
              </Route>
            </Switch>
          </Suspense>
        </main>
      )}
      {!isEditorPage && <Footer />}
    </>
  );
}
