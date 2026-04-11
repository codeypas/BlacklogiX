import * as React from "react";

import AnalystAuthPage from "@/components/ui/AnalystAuthPage";
import AnalystDashboardPage from "@/components/ui/AnalystDashboardPage";
import PricingPage from "@/components/ui/PricingPage";
import SaaSTemplate from "@/components/ui/SaaSTemplate";
import { GlobalThemeToggle, ThemeProvider } from "@/components/ui/ThemeProvider";
import { AUTH_STATE_EVENT, isAuthenticated } from "@/lib/auth";
import { APP_NAVIGATION_EVENT, navigateTo } from "@/lib/navigation";

const routes: Record<string, React.ReactNode> = {
  "/pricing": <PricingPage />,
  "/analyst-login": <AnalystAuthPage initialMode="login" />,
  "/register": <AnalystAuthPage initialMode="register" />,
  "/dashboard": <AnalystDashboardPage />,
};

const protectedRoutes = new Set(["/dashboard"]);
const authRoutes = new Set(["/analyst-login", "/register"]);

export default function App() {
  const [pathname, setPathname] = React.useState(() => window.location.pathname);
  const [authenticated, setAuthenticated] = React.useState(() => isAuthenticated());

  React.useEffect(() => {
    const syncPathname = () => setPathname(window.location.pathname);
    const syncAuthState = () => setAuthenticated(isAuthenticated());

    window.addEventListener("popstate", syncPathname);
    window.addEventListener(APP_NAVIGATION_EVENT, syncPathname);
    window.addEventListener(AUTH_STATE_EVENT, syncAuthState);
    return () => {
      window.removeEventListener("popstate", syncPathname);
      window.removeEventListener(APP_NAVIGATION_EVENT, syncPathname);
      window.removeEventListener(AUTH_STATE_EVENT, syncAuthState);
    };
  }, []);

  React.useEffect(() => {
    if (!authenticated && protectedRoutes.has(pathname)) {
      navigateTo("/analyst-login");
      return;
    }

    if (authenticated && authRoutes.has(pathname)) {
      navigateTo("/dashboard");
    }
  }, [authenticated, pathname]);

  const activeRoute =
    !authenticated && protectedRoutes.has(pathname)
      ? "/analyst-login"
      : authenticated && authRoutes.has(pathname)
        ? "/dashboard"
        : pathname;

  return (
    <ThemeProvider>
      <div className="theme-root">
        {routes[activeRoute] ?? <SaaSTemplate />}
        <GlobalThemeToggle />
      </div>
    </ThemeProvider>
  );
}
