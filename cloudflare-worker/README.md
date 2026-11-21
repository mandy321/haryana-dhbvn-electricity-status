# Cloudflare Worker CORS Proxy for DHBVN Live Outage Data

This directory contains a lightweight, zero-dependency Cloudflare Worker designed to securely proxy in-browser live refresh queries to the official DHBVN portal (`https://chs.dhbvn.org.in/api/AppsavyServices/GetRelationalDataA`).

## Why is this needed?
The DHBVN backend server does not set `Access-Control-Allow-Origin: *` headers, meaning web browsers block direct XML/POST calls due to CORS (Cross-Origin Resource Sharing) restrictions. Third-party anonymous proxies like `corsproxy.io` now require paid API keys and return 403 Forbidden.

A Cloudflare Worker provides **100,000 requests/day for free**, with sub-millisecond execution latency.

---

## 1-Minute Deployment Guide

### Option A: Via Cloudflare Dashboard (No CLI needed)
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) and log in (free account).
2. On the left sidebar, click **Compute (Workers & Pages)** > **Create application** > **Create Worker**.
3. Choose a name (e.g. `dhbvn-cors-proxy`) and click **Deploy**.
4. Click **Edit code**.
5. Replace the entire code editor with the contents of [`worker.js`](worker.js).
6. Click **Deploy**.
7. Copy your worker URL (e.g., `https://dhbvn-cors-proxy.<your-subdomain>.workers.dev`).

### Option B: Via Wrangler CLI
From this folder:
```bash
npx wrangler login
npx wrangler deploy
```

---

## Connecting your Worker to the Web App
In `app.js`, change the default proxy URL at the top of the file:
```javascript
const DHBVN_PROXY_URL = window.DHBVN_CUSTOM_PROXY || 'https://dhbvn-cors-proxy.<your-subdomain>.workers.dev';
```
Or set it at runtime before `app.js` runs:
```html
<script>
  window.DHBVN_CUSTOM_PROXY = 'https://dhbvn-cors-proxy.<your-subdomain>.workers.dev';
</script>
```
