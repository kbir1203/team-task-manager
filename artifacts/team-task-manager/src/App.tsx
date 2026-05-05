import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect, Link } from 'wouter';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AppShell } from "./components/layout/app-shell";
import Dashboard from "./pages/dashboard";
import Projects from "./pages/projects/index";
import NewProject from "./pages/projects/new";
import ProjectDetail from "./pages/projects/[id]";
import TaskDetail from "./pages/tasks/[id]";
import Settings from "./pages/settings";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(238, 81%, 50%)",
    colorForeground: "hsl(222, 47%, 11%)",
    colorMutedForeground: "hsl(215, 16%, 47%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(214, 32%, 91%)",
    colorInputForeground: "hsl(222, 47%, 11%)",
    colorNeutral: "hsl(214, 32%, 91%)",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-border",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-semibold text-foreground",
    headerSubtitle: "text-sm text-muted-foreground",
    socialButtonsBlockButtonText: "text-sm font-medium",
    formFieldLabel: "text-sm font-medium text-foreground",
    footerActionLink: "text-primary hover:text-primary/90 font-medium",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground text-xs font-medium",
    identityPreviewEditButton: "text-primary hover:text-primary/90",
    formFieldSuccessText: "text-green-600 text-sm",
    alertText: "text-sm",
    logoBox: "h-12 flex items-center justify-center mb-6",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border-input hover:bg-accent hover:text-accent-foreground",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    formFieldInput: "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
    footerAction: "bg-muted/50 py-4 px-6 border-t border-border",
    dividerLine: "bg-border",
    alert: "bg-destructive/15 text-destructive border-destructive/20",
    otpCodeFieldInput: "border-input",
    formFieldRow: "mb-4",
    main: "p-6 sm:p-8",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 px-4 py-12">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 px-4 py-12">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClientRef = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClientRef.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClientRef]);

  return null;
}

function UserSync() {
  const { isSignedIn, user } = useUser();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (isSignedIn && user && !syncedRef.current) {
      syncedRef.current = true;
      fetch("/api/users/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName || user.username || "User",
          avatarUrl: user.imageUrl,
        }),
      }).catch(() => {});
    }
  }, [isSignedIn, user]);

  return null;
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="py-6 px-8 flex justify-between items-center border-b border-border/40">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <img src={`${basePath}/logo.svg`} alt="Logo" className="h-8 w-8" />
          TaskFlow
        </div>
        <div className="flex gap-4">
          <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors py-2 px-4">Sign In</Link>
          <Link href="/sign-up" className="bg-primary text-primary-foreground text-sm font-medium py-2 px-4 rounded-md shadow-sm hover:bg-primary/90 transition-colors">Get Started</Link>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 text-balance leading-tight">
          The task manager for <span className="text-primary">focused teams</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-2xl text-balance">
          A dense, high-performance workspace where admins organize projects and members ship tasks. Built for clarity and speed.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/sign-up" className="bg-primary text-primary-foreground font-medium py-3 px-8 rounded-md shadow-sm hover:bg-primary/90 transition-colors text-lg">
            Start for free
          </Link>
        </div>
      </main>
    </div>
  );
}

function DashboardPlaceholder() {
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();
  return (
    <div className="min-h-screen bg-muted/20 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <button onClick={() => signOut(() => setLocation("/"))} className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign Out</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Tasks</h3>
            <p className="text-3xl font-bold">0</p>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Active Projects</h3>
            <p className="text-3xl font-bold">0</p>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Overdue Tasks</h3>
            <p className="text-3xl font-bold text-destructive">0</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}


function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <UserSync />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/dashboard">
            <AppShell>
              <Dashboard />
            </AppShell>
          </Route>
          <Route path="/projects">
            <AppShell>
              <Projects />
            </AppShell>
          </Route>
          <Route path="/projects/new">
            <AppShell>
              <NewProject />
            </AppShell>
          </Route>
          <Route path="/projects/:id">
            <AppShell>
              <ProjectDetail />
            </AppShell>
          </Route>
          <Route path="/tasks/:id">
            <AppShell>
              <TaskDetail />
            </AppShell>
          </Route>
          <Route path="/settings">
            <AppShell>
              <Settings />
            </AppShell>
          </Route>
          <Route>
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold">Not Found</h1>
                <Link href="/" className="text-primary mt-4 inline-block hover:underline">Go Home</Link>
              </div>
            </div>
          </Route>
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
