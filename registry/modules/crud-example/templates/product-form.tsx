"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { productInputSchema, type ProductInput } from "{{import.domain}}/products/schema";
import type { ApiResponse } from "@/types/api";
import type { Product } from "{{import.domain}}/products/schema";

/**
 * Create-product form.
 *
 * Client-side validation exists purely for fast feedback. The Route Handler
 * revalidates with the same schema and is the authority — never treat a passing
 * client check as authorisation to write.
 */
export function ProductForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ProductInput>({
    resolver: zodResolver(productInputSchema),
    defaultValues: { name: "", description: null, price: 0 },
  });

  async function onSubmit(values: ProductInput) {
    setSubmitError(null);

    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const payload = (await response.json()) as ApiResponse<Product>;

    if (!payload.success) {
      // Surface server-side field errors on the matching inputs.
      for (const [field, messages] of Object.entries(payload.error.fieldErrors ?? {})) {
        if (field in values) {
          form.setError(field as keyof ProductInput, { message: messages[0] });
        }
      }
      setSubmitError(payload.error.message);
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Standing desk" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Optional"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value || null)}
                />
              </FormControl>
              <FormDescription>Up to 2,000 characters.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...field}
                  onChange={(event) => field.onChange(event.target.valueAsNumber || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {submitError ? (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        ) : null}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Add product"}
        </Button>
      </form>
    </Form>
  );
}
