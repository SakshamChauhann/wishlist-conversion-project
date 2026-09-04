# Deploying WishlistLens + Second Look with live AI working

This folder is a ready-to-deploy Netlify site. It contains both tools plus a serverless
function that keeps your Groq API key private while letting the "Ask AI" / "AI Style Read"
buttons work on a publicly hosted link (not just on claude.ai).

**Why Groq, not Claude, on the hosted link:** on claude.ai these tools call Claude directly, for
free, using the built-in capability — that only works inside claude.ai. To make the same buttons
work on a link anyone can open, the page needs its own API key behind a server, and that
normally means a paid Anthropic key. Groq's API is free to start and is OpenAI-compatible, so the
serverless function below calls Groq's hosted Llama 3.3 70B model instead. The page's copy is
written to match: it says "Claude" only where Claude is genuinely answering (on claude.ai) and
"AI" on the hosted link, where the model behind the button is Llama, not Claude.

**Note on Groq's free tier:** at the time this was put together, Groq offered a free tier with
generous request limits, and its docs distinguish a "Free" plan from a paid "Developer" plan —
but I couldn't fully confirm from their docs whether a credit card is required to create a key.
If Groq asks for one during signup, that's Groq's current policy, not something baked into this
code — the function below works with any Groq key placed in the same environment variable.

**Important: use the GitHub + Netlify route below, not Netlify Drop.** Drop only publishes
static files — it does not run the serverless function or read environment variables, so the
AI buttons would stay unavailable. The extra 10 minutes below is what actually makes them work.

## What you need first
- A free **GitHub** account (github.com) if you don't have one.
- A free **Netlify** account (netlify.com) if you don't have one — sign up with your GitHub
  account, it's one click.
- A **Groq API key**: go to console.groq.com → sign in → API Keys → Create API Key. Copy it
  somewhere safe (you'll paste it into Netlify, never into any file you upload).

## Steps

1. **Create a new GitHub repository.**
   - github.com → the "+" icon (top right) → "New repository".
   - Name it anything (e.g. `wishlist-conversion-project`). Keep it Public or Private, either
     works. Click "Create repository".

2. **Upload these files to it.**
   - On the new repo's page, click "uploading an existing file".
   - Drag in everything from this folder: `index.html`, `discovery-engine.html`, `second-look.html`,
     `netlify.toml`, and the whole `netlify/` folder (with `functions/ask-ai.js` inside it —
     make sure the folder structure is preserved, not flattened).
   - Commit the files.
   - **If you already deployed once before this change:** re-upload the same way — GitHub will
     ask to replace the changed files (`discovery-engine.html`, `second-look.html`, and the
     renamed `netlify/functions/ask-ai.js` in place of the old `ask-claude.js`). Delete the old
     `netlify/functions/ask-claude.js` from the repo if GitHub doesn't do it for you, so there
     isn't a stale function left pointing at a key you no longer need.

3. **Connect Netlify to that repo.**
   - app.netlify.com → "Add new site" → "Import an existing project" → "Deploy with GitHub".
   - Authorize Netlify to see your GitHub account, then pick the repo you just created.
   - Build settings: leave them as Netlify auto-detects from `netlify.toml` (publish directory
     `.`, functions directory `netlify/functions`). Click "Deploy site".

4. **Add your API key as an environment variable (never in the code itself).**
   - On your new site in Netlify: Site configuration → Environment variables → "Add a variable".
   - Key: `GROQ_API_KEY`   Value: (paste the key from console.groq.com)
   - Save, then go to Deploys → "Trigger deploy" → "Deploy site" so the function picks it up.

5. **Get your links.**
   - Netlify gives you a URL like `https://your-site-name.netlify.app`.
   - That root URL now opens a landing page linking to both tools.
   - Discovery engine directly: `https://your-site-name.netlify.app/discovery-engine.html`
   - MVP directly: `https://your-site-name.netlify.app/second-look.html`
   - Open either one, try the AI button — it should now stream back a real answer, labeled "AI"
     rather than "Claude" (that labeling is intentional — see above).

6. **Send me both final URLs** and I'll swap them into the deck's hyperlinks and re-send you
   the updated PDF.

## If something doesn't work
- **"Page not found" on the root URL** (`your-site-name.netlify.app` with nothing after it):
  this means `index.html` wasn't in the upload. Add it (see step 2's note above) — the two tools
  at `/discovery-engine.html` and `/second-look.html` work either way, `index.html` is just a
  landing page linking to both.
- **"Page not found" on `/discovery-engine.html` or `/second-look.html` specifically**: check the
  repo on GitHub — the file names are case-sensitive and must match exactly, and Netlify's deploy
  log (Deploys tab → click the latest deploy) will show what it actually published.
- AI button still says "unavailable": double-check the environment variable name is exactly
  `GROQ_API_KEY`, that the function file is named `netlify/functions/ask-ai.js` (not the old
  `ask-claude.js`), and that you triggered a fresh deploy after adding the variable.
- A red/error message when you click it: click it again — the message itself will usually say
  why (e.g. a Groq account/rate-limit issue on your key). Everything else on both pages
  (Fit Match, Ask Someone, the whole discovery-engine dashboard) works with zero dependency on
  this step.
