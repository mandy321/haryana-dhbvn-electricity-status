# Technical Documentation: Project Details & Architecture

This document provides a detailed breakdown of the technical design, data flows, and algorithms powering the **Palwal(Haryana) Power Outage Tracker — Live DHBVN Updates** application.

---

## 1. Architectural Architecture (Jamstack Design)

Traditional client-side applications querying utility portals face two main obstacles:
- **CORS Locks**: Utility websites do not configure cross-origin resource sharing, blocking simple `fetch` queries from external static sites.
- **Dynamic Security Sessions**: The DHBVN Samadhan portal renders dynamic forms using the Appsavy framework, validating sessions via encrypted tokens on form load.

### Solution Layout
```
+-----------------------------------------------------------+
|                   DHBVN Samadhan Server                   |
+-----------------------------------------------------------+
       ^                                             ^
       | Scrapes every 20m                           | Live Refreshes (on click)
       |                                             | (via CORS Proxy)
+-----------------------+                    +-----------------------+
|  GitHub Action Runner |                    |   User Client Browser |
|  (Node.js Playwright) |                    |   (OSM Geolocation)   |
+-----------------------+                    +-----------------------+
       |                                             |
       | Commits data                                | Fetches updates
       v                                             v
+-----------------------------------------------------------+
|                    GitHub Pages Repository                |
|                    (Static data/outages.json)             |
+-----------------------------------------------------------+
```

---

## 2. Playwright Crawler Logic (`scraper.js`)

The crawler acts as a scheduled background daemon running on GitHub Actions. It automates a headless browser session to simulate human interactions:
1. **Initial Load**: Opens `https://chs.dhbvn.org.in/ui/anonymous?PROJECTID=304&FORMID=11996` (the anonymous outages form ID).
2. **Dropdown Enumeration**: Locates the Select2 dropdown for District. By running a JS evaluator, it extracts the list of all active options, including their numeric values (e.g., Jind = `1`, Faridabad = `10`, Palwal = `11`).
3. **Sequential Query Loop**: For each district:
   - Sets the dropdown selection value.
   - Dispatches a custom `change` event to trigger the page's reactive scripts.
   - Waits 2 seconds for internal cascade loaders to resolve.
   - Triggers the click event on the dynamically rendered "Search" button.
   - Waits 4 seconds for jqGrid tables (`.ui-jqgrid-btable`) to complete loading.
   - Evaluates the grid rows, mapping each row's cells to:
     - `Feeder`: Col index 1
     - `Area Name`: Col index 2
     - `Start Time`: Col index 3
     - `Expected Restoration`: Col index 4
     - `Remarks / Outage Details`: Col index 6
4. **Data Aggregation**: Compiles records for all 12 districts, records the runtime timestamp, and dumps it to `data/outages.json`.

---

## 3. Real-Time On-Demand Refresh (CORS Proxy)

Through analyzing the network traffic during crawler sessions, we discovered the underlying REST APIs do not require expiring session cookies, instead relying on static HTTP cryptographic headers:
```json
{
  "appsavylogin": "IG7gR27IJYSa+a/dym3wpw==",
  "formid": "TYDUFR2Pc592nssOkzMrLQ==",
  "roleid": "KnSKi2BRa296VND7xI1XWQ==",
  "token": "Wwzpa2LygAJqAK1uM94i8A==",
  "version": "1",
  "sourcetype": "tzoukK4N1FBlaVGohFL/oQ=="
}
```
When a user clicks "Refresh Live" on our web frontend:
1. **XML Generation**: We build the raw SOAP/XML query containing the selected district's numeric ID:
   ```xml
   <?xml version="1.0"?>
   <Request VERSION="2" LANGUAGE_ID="1" LOCATION="">
     <Company Company_Id="93" />
     <Project Project_Id="304" />
     <User User_Id="Anonymous" />
     <IUVLogin IUVLogin_Id="Anonymous" />
     <ROLE ROLE_ID="1595" />
     <Event Control_Id="130404" />
     <Child Control_Id="125681" Report="HTML" AC_ID="163944">
       <Parent Control_Id="130402" Value="[DISTRICT_ID]" Data_Form_Id="" XValue="[DISTRICT_ID]" YValue="" ZValue="" />
     </Child>
   </Request>
   ```
2. **Base64 Encoding**: We convert the XML string to a Base64 string in the browser using `btoa()`.
3. **CORS Proxy Routing**: We POST the JSON payload `{"inputxml": "...", "DocVersion": 1}` with the static cryptographic headers to:
   `https://corsproxy.io/?https://chs.dhbvn.org.in/api/AppsavyServices/GetRelationalDataA`
4. **Response Parsing**: The proxy returns the raw XML response, which we parse inside JavaScript using `DOMParser`. We map the `<Rowset>` elements, overwrite our local list, and re-render the view, giving users immediate status checks.

---

## 4. Location Mapping & GPS Geocoding

When a user clicks the **"Use My Location"** button:
1. **Coordinates Fetch**: The browser queries GPS via `navigator.geolocation.getCurrentPosition()`.
2. **Reverse Lookup**: The app calls the OpenStreetMap Nominatim reverse lookup endpoint:
   `https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}`
3. **District Selection**: The geocoder returns administrative address components (e.g. `county`, `state_district`, or `city`). We clean these names and search our `DISTRICT_MAP` dictionary (e.g. mapping `"gurgaon"` or `"gurugram"` to `"Gurugram"`, or `"palwal"` to `"Palwal"`). The matching district is auto-selected in the UI.
4. **Locality Matching**: We take Nominatim's local attributes (like `suburb`, `neighbourhood`, or `village`) and cross-reference them with the `Area Name` column of all outages in the selected district. If an outage's area contains a match, it is immediately highlighted in a warning banner at the top of the screen.

---

## 5. Offline Storage & Area Pinning

- **Mechanism**: We use `window.localStorage` to store a single JSON string under the key `pinned_dhbvn_outage`.
- **Stored Data**: `{ "districtId": "11", "districtName": "Palwal", "feeder": "CITY-V HODAL (U)", "area": "Pandwal" }`
- **Application Startup**:
  - The script checks if `localStorage` has a pinned area.
  - If yes, it creates a visual "Pinned Area Dashboard" card at the top.
  - It searches the outages dataset (either local cached JSON or live refresh) for a matching `Feeder` and `Area`.
  - If a cut is present, it displays active details in a rose-pink card. If no matching outage exists, it displays an emerald green card: **"Active & Healthy - No Outages Recorded"**.

---

## 6. Outage Severity Classifications

Outages are categorized dynamically on the client side into three severity buckets:
* **Major**: Outages with an expected duration of 4+ hours, or containing keywords indicating line breakdown or structural grid damage (`breakdown`, `burst`, `damage`, `heavy`, `snapping`).
* **Moderate**: Outages lasting between 2 and 4 hours, typical of routine maintenance or feeder reconfigurations.
* **Minor**: Outages lasting under 2 hours, representing momentary feeder trips or fuse repairs.

---

## 7. 14-Day Outage Trend Chart & Client Aggregations

To display historical trend data, the frontend integrates Chart.js:
1. **Dynamic IST Date Generation**: The chart dynamically computes the past 14 calendar dates in IST (`Asia/Kolkata`) format (`DD/MM`).
2. **Aggregated Daily Counting**: It traverses the JSON history, parses the `start_time` (or `scraped_at` fallback) in the local Indian timezone, and matches the date labels to populate a daily histogram.
3. **Responsive Visual Thresholds**: Chart columns are colored dynamically:
   * **Rose/Red (`#f43f5e`)**: Days with > 5 new outages.
   * **Amber/Orange (`#f59e0b`)**: Days with <= 5 new outages.
4. **Memory Cleanups**: Previous chart configurations are garbage-collected and destroyed using `chartInstance.destroy()` prior to rendering a new canvas context, avoiding hover-state duplication or performance slowdowns.

---

## 8. Resolved Outage Filters

To prevent outdated outages (from the last 24 hours) from displaying as active, the application compares the `expected_restoration_time` of each record against the current local time in IST. Outages with expected restoration dates in the past are automatically filtered out from active views (Metrics, Live Board, and Pinned locales) and moved strictly to the **History Archive**, guaranteeing real-time layout accuracy.
