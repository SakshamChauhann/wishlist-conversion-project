// Serverless proxy so the browser never sees the API key.
// Deployed as a Netlify Function; the key lives only in Netlify's
// environment variables (Site configuration -> Environment variables -> GROQ_API_KEY).
//
// Calls Groq's free-tier API (an OpenAI-compatible chat-completions endpoint), not Anthropic.
// This means the self-hosted copy of these tools gets a real, live AI call without requiring
// a paid API key — but the model answering here is whatever Groq is currently serving under
// the model id below (OpenAI's open-weight gpt-oss-120b, served by Groq, as of Sept 2026 —
// Groq had previously served Llama 3.3 70B under this same function, but deprecated it on
// 2026-08-16; if this model id ever 404s the same way, check console.groq.com/docs/models
// for whatever replaced it), not Claude. The front-end copy is written to say "AI" rather
// than "Claude" for anything routed through this function, so nothing on the page overclaims
// which model actually answered.

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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: "Server missing GROQ_API_KEY. Set it in Netlify Site configuration -> Environment variables, then redeploy." }),
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

  const body = {
    model: "openai/gpt-oss-120b",
    max_tokens: 500,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return { statusCode: resp.status, headers: cors, body: JSON.stringify({ error: "Upstream API error", detail: detail.slice(0, 400) }) };
    }
    const data = await resp.json();
    const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    return { statusCode: 200, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify({ text }) };
  } catch (err) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "Request to Groq failed", detail: String(err) }) };
  }
};
