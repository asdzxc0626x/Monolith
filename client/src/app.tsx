import { Route, Switch, useLocation } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SearchOverlay } from "@/components/search";
import { HomePage } from "@/pages/home";
import { PostPage } from "@/pages/post";
import { ArchivePage } from "@/pages/archive";
import { AboutPage } from "@/pages/about";
import { AdminLogin } from "@/pages/admin/login";
import { AdminDashboard } from "@/pages/admin/dashboard";
import { AdminEditor } from "@/pages/admin/editor";
import { AdminSettings } from "@/pages/admin/settings";
import { AdminBackup } from "@/pages/admin/backup";
import { AdminPages } from "@/pages/admin/pages";
import { DynamicPage } from "@/pages/dynamic-page";

export function App() {
  const [location] = useLocation();
  const isEditorPage = location.startsWith("/admin/editor");

  return (
    <>
      <Navbar />
      <SearchOverlay />
      {isEditorPage ? (
        /* 编辑器全屏布局 — 不受 main 容器限制 */
        <main className="mx-auto w-full px-[16px] flex-1 flex flex-col">
          <Switch>
            <Route path="/admin/editor/:slug?" component={AdminEditor} />
          </Switch>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-[1440px] px-[20px] lg:px-[40px] flex-1 flex flex-col">
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/posts/:slug" component={PostPage} />
            <Route path="/archive" component={ArchivePage} />
            <Route path="/about" component={AboutPage} />
            <Route path="/admin/login" component={AdminLogin} />
            <Route path="/admin/settings" component={AdminSettings} />
            <Route path="/admin/backup" component={AdminBackup} />
            <Route path="/admin/pages" component={AdminPages} />
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/page/:slug" component={DynamicPage} />
            <Route>
              <div className="flex flex-1 items-center justify-center">
                <h1 className="text-[28px] font-semibold text-muted-foreground">
                  404 — 页面未找到
                </h1>
              </div>
            </Route>
          </Switch>
        </main>
      )}
      {!isEditorPage && <Footer />}
    </>
  );
}
