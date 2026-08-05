import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 p-8">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">{{projectName}}</h1>
        <p className="text-muted-foreground">
          Generated with OpenCraft. Read <code className="font-mono">AGENTS.md</code> before you or
          an AI agent starts changing this project — it records the architecture and the security
          rules this codebase expects.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next steps</CardTitle>
          <CardDescription>Add capabilities without rewriting the foundation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-sm">
          <p>npx opencraft list</p>
          <p>npx opencraft add dashboard</p>
          <p>npx opencraft doctor</p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button asChild>
          <a href="https://nextjs.org/docs">Next.js docs</a>
        </Button>
        <Button variant="outline" asChild>
          <a href="https://ui.shadcn.com">shadcn/ui</a>
        </Button>
      </div>
    </main>
  );
}
