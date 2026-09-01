/**
 * POST /api/event
 * Public endpoint — called by the tracking script to log storefront events.
 */

import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: {
    token: string;
    eventType: "page_view" | "add_to_cart" | "checkout_started";
    page?: string | null;
    productId?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { token, eventType, page, productId } = body;

  if (!token || !eventType) {
    return new Response("Missing token or eventType", { status: 400 });
  }

  // Look up the session by token
  const session = await db.visitorSession.findUnique({ where: { token } });

  if (!session) {
    // Session not found — silently ignore (race condition or invalid token)
    return Response.json({ ok: true }, { headers: corsHeaders(origin) });
  }

  await db.pageEvent.create({
    data: {
      sessionId: session.id,
      eventType,
      page: page ?? null,
      productId: productId ?? null,
    },
  });

  return Response.json({ ok: true }, { headers: corsHeaders(origin) });
}

export async function loader({ request }: ActionFunctionArgs) {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  return new Response("Not Found", { status: 404 });
}
