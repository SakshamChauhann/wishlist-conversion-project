// Serverless proxy so the browser never sees the Anthropic API key.
// Deployed as a Netlify Function; the key lives only in Netlify's
// environment variables (Site settings -> Environment variables -> ANTHROPIC_API_KEY).

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: "Server missing ANTHROPIC_API_KEY. Set it in Netlify Site settings -> Environment variables, then redeploy." }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Malformed request body" }) };
  }

  const prompt = typeof payload.prompt === "string" ? payload.prompt.slice(0, 8000) : "";
  const jsonMode = !!payload.json;
  if (!prompt) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Missing 'prompt' string" }) };
  }

  const system = jsonMode
    ? "Reply with ONLY valid JSON matching what the user asks for. No markdown fences, no prose before or after."
    : "You are a concise, warm assistant embedded in a fashion-shopping prototype. Keep replies short and plain (no markdown).";

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return { statusCode: resp.status, headers: cors, body: JSON.stringify({ error: "Upstream API error", detail: detail.slice(0, 400) }) };
    }
    const data = await resp.json();
    const text = (data.content || []).map((b) => b.text || "").join("");
    return { statusCode: 200, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify({ text }) };
  } catch (err) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "Request to Anthropic failed", detail: String(err) }) };
  }
};
