# YouTube Data API key — setup for this project

This project collects **public YouTube comments** via the official [YouTube Data API v3](https://developers.google.com/youtube/v3), not by scraping pages. An API key is enough: we only read public data, so OAuth and a credit card are not required (`D-011`).

Time: about 5–10 minutes. The key is free. Default quota is enough for corpus collection if you stay within the limits at the bottom of this page.

**Never commit the key.** It belongs in `.env` locally. GitHub Actions when corpus jobs run; Vercel only in Phase 6 if a server route calls YouTube.

---

## 1. Open Google Cloud Console

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com).
2. Sign in with a Google account.
3. If Google asks you to accept terms or pick a country, do that and continue.

---

## 2. Create a project

1. At the top of the console, click the **project picker** (it may say “Select a project”).
2. Click **New project**.
3. Set:
   - **Project name:** `AI Discovery Engine` (or any name you will recognize).
   - **Organization / location:** leave default unless you already have one.
4. Click **Create**.
5. Wait until the notification says the project is ready, then **select that project** in the picker. Everything below must happen inside this project.

---

## 3. Enable YouTube Data API v3

1. Open the left menu (☰) → **APIs & Services** → **Library**.
2. Search for `YouTube Data API v3`.
3. Open **YouTube Data API v3** (not YouTube Analytics, not YouTube Reporting).
4. Click **Enable**.

You only need this one API. Do not enable OAuth consent or other Google APIs for this connector.

---

## 4. Create the API key

1. Left menu → **APIs & Services** → **Credentials**.
2. Click **+ Create credentials** → **API key**.
3. A dialog shows a string that starts with `AIza…`. That is the key.
4. Click **Copy**, then **Close**. You will restrict it next — do not skip that.

---

## 5. Restrict the key (do this immediately)

An unrestricted key can be used against any Google API if it leaks. Restrict it now.

1. On **Credentials**, click the new key (or the pencil icon).
2. **Name:** `youtube-comments-corpus`.
3. Under **API restrictions**:
   - Choose **Restrict key**.
   - Select **YouTube Data API v3** only.
4. Leave **Application restrictions** as **None** for now.

   The corpus job runs from your machine and from GitHub Actions, not from a browser, so an HTTP-referrer restriction would block it. If you later lock it down, use **IP addresses** for a known runner, not website referrers.

5. Click **Save**.

---

## 6. Add the key to this repo (local)

From the project root (`AI Discovery Engine`):

1. Create a file named `.env` if it does not exist. It must sit next to `.env.example`, not inside `docs/`.
2. Add this line (paste your real key, no quotes, no spaces):

```
YOUTUBE_API_KEY=AIza...your_key_here
```

3. Confirm `.env` is gitignored. If `.gitignore` is missing that line, add:

```
.env
```

4. Keep a name-only placeholder in `.env.example` so clones know the variable exists:

```
YOUTUBE_API_KEY=
```

Rules:

- Server-side only. **Do not** name it `NEXT_PUBLIC_YOUTUBE_API_KEY` — that would ship the key to the browser (`T0.5`).
- Do not paste the key into chat, screenshots, commits, or the website.

The YouTube connector reads `process.env.YOUTUBE_API_KEY`. If that variable is empty, collection should fail loudly rather than silently skip YouTube.

---

## 7. Add the key for jobs and (later) deploy

Phase 1 needs this key in local `.env`. GitHub Actions when corpus jobs run. Vercel only in Phase 6, and only if a server-side route calls YouTube. Public pages must never see this key.

### Vercel (Phase 6)

1. Open the Vercel project → **Settings** → **Environment Variables**.
2. Name: `YOUTUBE_API_KEY`.
3. Value: the same key as in `.env`.
4. Environments: Production, Preview, Development as needed.
5. Save, then **redeploy** so the new variable is picked up.

### GitHub Actions (corpus jobs)

1. Repo → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret**.
3. Name: `YOUTUBE_API_KEY`.
4. Value: the same key.
5. In the workflow, map it into the job env:

```yaml
env:
  YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}
```

---

## 8. Smoke-test the key

Run this from a terminal (PowerShell). Replace `YOUR_KEY` with the key.

```powershell
curl "https://www.googleapis.com/youtube/v3/search?part=snippet&q=myntra%20wishlist&type=video&maxResults=1&key=YOUR_KEY"
```

**Pass:** JSON with an `items` array and a video `id`.

**Fail — common causes:**

| What you see | What to do |
| --- | --- |
| `API key not valid` | Wrong key, extra space/quotes in `.env`, or you are in a different Cloud project than the one that created the key |
| `YouTube Data API v3 has not been used` / not enabled | Repeat step 3 on the **same** project that owns the key |
| `API_KEY_HTTP_REFERRER_BLOCKED` or similar restriction error | Application restrictions are too tight; set them to **None** (or an IP allowlist that includes your machine) |
| `quotaExceeded` | Daily budget used; wait until midnight Pacific, or reduce search/comment calls |

Do not put the key in a URL you share. After the test, you can rotate the key if it was pasted into a log.

---

## 9. What this key is used for

Phase 1 corpus connector: **search public videos** about consideration language (wishlist, fit, “should I buy”, etc.), then **list public comment threads** on those videos.

| Call | Why | Default daily budget |
| --- | --- | --- |
| `search.list` | Find relevant videos | **100 calls / day** (own bucket) |
| `commentThreads.list` | Pull comments (up to 100 per page) | **1 unit each**, from the **10,000 unit / day** shared pool |
| `videos.list` | Optional video metadata | **1 unit** from the same 10,000 pool |

Quota resets at **midnight Pacific Time**. `search.list` and comment reads do **not** share one number: you can exhaust 100 searches while still having comment units left, and the other way around.

Rough capacity on the default free quota:

- 100 video searches per day (paginating search also costs a call per page).
- Thousands of comment pages per day at 1 unit each — comments are cheap; **search is the scarce resource**.

Stay inside these caps. Do not scrape youtube.com HTML as a fallback (`D-011`).

---

## 10. If the key leaks

1. Google Cloud Console → **APIs & Services** → **Credentials**.
2. Open the key → **Regenerate** (or delete and create a new one).
3. Update `.env`, Vercel, and GitHub Actions with the new value.
4. Treat the old key as dead immediately.

---

## Checklist

- [ ] Cloud project created and selected
- [ ] YouTube Data API v3 enabled
- [ ] API key created and restricted to that API
- [ ] `YOUTUBE_API_KEY` in local `.env`
- [ ] `.env` gitignored; `.env.example` has the name only
- [ ] Same secret in Vercel and GitHub Actions when those exist
- [ ] Smoke-test `search.list` returns JSON
- [ ] Key never committed or prefixed with `NEXT_PUBLIC_`
