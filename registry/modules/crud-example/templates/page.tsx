import { Suspense } from "react";
import { getCurrentUser } from "@/infrastructure/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listProducts } from "{{import.domain}}/products/repository";
import { productListQuerySchema } from "{{import.domain}}/products/schema";
import { ProductForm } from "{{import.components}}/products/product-form";
import { DeleteProductButton } from "{{import.components}}/products/delete-product-button";

// `searchParams` is a Promise in Next.js 16.
interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function ProductsSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading products">
      {[0, 1, 2].map((row) => (
        <Skeleton key={row} className="h-12 w-full" />
      ))}
    </div>
  );
}

async function ProductsTable({ ownerId, search }: { ownerId: string; search: string }) {
  // Reuses the same validated query contract as the Route Handler.
  const query = productListQuerySchema.parse({ search });
  const page = await listProducts(ownerId, query);

  if (page.items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        {search ? `No products match "${search}".` : "No products yet. Create your first one above."}
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {page.items.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {product.description ?? "—"}
              </TableCell>
              <TableCell className="text-right">{currency.format(product.price)}</TableCell>
              <TableCell className="text-right">
                <DeleteProductButton id={product.id} name={product.name} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-sm text-muted-foreground">
        Showing {page.items.length} of {page.total}
      </p>
    </>
  );
}

export default async function ProductsPage({ searchParams }: PageProps) {
  // Identity is resolved server-side. Rendering never depends on client state.
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              Products are private to each account. Sign in to view yours.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const params = await searchParams;
  const rawSearch = params.search;
  const search = typeof rawSearch === "string" ? rawSearch : "";

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">
          Reference CRUD implementation. Every request is authenticated, authorised by ownership,
          and validated on the server.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add a product</CardTitle>
          <CardDescription>Validated on the client for feedback and again on the server.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <form className="flex gap-2" role="search">
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search by name"
            aria-label="Search products by name"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          />
        </form>

        {/* `key` restarts the boundary whenever the search term changes. */}
        <Suspense key={search} fallback={<ProductsSkeleton />}>
          <ProductsTable ownerId={user.id} search={search} />
        </Suspense>
      </section>
    </main>
  );
}
