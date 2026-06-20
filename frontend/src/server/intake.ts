// Lightweight heuristic stand-in for the real OpenRouter/DeepSeek intake parser.
// Extracts trade/city/budget/urgency from a free-text message so the chatbot
// landing page has something real to react to without calling an LLM.

export interface ParsedIntake {
  trade?: string;
  city?: string;
  budgetCents?: number;
  urgency?: "low" | "normal" | "high" | "emergency";
}

const TRADE_KEYWORDS: Record<string, string[]> = {
  plumbing: ["plumb", "pipe", "leak", "faucet", "toilet", "drain", "water heater"],
  electrical: ["electric", "outlet", "wiring", "breaker", "circuit", "light fixture"],
  hvac: ["hvac", "heat", "air condition", "furnace", "thermostat", "a/c", "ac unit"],
  lawncare: ["lawn", "grass", "landscap", "mow", "yard"],
  cleaning: ["clean", "janitorial", "housekeeping"],
  general_maintenance: ["maintenance", "repair", "fix", "handyman"],
};

const CITY_KEYWORDS: Record<string, string[]> = {
  "New York": ["new york", "nyc", "manhattan", "brooklyn"],
  "Los Angeles": ["los angeles", " la ", "l.a."],
  Chicago: ["chicago"],
};

export function parseIntake(message: string): ParsedIntake {
  const lower = ` ${message.toLowerCase()} `;
  const result: ParsedIntake = {};

  for (const [trade, keywords] of Object.entries(TRADE_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      result.trade = trade;
      break;
    }
  }

  for (const [city, keywords] of Object.entries(CITY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      result.city = city;
      break;
    }
  }

  const budgetMatch = lower.match(/\$\s?([0-9][0-9,]*)/);
  if (budgetMatch) {
    result.budgetCents = Number(budgetMatch[1].replace(/,/g, "")) * 100;
  }

  if (/\b(emergency|urgent|asap|right away)\b/.test(lower)) {
    result.urgency = "emergency";
  } else if (/\b(soon|priority|high priority)\b/.test(lower)) {
    result.urgency = "high";
  }

  return result;
}

export function titleFor(trade: string, message: string): string {
  const tradeLabel = trade.replace(/_/g, " ");
  const trimmed = message.trim();
  const snippet = trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
  return `${tradeLabel[0].toUpperCase()}${tradeLabel.slice(1)} request: ${snippet}`;
}

export function missingFieldsPrompt(parsed: ParsedIntake): string {
  const missing: string[] = [];
  if (!parsed.trade) missing.push("the trade you need (plumbing, electrical, hvac, lawncare, cleaning, or general maintenance)");
  if (!parsed.city) missing.push("the city (New York, Los Angeles, or Chicago)");
  return `Got it — to find matching vendors, could you also tell me ${missing.join(" and ")}?`;
}
