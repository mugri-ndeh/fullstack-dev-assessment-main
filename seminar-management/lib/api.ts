import type { NextApiRequest, NextApiResponse, NextApiHandler } from "next";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

/**
 * Throwable HTTP error for service-layer business rules
 * (e.g. 404 not found, 409 conflict). The central handler maps it to JSON.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Method = "GET" | "POST" | "PUT" | "DELETE";
type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>;

/**
 * Wraps per-method handlers with 405 handling and centralized error mapping,
 * so route files contain no try/catch boilerplate and every error leaves the
 * API in the same envelope: { error: string, details?: unknown }.
 */
export function createHandler(
  handlers: Partial<Record<Method, Handler>>
): NextApiHandler {
  return async (req, res) => {
    const handler = handlers[req.method as Method];
    if (!handler) {
      res.setHeader("Allow", Object.keys(handlers).join(", "));
      return res.status(405).json({ error: "Method not allowed" });
    }
    try {
      await handler(req, res);
    } catch (err) {
      handleApiError(err, res);
    }
  };
}

function handleApiError(err: unknown, res: NextApiResponse) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((i) =>
        i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message
      ),
    });
  }
  if (err instanceof ApiError) {
    return res
      .status(err.status)
      .json({ error: err.message, details: err.details });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Map the common integrity errors to meaningful statuses instead of 500.
    if (err.code === "P2025")
      return res.status(404).json({ error: "Record not found" });
    if (err.code === "P2002")
      return res
        .status(409)
        .json({ error: "A record with this unique value already exists" });
    if (err.code === "P2003")
      return res
        .status(400)
        .json({ error: "Referenced record does not exist" });
  }
  // Unknown error: log the details server-side, hide them from the client.
  console.error("[api] unhandled error:", err);
  return res.status(500).json({ error: "Internal server error" });
}

/** First value of a possibly-array query param. */
export function queryParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
