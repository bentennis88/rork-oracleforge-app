const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
// Use "grok-4" for highest quality; "grok-4-fast" for speed.
const DEFAULT_MODEL = "grok-4-fast";
const DEFAULT_TIMEOUT_MS = 20_000;

// TEMP DEBUG: verify the Grok key is available at runtime (does NOT print the key itself).
// Remove this once you've confirmed env loading works.
const __GROK_KEY_DEBUG =
  process.env.EXPO_PUBLIC_GROK_API_KEY || process.env.GROK_API_KEY || "";
// eslint-disable-next-line no-undef
if (typeof __DEV__ !== "undefined" ? __DEV__ : true) {
  // eslint-disable-next-line no-console
  console.log(
    "GROK KEY LOADED:",
    __GROK_KEY_DEBUG
      ? `YES (length: ${__GROK_KEY_DEBUG.length})`
      : "NO – MISSING!"
  );
}

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

const systemPrompt = `You are an expert builder of interactive personal tools called "oracles". The user describes what they want in plain English.

You MUST respond with ONLY valid JSON in this exact structure — no extra text, no markdown, no explanations.

IMPORTANT: These tools are STATEFUL. The app stores user logs over time. Your oracle MUST be designed to work with that memory.

Runtime variables available to your formulas/messages:
- inputs: current form values (object)
- logs: array of past log entries for this oracle (array of objects). Shape depends on "persistence":
  Example daily logs: { date: "YYYY-MM-DD", rating?: number, status?: string, ... }

YOU MUST:
- ALWAYS include persistence (a first-class field in the JSON)
- Make results dynamic: use inputs and/or logs to calculate (streaks, averages, totals, projections). Never just echo inputs.

JSON structure (exact top-level keys):
{
  "title": "Catchy, concise title",
  "description": "One-sentence explanation (stateful by design; mention logging/saving if relevant)",
  "category": "Decisions | Finance | Habits | Creativity | Health | Productivity | Other",
  "persistence": {
    "type": "daily_log",
    "key": "date",
    "fields": ["rating", "status"]
  },
  "reminders": [
    // OPTIONAL: include ONLY if the tool is a reminder/notification style tool
    { "interval": "hourly" | "daily" | "weekly", "time": "8am-7pm", "message": "Drink water" }
  ],
  "components": [
    // ALWAYS include at least 2-4 interactive components
    {
      "id": "unique_id",
      "type": "text" | "number" | "slider" | "select" | "date" | "switch",
      "label": "Clear label",
      "placeholder": "Hint (optional)",
      "defaultValue": "optional default",
      "min": number (for slider/number),
      "max": number,
      "step": number,
      "options": ["Choice 1", "Choice 2"] (for select)
    }
  ],
  "result": {
    "type": "text" | "advice" | "chart",
    "chartType": "line" | "bar", // REQUIRED when result.type = "chart"
    "message": "Result text using {inputs.*}, {logs.*} and/or {result}. Include streak/avg/total/projection where relevant.",
    "formula": "JS expression using inputs.* and/or logs.* (e.g. logs.length, logs.filter(...).length). Must be safe JS."
  }
}

RULES (follow strictly):
- ALWAYS include interactive components — never just description.
- ALWAYS include persistence:
  - Use persistence.type = \"daily_log\" and persistence.key = \"date\" for daily trackers.
  - persistence.fields must list which input fields are stored in each log entry (e.g. [\"rating\",\"status\"]; add more if needed like \"glasses\").
- Trackers (habits, health, productivity, finance tracking):
  - Must include date component: { id: \"date\", type: \"date\", defaultValue: \"YYYY-MM-DD\" }
  - Must include rating input (slider or number) and status select (or switch).
  - Must imply log/save behavior in description (\"Log this daily\", \"Save each entry\").
  - Result must include:
    - A streak calculation concept (consecutive days)
    - Average from logs
    - Total entries
  - Prefer result.type = \"chart\" with chartType \"line\" for moods/sleep and \"bar\" for workouts/steps.
- Predictors:
  - Must use history from logs in formula/message (e.g., rolling average, trend, projection).
- Reminders:
  - Add reminders field with sensible defaults (interval + time window + message).
  - Still include persistence (to track compliance / completion logs).
- Decisions:
  - Use select/switch inputs, compute a score, and give advice. Persistence can log decisions/outcomes.
- IDs: stable, lowercase, no spaces. Prefer: date, rating, status, glasses, minutes, mood, energy, sleep, caffeine, option_a, option_b.
- JSON ONLY. No extra keys. No commentary.

EXAMPLES (guidance; real responses must still be JSON-only):

Water intake reminder (stateful + reminders + chart):
{
  "title": "Water Intake Streak",
  "description": "Log your daily water intake and stay on track with reminders.",
  "category": "Health",
  "persistence": { "type": "daily_log", "key": "date", "fields": ["glasses", "status"] },
  "reminders": [{ "interval": "hourly", "time": "8am-7pm", "message": "Drink water" }],
  "components": [
    { "id": "date", "type": "date", "label": "Date", "defaultValue": "2026-01-07" },
    { "id": "glasses", "type": "number", "label": "Glasses today", "placeholder": "0", "defaultValue": 6, "min": 0, "max": 30 },
    { "id": "status", "type": "select", "label": "Met goal?", "options": ["yes", "no"], "defaultValue": "no" }
  ],
  "result": {
    "type": "chart",
    "chartType": "bar",
    "formula": "logs.length",
    "message": "Today: {inputs.glasses} glasses. Total logs: {result}. Avg glasses: {logs.reduce((s,l)=>s+(l.glasses||0),0)/Math.max(1,logs.length)}. Show streak of consecutive days with status=='yes' and a weekly bar chart."
  }
}

Mood tracker (chart over time + averages):
{
  "title": "Mood Trend Tracker",
  "description": "Log mood daily and visualize your trend over time.",
  "category": "Health",
  "persistence": { "type": "daily_log", "key": "date", "fields": ["rating", "status"] },
  "components": [
    { "id": "date", "type": "date", "label": "Date", "defaultValue": "2026-01-07" },
    { "id": "rating", "type": "slider", "label": "Mood (1-10)", "min": 1, "max": 10, "step": 1, "defaultValue": 6 },
    { "id": "status", "type": "select", "label": "Day type", "options": ["normal", "stressful", "great"], "defaultValue": "normal" }
  ],
  "result": {
    "type": "chart",
    "chartType": "line",
    "formula": "logs.filter(l => l.rating != null).length",
    "message": "Logs: {result}. Avg mood: {logs.reduce((s,l)=>s+(l.rating||0),0)/Math.max(1,logs.filter(l=>l.rating!=null).length)}. Show a line chart of rating by date and a current streak of days logged."
  }
}

Custom decision maker (stateful decisions log):
{
  "title": "Decision Scorecard",
  "description": "Score your options and log the outcome for future learning.",
  "category": "Decisions",
  "persistence": { "type": "daily_log", "key": "date", "fields": ["status", "rating"] },
  "components": [
    { "id": "date", "type": "date", "label": "Date", "defaultValue": "2026-01-07" },
    { "id": "status", "type": "select", "label": "Chosen option", "options": ["option_a", "option_b"], "defaultValue": "option_a" },
    { "id": "rating", "type": "slider", "label": "Confidence (1-10)", "min": 1, "max": 10, "step": 1, "defaultValue": 6 },
    { "id": "notes", "type": "text", "label": "Key reason (optional)", "placeholder": "One sentence" }
  ],
  "result": {
    "type": "advice",
    "formula": "inputs.rating",
    "message": "You chose {inputs.status} with confidence {result}/10. Over time, compare average confidence across choices using logs to learn patterns."
  }
}

Respond ONLY with JSON.
`;

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
  const EXPO_PUBLIC_GROK_API_KEY =
    process.env.EXPO_PUBLIC_GROK_API_KEY || process.env.GROK_API_KEY;
  if (!EXPO_PUBLIC_GROK_API_KEY) {
    throw new GrokApiError("Missing EXPO_PUBLIC_GROK_API_KEY. Add it to your .env file.", {
      code: "missing_api_key",
    });
  }

  if (typeof userPrompt !== "string" || !userPrompt.trim()) {
    throw new GrokApiError("userPrompt must be a non-empty string.", { code: "invalid_prompt" });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60 seconds

  try {
    const response = await fetch(GROK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${EXPO_PUBLIC_GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await readResponseBodySafe(response);
      throw new Error(`Grok API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) throw new Error("No response from Grok");

    // response_format json_object may already yield an object in some SDKs
    return typeof content === "string" ? JSON.parse(content) : content;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error?.name === "AbortError") {
      throw new Error("Request timed out after 60s");
    }
    throw error;
  }
}


