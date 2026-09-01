/**
 * AI Platform Attribution
 * Detects which AI platform referred a visitor based on HTTP referrer and UTM params.
 */

export type AIPlatform =
  | "chatgpt"
  | "perplexity"
  | "copilot"
  | "gemini"
  | "claude"
  | "you"
  | "phind"
  | "kagi"
  | "brave-leo"
  | "meta-ai"
  | "grok";

// Known AI platform referrer domains
const AI_REFERRER_MAP: Record<string, AIPlatform> = {
  "chat.openai.com": "chatgpt",
  "chatgpt.com": "chatgpt",
  "perplexity.ai": "perplexity",
  "copilot.microsoft.com": "copilot",
  "gemini.google.com": "gemini",
  "bard.google.com": "gemini",
  "aistudio.google.com": "gemini",
  "claude.ai": "claude",
  "you.com": "you",
  "phind.com": "phind",
  "kagi.com": "kagi",
  "search.brave.com": "brave-leo",
  "meta.ai": "meta-ai",
  "grok.com": "grok",
  "x.com": "grok", // Grok embedded in X — only if path matches
};

// UTM source values that map to AI platforms
const UTM_SOURCE_MAP: Record<string, AIPlatform> = {
  chatgpt: "chatgpt",
  openai: "chatgpt",
  perplexity: "perplexity",
  copilot: "copilot",
  bing_ai: "copilot",
  bingai: "copilot",
  gemini: "gemini",
  bard: "gemini",
  claude: "claude",
  you: "you",
  phind: "phind",
  grok: "grok",
  "meta-ai": "meta-ai",
  metaai: "meta-ai",
};

export function detectAIPlatform(
  referrer: string | null | undefined,
  utmSource: string | null | undefined
): AIPlatform | null {
  // UTM source takes priority — merchants can tag campaigns explicitly
  if (utmSource) {
    const mapped = UTM_SOURCE_MAP[utmSource.toLowerCase().trim()];
    if (mapped) return mapped;
  }

  if (referrer) {
    try {
      const url = new URL(referrer);
      const hostname = url.hostname.replace(/^www\./, "");

      for (const [domain, platform] of Object.entries(AI_REFERRER_MAP)) {
        // Exact match or subdomain match
        if (hostname === domain || hostname.endsWith("." + domain)) {
          // Special case: x.com only counts when it's a Grok path
          if (domain === "x.com" && !url.pathname.startsWith("/i/grok")) {
            continue;
          }
          // Special case: bing.com only counts when it's the AI chat
          if (
            domain === "bing.com" &&
            !url.pathname.toLowerCase().includes("chat")
          ) {
            continue;
          }
          return platform;
        }
      }
    } catch {
      // Invalid referrer URL — ignore
    }
  }

  return null;
}

export function getPlatformLabel(platform: AIPlatform | null): string {
  const labels: Record<AIPlatform, string> = {
    chatgpt: "ChatGPT",
    perplexity: "Perplexity",
    copilot: "Microsoft Copilot",
    gemini: "Google Gemini",
    claude: "Claude",
    you: "You.com",
    phind: "Phind",
    kagi: "Kagi",
    "brave-leo": "Brave Leo",
    "meta-ai": "Meta AI",
    grok: "Grok",
  };
  return platform ? (labels[platform] ?? platform) : "Unknown";
}

export function getPlatformColor(platform: AIPlatform | null): string {
  const colors: Record<AIPlatform, string> = {
    chatgpt: "#10a37f",
    perplexity: "#20b2aa",
    copilot: "#0078d4",
    gemini: "#4285f4",
    claude: "#d4690a",
    you: "#7c3aed",
    phind: "#f59e0b",
    kagi: "#6366f1",
    "brave-leo": "#fb542b",
    "meta-ai": "#0866ff",
    grok: "#000000",
  };
  return platform ? (colors[platform] ?? "#6b7280") : "#6b7280";
}
