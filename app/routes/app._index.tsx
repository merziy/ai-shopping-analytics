import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getPlatformLabel, getPlatformColor } from "../lib/attribution.server";

// --- Attribution logic ---

async function syncRecentOrders(
  admin: { graphql: (q: string) => Promise<{ json: () => Promise<unknown> }> },
  shop: string,
  since: Date
) {
  const sinceStr = since.toISOString();

  const res = await admin.graphql(`
    query {
      orders(first: 50, sortKey: CREATED_AT, reverse: true, query: "created_at:>=${sinceStr}") {
        edges {
          node {
            id
            name
            totalPriceSet { shopMoney { amount currencyCode } }
            createdAt
          }
        }
      }
    }
  `);

  const data = (await res.json()) as {
    data: {
      orders: {
        edges: Array<{
          node: {
            id: string;
            totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
            createdAt: string;
          };
        }>;
      };
    };
  };

  const orders = data.data.orders.edges.map((e) => e.node);

  for (const order of orders) {
    const shopifyOrderId = order.id.replace("gid://shopify/Order/", "");
    const existing = await db.attributedOrder.findFirst({ where: { shopifyOrderId, shop } });
    if (existing) continue;

    const orderCreatedAt = new Date(order.createdAt);
    const windowStart = new Date(orderCreatedAt.getTime() - 30 * 60 * 1000);

    const session = await db.visitorSession.findFirst({
      where: {
        shop,
        aiPlatform: { not: null },
        order: null,
        startedAt: { gte: windowStart, lte: orderCreatedAt },
      },
      orderBy: { startedAt: "desc" },
    });

    await db.attributedOrder.create({
      data: {
        shop,
        shopifyOrderId,
        orderTotal: parseFloat(order.totalPriceSet.shopMoney.amount),
        currency: order.totalPriceSet.shopMoney.currencyCode,
        sessionId: session?.id ?? null,
        aiPlatform: session?.aiPlatform ?? null,
      },
    });
  }
}

// --- Loader ---

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const since = new Date();
  since.setDate(since.getDate() - 30);

  // Sync recent orders from Shopify → attribute to AI sessions
  await syncRecentOrders(admin, shop, since).catch((e) =>
    console.error("Order sync failed:", e)
  );

  const [totalSessions, aiSessions, allOrders, aiOrders] = await Promise.all([
    db.visitorSession.count({ where: { shop, startedAt: { gte: since } } }),
    db.visitorSession.count({ where: { shop, aiPlatform: { not: null }, startedAt: { gte: since } } }),
    db.attributedOrder.count({ where: { shop, createdAt: { gte: since } } }),
    db.attributedOrder.findMany({
      where: { shop, aiPlatform: { not: null }, createdAt: { gte: since } },
    }),
  ]);

  const platformMap: Record<string, { orders: number; revenue: number }> = {};
  for (const order of aiOrders) {
    const p = order.aiPlatform ?? "unknown";
    if (!platformMap[p]) platformMap[p] = { orders: 0, revenue: 0 };
    platformMap[p].orders += 1;
    platformMap[p].revenue += order.orderTotal;
  }

  const platforms = Object.entries(platformMap)
    .map(([key, stats]) => ({
      key,
      label: getPlatformLabel(key as any),
      color: getPlatformColor(key as any),
      orders: stats.orders,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const aiRevenue = aiOrders.reduce((sum, o) => sum + o.orderTotal, 0);
  const aiOrderCount = aiOrders.length;
  const aiConvRate = aiSessions > 0 ? (aiOrderCount / aiSessions) * 100 : 0;
  const overallConvRate = totalSessions > 0 ? (allOrders / totalSessions) * 100 : 0;
  const currency = aiOrders[0]?.currency ?? "USD";

  return { totalSessions, aiSessions, aiOrderCount, aiRevenue, aiConvRate: aiConvRate.toFixed(1), overallConvRate: overallConvRate.toFixed(1), platforms, currency };
};

// --- UI ---

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: data.currency,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <>
      <ui-title-bar title="AI Shopping Analytics" />
      <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif", maxWidth: 900 }}>
        <p style={{ color: "#6b7280", marginTop: 0, marginBottom: 24 }}>Last 30 days</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          <KPI label="AI Sessions" value={data.aiSessions.toLocaleString()} sub={`of ${data.totalSessions.toLocaleString()} total`} />
          <KPI label="AI Orders" value={data.aiOrderCount.toLocaleString()} />
          <KPI label="AI Revenue" value={fmt(data.aiRevenue)} />
          <KPI label="AI Conv. Rate" value={`${data.aiConvRate}%`} sub={`vs ${data.overallConvRate}% overall`} />
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>By Platform</h2>
        {data.platforms.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>No AI traffic yet</p>
            <p style={{ color: "#6b7280", margin: 0 }}>
              Once visitors arrive from ChatGPT, Perplexity, or other AI platforms, their sessions and orders will appear here.
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                {["Platform", "Orders", "Revenue"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.platforms.map((p) => (
                <tr key={p.key} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 12px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: p.color, display: "inline-block" }} />
                      <strong>{p.label}</strong>
                    </span>
                  </td>
                  <td style={{ padding: "12px 12px" }}>{p.orders}</td>
                  <td style={{ padding: "12px 12px" }}>{fmt(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "#f9fafb", borderRadius: 8, padding: "16px 20px", border: "1px solid #e5e7eb" }}>
      <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700 }}>{value}</p>
      {sub && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>{sub}</p>}
    </div>
  );
}
