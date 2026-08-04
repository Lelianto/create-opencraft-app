import { z } from "zod";
export const idSchema = z.string().uuid();
export async function parseJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> { const value: unknown = await request.json(); return schema.parse(value); }

