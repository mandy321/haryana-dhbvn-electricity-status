const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Starting DHBVN Outages Scraper...');
  const start = Date.now();
  
  // Launch playwright
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Handle browser console logs and errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Error] ${msg.text()}`);
    }
  });

  try {
    console.log('Navigating to portal...');
    await page.goto('https://chs.dhbvn.org.in/ui/anonymous?PROJECTID=304&FORMID=11996', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('Waiting for select dropdown to load...');
    try {
      await page.waitForSelector('select', { timeout: 15000 });
    } catch (e) {
      console.log('Timeout waiting for select visibility (continuing anyway since it may be hidden by select2)...');
    }

    // Retrieve all districts from the dropdown
    const selectInfo = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      const distSelect = selects.find(s => Array.from(s.options).some(o => o.text.includes('Palwal')));
      if (!distSelect) return null;
      return {
        id: distSelect.id,
        districts: Array.from(distSelect.options)
          .filter(o => o.value !== "") // skip --Select--
          .map(o => ({ value: o.value, text: o.text.trim() }))
      };
    });

    if (!selectInfo) {
      throw new Error('Could not find the District select dropdown in the DOM.');
    }

    console.log(`Found ${selectInfo.districts.length} districts to scrape.`);

    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    const outagesData = {
      last_updated: new Date().toISOString(),
      districts: {}
    };

    // Scrape each district
    for (let i = 0; i < selectInfo.districts.length; i++) {
      const dist = selectInfo.districts[i];
      console.log(`[${i + 1}/${selectInfo.districts.length}] Scraping ${dist.text} (value: ${dist.value})...`);

      try {
        // Select the option in dropdown
        await page.selectOption(`#${selectInfo.id}`, dist.value);

        // Trigger change event
        await page.evaluate((id) => {
          const el = document.getElementById(id);
          const event = new Event('change', { bubbles: true });
          el.dispatchEvent(event);
        }, selectInfo.id);

        // Wait for cascade loaders/UI update
        await page.waitForTimeout(2000);

        // Click the Search button
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, input[type="button"], a.btn'));
          const searchBtn = buttons.find(b => b.innerText.includes('Search') || (b.value && b.value.includes('Search')));
          if (searchBtn) {
            searchBtn.click();
          } else {
            throw new Error('Search button not found in page context.');
          }
        });

        // Wait for results grid to render
        await page.waitForTimeout(4000);

        // Extract the table rows
        const rows = await page.evaluate(() => {
          const table = document.querySelector('.ui-jqgrid-btable');
          if (!table) return [];
          const trs = Array.from(table.querySelectorAll('tr'));
          return trs.map(tr => {
            const tds = Array.from(tr.querySelectorAll('td'));
            return tds.map(td => td.innerText.trim());
          }).filter(row => row.length > 6 && row[1] !== ""); // filter out headers and empty rows
        });

        // Map rows to clean objects
        const currentActive = rows.map(r => ({
          feeder: r[1] || '',
          area: r[2] || '',
          start_time: r[3] || '',
          expected_restoration_time: r[4] || '',
          remarks: r[6] || ''
        }));

        outagesData.districts[dist.text] = currentActive;

        // Process Outage History (Archive)
        const historyDir = path.join(dataDir, 'history');
        if (!fs.existsSync(historyDir)) {
          fs.mkdirSync(historyDir, { recursive: true });
        }
        
        const historyPath = path.join(historyDir, `${dist.text}.json`);
        let districtHistory = [];
        if (fs.existsSync(historyPath)) {
          try {
            districtHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
          } catch (e) {
            console.log(`Failed to parse history for ${dist.text}, resetting.`);
          }
        }

        // Current IST Timestamp
        const nowISTStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        const nowIST = new Date(nowISTStr);
        const nowISTTimestamp = nowIST.getTime();

        // Merge active outages into history
        currentActive.forEach(activeItem => {
          // Find existing item in history with same feeder, area, and start_time
          const existingIndex = districtHistory.findIndex(histItem => 
            histItem.feeder === activeItem.feeder &&
            histItem.area === activeItem.area &&
            histItem.start_time === activeItem.start_time
          );

          if (existingIndex > -1) {
            // Update expectation and remarks, keep original scraped_at
            districtHistory[existingIndex].expected_restoration_time = activeItem.expected_restoration_time;
            districtHistory[existingIndex].remarks = activeItem.remarks;
            districtHistory[existingIndex].last_seen_at = nowISTStr + ' (IST)';
          } else {
            // Add new history record
            districtHistory.push({
              ...activeItem,
              scraped_at: nowISTStr + ' (IST)',
              last_seen_at: nowISTStr + ' (IST)',
              timestamp: nowISTTimestamp // useful for pruning
            });
          }
        });

        // Prune records older than 14 days (14 * 24 * 60 * 60 * 1000 ms)
        const fourteenDaysAgo = nowISTTimestamp - (14 * 24 * 60 * 60 * 1000);
        districtHistory = districtHistory.filter(histItem => {
          // Fallback if timestamp doesn't exist
          const itemTime = histItem.timestamp || nowISTTimestamp;
          return itemTime >= fourteenDaysAgo;
        });

        // Write updated history to file
        fs.writeFileSync(historyPath, JSON.stringify(districtHistory, null, 2));
        console.log(`-> Found ${currentActive.length} active records. Total archived: ${districtHistory.length}.`);
      } catch (err) {
        console.error(`Error scraping district ${dist.text}: ${err.message}`);
        // Keep an empty array for this district so the build does not break
        outagesData.districts[dist.text] = [];
      }
    }

    // Write to outages.json
    const outputPath = path.join(dataDir, 'outages.json');
    fs.writeFileSync(outputPath, JSON.stringify(outagesData, null, 2));

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\nSuccessfully scraped all districts in ${duration}s!`);
    console.log(`Saved output to: ${outputPath}`);

  } catch (error) {
    console.error('Fatal scraping error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
