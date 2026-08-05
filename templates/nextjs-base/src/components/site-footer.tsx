export function SiteFooter() {
  return (
    <footer className="border-t py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {{projectName}} — generated with OpenCraft.
        </p>
      </div>
    </footer>
  );
}
