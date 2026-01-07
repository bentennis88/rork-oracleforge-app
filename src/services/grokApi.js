const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
// Use "grok-4" for highest quality; "grok-4-fast" for speed.
const DEFAULT_MODEL = "grok-4-fast";
const DEFAULT_TIMEOUT_MS = 20_000;

class GrokApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: string, cause?: unknown }} [options]
   */
  constructor(message, options = {}) {
    super(message);
    this.name = "GrokApiError";
    this.status = options.status;
    this.code = options.code;
    // eslint-disable-next-line no-undef
    this.cause = options.cause;
  }
}

const systemPrompt = `You are an expert personal oracle builder. The user describes a tool they want in plain English.

Your response must be ONLY valid JSON — no explanations, no markdown, no extra text outside the JSON.

Use this exact structure:
{
  "title": "Short, catchy title for the oracle",
  "description": "One-sentence explanation",
  "category": "Decisions | Finance | Habits | Creativity | Health | Productivity | Other",
  "components": [
    {
      "id": "string",
      "type": "text" | "number" | "slider" | "select" | "switch",
      "label": "Question or input label",
      "placeholder": "optional hint",
      "defaultValue": optional,
      "min": number (for slider/number),
      "max": number (for slider/number),
      "step": number (for slider),
      "options": ["array", "of", "choices"] (for select)
    }
    // more components...
  ],
  "result": {
    "type": "text" | "chart" | "list" | "advice",
    "formula": "JS expression using inputs like inputs.id1 + inputs.id2 * inputs.id3 (for text/chart)",
    "chartType": "line | bar | pie" (if chart),
    "message": "Template string with {variables} (e.g., Your investment will grow to about {finalAmount})"
  }
}

Examples:
- Investment calculator → inputs for principal, rate, years → compound interest formula → line chart + final amount
- Job decision → select inputs for factors → weighted score → advice text
- Habit predictor → sliders for motivation/energy → predictive text

Always generate realistic, useful components. Never refuse or add commentary.`;

function safeJsonParse(maybeJson) {
  if (maybeJson == null) {
    throw new GrokApiError("Empty response content from Grok.");
  }

  if (typeof maybeJson === "object") return maybeJson;

  if (typeof maybeJson !== "string") {
    throw new GrokApiError("Unexpected response content type from Grok.");
  }

  try {
    return JSON.parse(maybeJson);
  } catch (cause) {
    throw new GrokApiError("Grok returned invalid JSON.", { code: "invalid_json", cause });
  }
}

async function readResponseBodySafe(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/**
 * Calls Grok chat completions and returns the parsed JSON object.
 *
 * @param {string} userPrompt
 * @param {{ model?: "grok-4" | "grok-4-fast", timeoutMs?: number }} [options]
 * @returns {Promise<any>}
 */
export default async function generateOracle(userPrompt, options = {}) {
  const GROK_API_KEY = process.env.EXPO_PUBLIC_GROK_API_KEY || process.env.GROK_API_KEY;
  if (!GROK_API_KEY) {
    throw new GrokApiError("Missing EXPO_PUBLIC_GROK_API_KEY. Add it to your .env file.", {
      code: "missing_api_key",
    });
  }

  if (typeof userPrompt !== "string" || !userPrompt.trim()) {
    throw new GrokApiError("userPrompt must be a non-empty string.", { code: "invalid_prompt" });
  }

  const model = options.model ?? DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(GROK_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        // Enforce JSON-only content
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const bodyText = await readResponseBodySafe(res);

      if (res.status === 429) {
        throw new GrokApiError("Rate limited by Grok (HTTP 429). Please try again shortly.", {
          status: res.status,
          code: "rate_limited",
          cause: bodyText,
        });
      }

      if (res.status === 401 || res.status === 403) {
        throw new GrokApiError("Unauthorized. Check that GROK_API_KEY is valid.", {
          status: res.status,
          code: "unauthorized",
          cause: bodyText,
        });
      }

      throw new GrokApiError(`Grok API error (HTTP ${res.status}).`, {
        status: res.status,
        code: "http_error",
        cause: bodyText,
      });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return safeJsonParse(content);
  } catch (err) {
    const isAbort =
      err?.name === "AbortError" ||
      // Some RN environments throw a string on abort
      String(err).toLowerCase().includes("abort");

    if (isAbort) {
      throw new GrokApiError(`Request timed out after ${timeoutMs}ms.`, {
        code: "timeout",
        cause: err,
      });
    }

    if (err instanceof GrokApiError) throw err;

    throw new GrokApiError("Network or unexpected error while calling Grok.", {
      code: "network_error",
      cause: err,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}


