# Haryana DHBVN Electricity Status

A premium, interactive web application to track live power outages, scheduled maintenance, and estimated restoration times for all 12 districts under the **Dakshin Haryana Bijli Vitran Nigam (DHBVN)**. 

🔗 **Live Website**: [https://mandy321.github.io/haryana-dhbvn-electricity-status/](https://mandy321.github.io/haryana-dhbvn-electricity-status/)

---

## Key Features

1. **Auto-Location Detection (GPS)**: Detects your current coordinates, reverse-lookup matches your district (e.g. Gurugram, Palwal, Jind), and highlights active power cuts in your exact suburb or village name.
2. **On-Demand Live Refresh**: Instantly updates outages for your selected district directly from the DHBVN servers via a CORS proxy.
3. **Area Pinning**: Pin your specific feeder or locality to keep its status pinned at the very top of your dashboard. Toggles a green "Healthy & Active" indicator if there are no cuts.
4. **Automated Scheduled Scraping**: Runs a headless browser crawler via GitHub Actions every 20 minutes to fetch and mirror DHBVN status.
5. **Premium Responsive UI**: Elegant dark space design with glassmorphism, responsive data grids, stats counters, and smooth layout transformations.

---

## Repository Structure

```
├── .github/workflows/
│   └── scrape.yml          # GitHub Actions scheduled workflow
├── data/
│   └── outages.json        # Compiled outages database (scraped every 20 mins)
├── scraper.js              # Playwright Node.js crawler script
├── index.html              # Frontend layout structure
├── style.css               # Premium dark-theme stylesheet
├── app.js                  # Frontend geolocation, parsing, and pinning logic
├── package.json            # Dependencies and npm scripts
└── PROJECT_DETAILS.md      # In-depth technical architecture and details
```

---

## Local Setup & Run

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/mandy321/haryana-dhbvn-electricity-status.git
   cd haryana-dhbvn-electricity-status
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Install browser binaries for Playwright:
   ```bash
   npm run install-browsers
   ```

### Execution
- **Run local scraper**:
  ```bash
  npm run scrape
  ```
  This crawls the DHBVN portal and outputs the fresh data to `data/outages.json`.
- **Run local web server**:
  You can host the directory using any static file server, for example:
  ```bash
  npx http-server .
  ```
  Then open `http://localhost:8080` in your web browser.

---

## Detailed Tech Walkthrough
For a deep dive into the crawler logic, reverse-geocoding area matching, and cryptographic static API headers, read [PROJECT_DETAILS.md](./PROJECT_DETAILS.md).
