import { redirect } from "next/navigation";
import { getCurrentUser } from "@/infrastructure/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/**
 * Account profile, rendered from the server-verified session.
 *
 * Uses `getCurrentUser()` and redirects only when the user is genuinely anonymous.
 * The previous version wrapped `requireUser()` in a try/catch and redirected on any
 * error, which quietly turned real failures — a missing environment variable, an
 * unreachable auth provider — into a redirect to `/`, hiding the misconfiguration.
 * Infrastructure errors now propagate to the error boundary where they are visible.
 */
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const initials = (user.name ?? user.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Details from your authenticated session.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-4">
          <Avatar className="size-12">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback>{initials || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user.name ?? "Unnamed"}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">User ID</span>
            {/* Shown because it is the caller's own id. Never render another
                user's identifier without an authorization check. */}
            <span className="font-mono text-xs">{user.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
