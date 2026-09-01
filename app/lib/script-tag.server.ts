/**
 * Ensures our tracking script tag is installed on the merchant's storefront.
 * Uses the Shopify GraphQL Admin API. Safe to call on every admin page load —
 * it only creates the tag if it doesn't already exist.
 */

// Simple in-memory cache so we don't query Shopify on every request
const installedShops = new Set<string>();

export async function ensureScriptTag(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<{ json: () => Promise<unknown> }> },
  shop: string,
  appUrl: string
) {
  if (installedShops.has(shop)) return;

  const scriptSrc = `${appUrl}/tracking.js`;

  // Check existing script tags
  const listResponse = await admin.graphql(`
    query {
      scriptTags(first: 10) {
        edges {
          node {
            id
            src
          }
        }
      }
    }
  `);

  const listData = (await listResponse.json()) as {
    data: { scriptTags: { edges: Array<{ node: { id: string; src: string } }> } };
  };

  const existing = listData.data.scriptTags.edges.find(
    (e) => e.node.src === scriptSrc
  );

  if (existing) {
    installedShops.add(shop);
    return;
  }

  // Create the script tag
  await admin.graphql(`
    mutation scriptTagCreate($input: ScriptTagInput!) {
      scriptTagCreate(input: $input) {
        scriptTag { id src }
        userErrors { field message }
      }
    }
  `, {
    variables: {
      input: {
        src: scriptSrc,
        displayScope: "ALL",
      },
    },
  });

  installedShops.add(shop);
}
