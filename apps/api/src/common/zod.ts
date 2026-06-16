import { BadRequestException } from "@nestjs/common";
import { z, type ZodTypeAny } from "zod";

/**
 * Parse a request body with a @nova/shared zod schema → 400 with field errors.
 * Returns the schema's **output** type (`z.infer`), so schemas using `.default()` resolve to
 * their parsed shape (e.g. `currency: string`), not the optional input shape.
 */
export function zodParse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new BadRequestException({
      statusCode: 400,
      error: "ValidationError",
      message: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    });
  }
  return result.data;
}
