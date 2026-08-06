import { redirect } from "next/navigation";
import { getCurrentUser } from "@/infrastructure/auth";
import { GoogleSignIn } from "{{import.domain}}/authentication/components/google-sign-in";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Sign-in page.
 *
 * Renders the provider's GoogleSignIn button. When a session already exists we
 * skip the prompt and send the user straight to the app, so the page cannot be
 * used to confuse already-authenticated visitors.
 *
 * The `next` query parameter is round-tripped by the proxy (path only) and by
 * GoogleSignIn (same-origin relative path only). Never trust it as a raw URL.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  const destination = next?.startsWith("/") ? next : "/dashboard";

  if (user) redirect(destination);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center p-8">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to continue to your account.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <GoogleSignIn next={next} />
          <Button variant="link" asChild>
            <a href="/">Back to home</a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
