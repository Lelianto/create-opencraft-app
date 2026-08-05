import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Dashboard shell.
 *
 * Deliberately backend-agnostic so it can be scaffolded before you choose a
 * provider. It renders no user data and makes no authorization decisions.
 *
 * To make it account-aware, add an auth module and read the session **on the
 * server**:
 *
 * ```tsx
 * import { getCurrentUser } from "@/infrastructure/auth";
 *
 * const user = await getCurrentUser();
 * if (!user) return <SignInPrompt />;
 * ```
 *
 * Never read identity from a client store, a request header, or a query
 * parameter — those are attacker-controlled. See `/api/me` in the
 * `protected-routes` module for the canonical protected-endpoint shape.
 */
export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          A starting layout. Replace these cards with your own widgets.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Add a capability
            </CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-sm">
            <p>opencraft list</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Check your setup
            </CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-sm">
            <p>opencraft doctor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Add authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-sm">
            <p>opencraft add auth-supabase</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fetch data on the server</CardTitle>
          <CardDescription>
            Load data in Server Components or Route Handlers so authentication, authorization, and
            ownership checks stay on the server. Client components should receive data as props,
            not query the database directly.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
