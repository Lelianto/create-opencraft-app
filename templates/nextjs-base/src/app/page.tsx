import { ArrowRight, Blocks, Palette, ShieldCheck, Zap } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Zap,
    title: "Fast to build",
    description:
      "A working foundation instead of an empty scaffold. Add capabilities with `opencraft add`, not by rewriting infrastructure.",
  },
  {
    icon: Blocks,
    title: "Modular by default",
    description:
      "Everything ships as versioned modules. Inspect what is installed, see what changed, and update safely.",
  },
  {
    icon: Palette,
    title: "Styled and themeable",
    description:
      "shadcn/ui components with a light and dark theme already wired up. Toggle with the button in the header.",
  },
  {
    icon: ShieldCheck,
    title: "Security-first",
    description:
      "Generated code follows the rules in AGENTS.md. Run `opencraft doctor` to verify the project stays healthy.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-20 text-center sm:px-6 sm:py-28">
          <Badge variant="outline" className="gap-1.5">
            <Zap className="size-3" aria-hidden />
            Generated with OpenCraft
          </Badge>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              {{projectName}}
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Your project is ready. Read <code className="font-mono">AGENTS.md</code> before you or
              an AI agent starts changing things — it records the architecture and security rules
              this codebase expects.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <a href="#get-started">
                Get started
                <ArrowRight className="size-4" aria-hidden />
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="https://nextjs.org/docs">Next.js docs</a>
            </Button>
          </div>
        </section>

        <section
          id="features"
          className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6"
          aria-label="Features"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <feature.icon className="size-5 text-muted-foreground" aria-hidden />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section
          id="get-started"
          className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6"
          aria-label="Get started"
        >
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
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
