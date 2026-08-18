import { Switch, Route, Router } from "wouter";
import { ThemeProvider } from "@/contexts/theme-context";
import { AppShell } from "@/components/layout/AppShell";
import { Home } from "@/pages/Home";
import { Workout } from "@/pages/Workout";
import { History } from "@/pages/History";
import { Goals } from "@/pages/Goals";
import { Profile } from "@/pages/Profile";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

function App() {
  return (
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
  );
}

export default App;
