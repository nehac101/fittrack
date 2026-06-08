import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import Anthropic from "@anthropic-ai/sdk";

// JSON schema the model must fill in. Structured outputs guarantee we get
// these exact fields back, so the client can render without defensive parsing.
const MATCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    found: { type: "boolean" },
    exerciseId: { type: "string" }, // id from the catalog, or "" if not in it
    exerciseName: { type: "string" }, // canonical name (best guess if not in catalog)
    category: {
      type: "string",
      enum: ["back", "chest", "shoulders", "arms", "legs", "abs", "cardio"],
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    note: { type: "string" }, // one short sentence for the user
  },
  required: ["found", "exerciseId", "exerciseName", "category", "confidence", "note"],
};

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

// Dev-server middleware that proxies exercise-identification requests to Claude.
// The API key stays here in Node — it is never bundled or sent to the browser.
function exerciseFinder(apiKey) {
  return {
    name: "fittrack-exercise-finder",
    configureServer(server) {
      server.middlewares.use("/api/identify-exercise", async (req, res) => {
        const send = (status, obj) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(obj));
        };
        if (req.method !== "POST") return send(405, { error: "Use POST" });
        if (!apiKey) {
          return send(500, {
            error: "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.",
          });
        }
        try {
          const { query, exercises } = await readJson(req);
          if (!query || !query.trim()) return send(400, { error: "Empty query" });

          const catalog = (exercises || [])
            .map((e) => `${e.id}\t${e.name}\t${e.category}`)
            .join("\n");

          const client = new Anthropic({ apiKey });
          const message = await client.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 1024,
            system:
              "You identify gym/weightlifting exercises from a user's free-text description. " +
              "You are given a catalog of known exercises as tab-separated `id\\tname\\tcategory` lines. " +
              "Find the single best match in the catalog and return its exact id. " +
              "If the description clearly matches a catalog exercise, set found=true and use that id. " +
              "If nothing in the catalog matches, set found=false, leave exerciseId empty, and give your best " +
              "identification of what the exercise actually is in exerciseName plus the most likely category, " +
              "so the user can add it. Keep `note` to one short, helpful sentence.",
            messages: [
              {
                role: "user",
                content:
                  `User's description: "${query}"\n\n` +
                  `Exercise catalog (id\\tname\\tcategory):\n${catalog}`,
              },
            ],
            output_config: { format: { type: "json_schema", schema: MATCH_SCHEMA } },
          });

          const text = message.content.find((b) => b.type === "text")?.text ?? "{}";
          return send(200, JSON.parse(text));
        } catch (e) {
          // Surface the API error message so the UI can show something useful.
          const msg = e?.error?.error?.message || e?.message || "Unknown error";
          return send(e?.status || 500, { error: msg });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Loads .env.local etc. The key has NO VITE_ prefix, so Vite never exposes it
  // to client code — it lives only in this Node process.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), exerciseFinder(env.ANTHROPIC_API_KEY)],
  };
});
