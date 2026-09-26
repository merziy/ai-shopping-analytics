/**
 * POST /api/session
 * Public endpoint — called by the tracking script on first storefront page load.
 * Creates a VisitorSession and detects AI platform attribution.
 */

import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { detectAIPlatform } from "../lib/attribution.server";

// Allow calls from merchant storefronts
function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "false",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const origin = request.headers.get("origin");

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: {
    shopDomain: string;
    token: string;
    referrer?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    landingPage?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { shopDomain, token, referrer, utmSource, utmMedium, utmCampaign, landingPage } = body;

  if (!shopDomain || !token) {
    return new Response("Missing shopDomain or token", { status: 400 });
  }

  const aiPlatform = detectAIPlatform(referrer, utmSource);

  // Upsert — if same token hits us again, update rather than duplicate
  const session = await db.visitorSession.upsert({
    where: { token },
    create: {
      shop: shopDomain,
      token,
      referrer: referrer ?? null,
      aiPlatform,
      utmSource: utmSource ?? null,
      utmMedium: utmMedium ?? null,
      utmCampaign: utmCampaign ?? null,
      landingPage: landingPage ?? null,
    },
    update: {}, // Don't overwrite attribution data on subsequent calls
  });

  return Response.json(
    { ok: true, sessionId: session.id, aiPlatform },
    { headers: corsHeaders(origin) }
  );
}

// Handle OPTIONS preflight at the loader level too
export async function loader({ request }: ActionFunctionArgs) {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  return new Response("Not Found", { status: 404 });
}
