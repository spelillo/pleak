import { Switch, Route, Router } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/theme-context";
import { AppShell } from "@/components/layout/AppShell";
import { Home } from "@/pages/Home";
import { Workout } from "@/pages/Workout";
import { History } from "@/pages/History";
import { Goals } from "@/pages/Goals";
import { Profile } from "@/pages/Profile";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Apps Script calls are lightweight one-shot requests. No automatic
      // retries (a retry attempt pauses pending reconnection under the
      // default 'online' networkMode, which reads as a stuck loading
      // state) and no offline pause — a real failure just surfaces as a
      // normal error state immediately.
      retry: false,
      staleTime: 30_000,
      networkMode: "always",
    },
    mutations: {
      retry: false,
      networkMode: "always",
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router base={base}>
          <AppShell>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/workout" component={Workout} />
              <Route path="/history" component={History} />
              <Route path="/goals" component={Goals} />
              <Route path="/profile" component={Profile} />
              <Route>
                <p className="text-sm text-muted">Page not found.</p>
              </Route>
            </Switch>
          </AppShell>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
