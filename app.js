// State variables
let outagesData = null;
let currentDistrictId = "";
let currentDistrictName = "";
let pinnedArea = null;
let sharedArea = null;
let currentSeverityFilter = "all";
let currentViewTab = "live";
let districtHistoryData = null;

let userLocalityData = {
  district: "",
  suburb: "",
  neighbourhood: "",
  village: "",
  town: ""
};

// District name mapping
const DISTRICT_ID_TO_NAME = {
  "1": "Jind",
  "2": "Fatehabad",
  "3": "Sirsa",
  "4": "Hisar",
  "5": "Bhiwani",
  "6": "Mahendrgarh",
  "7": "Rewari",
  "8": "Gurugram",
  "9": "Nuh",
  "10": "Faridabad",
  "11": "Palwal",
  "12": "Charkhi Dadri"
};

const DISTRICT_NAME_TO_ID = {
  "Jind": "1",
  "Fatehabad": "2",
  "Sirsa": "3",
  "Hisar": "4",
  "Bhiwani": "5",
  "Mahendrgarh": "6",
  "Rewari": "7",
  "Gurugram": "8",
  "Nuh": "9",
  "Faridabad": "10",
  "Palwal": "11",
  "Charkhi Dadri": "12"
};

// Map GPS geocoded county/district names
const GEOMAP_TO_ID = {
  "gurgaon": "8",
  "gurugram": "8",
  "mahendragarh": "6",
  "nuh": "9",
  "mewat": "9",
  "palwal": "11",
  "faridabad": "10",
  "jind": "1",
  "fatehabad": "2",
  "sirsa": "3",
  "hisar": "4",
  "bhiwani": "5",
  "rewari": "7",
  "charkhi dadri": "12",
  "dadri": "12"
};

// DOM Elements
const districtSelect = document.getElementById('districtSelect');
const locateBtn = document.getElementById('locateBtn');
const locateBtnText = document.getElementById('locateBtnText');
const geoFeedback = document.getElementById('geoFeedback');
const geoFeedbackText = document.getElementById('geoFeedbackText');
const statsPanel = document.getElementById('statsPanel');
const statTotalOutages = document.getElementById('statTotalOutages');
const statActive = document.getElementById('statActive');
const statPlanned = document.getElementById('statPlanned');
const localitySection = document.getElementById('localitySection');
const localityTitle = document.getElementById('localityTitle');
const localityCardContainer = document.getElementById('localityCardContainer');
const outagesSection = document.getElementById('outagesSection');
const currentDistrictNameSpan = document.getElementById('currentDistrictName');
const searchInput = document.getElementById('searchInput');
const outagesTable = document.getElementById('outagesTable');
const outagesTableBody = document.getElementById('outagesTableBody');
const mobileCardsContainer = document.getElementById('mobileCardsContainer');
const emptyState = document.getElementById('emptyState');
const pageLoader = document.getElementById('pageLoader');
const lastUpdatedTime = document.getElementById('lastUpdatedTime');

// Pinned Dashboard Elements
const pinnedSection = document.getElementById('pinnedSection');
const pinnedCard = document.getElementById('pinnedCard');

// Shared Dashboard Elements
const sharedSection = document.getElementById('sharedSection');
const sharedCard = document.getElementById('sharedCard');

// Refresh Button Elements
const refreshBtn = document.getElementById('refreshBtn');
const refreshIcon = document.getElementById('refreshIcon');
const refreshBtnText = document.getElementById('refreshBtnText');

// District Status & Severity Elements
const districtStatusHeader = document.getElementById('districtStatusHeader');
const districtStatusBadge = document.getElementById('districtStatusBadge');
const statusFeedersDown = document.getElementById('statusFeedersDown');
const statusAreasAffected = document.getElementById('statusAreasAffected');

// View Tabs Elements
const tabNavigationSection = document.getElementById('tabNavigationSection');
const tabLive = document.getElementById('tabLive');
const tabHistory = document.getElementById('tabHistory');

// History Section Elements
const historySection = document.getElementById('historySection');
const historyDistrictName = document.getElementById('historyDistrictName');
const historySearchInput = document.getElementById('historySearchInput');
const historyTable = document.getElementById('historyTable');
const historyTableBody = document.getElementById('historyTableBody');
const historyEmptyState = document.getElementById('historyEmptyState');
const exportCsvBtn = document.getElementById('exportCsvBtn');

// Initialize App
window.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  showLoader(true);
  try {
    // Load pinned area from LocalStorage
    loadPinnedArea();
    
    // Check for query parameters for shared areas
    parseSharedUrl();
    
    // Fetch data/outages.json (the pre-cached Action database)
    const response = await fetch('data/outages.json');
    if (!response.ok) {
      throw new Error('Outages data file not found.');
    }
    outagesData = await response.json();
    
    // Set last updated time
    if (outagesData.last_updated) {
      lastUpdatedTime.textContent = getLastUpdatedText();
    }
    
    showLoader(false);
    
    // Setup event listeners
    districtSelect.addEventListener('change', handleDistrictChange);
    searchInput.addEventListener('input', handleSearch);
    locateBtn.addEventListener('click', handleGeolocation);
    refreshBtn.addEventListener('click', handleLiveRefresh);
    
    // Setup history/tab listeners
    tabLive.addEventListener('click', () => switchTab('live'));
    tabHistory.addEventListener('click', () => switchTab('history'));
    historySearchInput.addEventListener('input', handleHistorySearch);
    exportCsvBtn.addEventListener('click', handleExportCsv);
    
    // Setup severity chips listeners
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        const targetChip = e.currentTarget;
        targetChip.classList.add('active');
        currentSeverityFilter = targetChip.getAttribute('data-severity');
        renderOutages();
      });
    });
    
    // Handle initial selections: Shared area takes precedence over Pinned area
    if (sharedArea) {
      renderSharedArea();
      selectDistrict(sharedArea.districtId);
    } else if (pinnedArea) {
      renderPinnedArea();
      selectDistrict(pinnedArea.districtId);
    }
    
  } catch (error) {
    console.error('Initialization error:', error);
    showLoader(false);
    alert('Failed to load outages database. Please try refreshing or check back later.');
  }
}

// Show/Hide page loader spinner
function showLoader(show) {
  if (show) {
    pageLoader.classList.remove('hidden');
    outagesSection.classList.add('hidden');
    statsPanel.classList.add('hidden');
    localitySection.classList.add('hidden');
    pinnedSection.classList.add('hidden');
    sharedSection.classList.add('hidden');
  } else {
    pageLoader.classList.add('hidden');
  }
}

// Check URL query parameters for shared areas
function parseSharedUrl() {
  const params = new URLSearchParams(window.location.search);
  const distId = params.get('districtId');
  const feeder = params.get('feeder');
  const area = params.get('area');
  
  if (distId && feeder && area && DISTRICT_ID_TO_NAME[distId]) {
    sharedArea = {
      districtId: distId,
      districtName: DISTRICT_ID_TO_NAME[distId],
      feeder: decodeURIComponent(feeder),
      area: decodeURIComponent(area)
    };
  } else {
    sharedArea = null;
  }
}

// Share Area Action Handler
window.shareArea = function(districtId, districtName, feeder, area) {
  const shareUrl = `${window.location.origin}${window.location.pathname}?districtId=${districtId}&feeder=${encodeURIComponent(feeder)}&area=${encodeURIComponent(area)}`;
  
  const textMsg = `Check live electricity outage status for ${area} (${feeder}) under ${districtName} district:`;
  
  if (navigator.share) {
    navigator.share({
      title: 'DHBVN Electricity Outage Status',
      text: textMsg,
      url: shareUrl
    }).catch(err => {
      console.log('Share cancelled or failed:', err);
    });
  } else {
    // Clipboard copy fallback
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("Live status link copied to clipboard! Share it on WhatsApp or social media.");
    }).catch(err => {
      console.error('Failed to copy link:', err);
    });
  }
};

// Render Shared Area Card
function renderSharedArea() {
  if (!sharedArea || !outagesData) {
    sharedSection.classList.add('hidden');
    return;
  }
  
  sharedSection.classList.remove('hidden');
  
  const list = outagesData.districts[sharedArea.districtName] || [];
  const nowISTStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const nowIST = new Date(nowISTStr);
  const nowTime = nowIST.getTime();

  const activeCut = list.find(item => {
    if (item.feeder !== sharedArea.feeder || item.area !== sharedArea.area) return false;
    const end = parseDHBVNDate(item.expected_restoration_time);
    if (end && end.getTime() < nowTime) {
      return false; // resolved/past
    }
    return true;
  });
  
  sharedCard.className = "shared-card glass-card";
  
  if (activeCut) {
    sharedCard.classList.add('active-outage');
    const remarks = activeCut.remarks || 'Active Cut';
    const isPlanned = remarks.toUpperCase().includes('PLANNED') || remarks.toUpperCase().includes('MTC');
    const badgeClass = isPlanned ? 'badge-warning' : 'badge-danger';
    const badgeText = isPlanned ? 'Planned Maintenance' : 'Unplanned Cut';
    const badgeIcon = isPlanned ? 'fa-screwdriver-wrench' : 'fa-triangle-exclamation';

    sharedCard.innerHTML = `
      <div class="shared-card-header">
        <h3><i class="fa-solid fa-share-nodes" style="color: var(--primary-color);"></i> Shared Locality Status</h3>
        <div style="display: flex; gap: 12px; align-items: center;">
          <button class="btn-refresh shared-refresh-btn" style="background:none; border:none; color:var(--text-dim); cursor:pointer; display:flex; align-items:center; gap:4px;" onclick="handleLiveRefresh('${sharedArea.districtId}')" title="Refresh live status"><i class="fa-solid fa-rotate"></i> Refresh</button>
          <button class="btn-refresh" style="background:none; border:none; color:var(--text-dim); cursor:pointer;" onclick="dismissSharedArea()"><i class="fa-solid fa-xmark"></i> Dismiss</button>
        </div>
      </div>
      <div class="shared-card-body">
        <div class="shared-item" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-house-laptop"></i>
          <span><strong>Outage Detected:</strong> <span style="font-weight:700; color:#fff;">${sharedArea.area} (${sharedArea.feeder})</span></span>
        </div>
        <div class="shared-item">
          <i class="fa-solid fa-clock"></i>
          <span><strong>Cut Started:</strong> ${formatTimeTo12Hr(activeCut.start_time) || 'N/A'}</span>
        </div>
        <div class="shared-item">
          <i class="fa-solid fa-circle-chevron-right"></i>
          <span><strong>Est. Restoration:</strong> <span style="color:#67e8f9; font-weight:600;">${formatTimeTo12Hr(activeCut.expected_restoration_time) || 'Pending Estimate'}</span></span>
        </div>
        <div class="shared-item">
          <div class="status-badge ${badgeClass}">
            <i class="fa-solid ${badgeIcon}"></i> ${badgeText}
          </div>
        </div>
        <div class="shared-item" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-circle-info"></i>
          <span><strong>Remarks:</strong> <span style="font-style:italic;">${remarks}</span></span>
        </div>
        <div class="shared-item" style="grid-column: 1 / -1; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px; margin-top: 4px; font-size: 12px; color: var(--text-muted);">
          <i class="fa-solid fa-clock-rotate-left"></i> Last Checked: ${getLastUpdatedText()}
        </div>
      </div>
    `;
  } else {
    // Shared area is healthy
    sharedCard.innerHTML = `
      <div class="shared-card-header">
        <h3><i class="fa-solid fa-share-nodes" style="color: var(--primary-color);"></i> Shared Locality Status</h3>
        <div style="display: flex; gap: 12px; align-items: center;">
          <button class="btn-refresh shared-refresh-btn" style="background:none; border:none; color:var(--text-dim); cursor:pointer; display:flex; align-items:center; gap:4px;" onclick="handleLiveRefresh('${sharedArea.districtId}')" title="Refresh live status"><i class="fa-solid fa-rotate"></i> Refresh</button>
          <button class="btn-refresh" style="background:none; border:none; color:var(--text-dim); cursor:pointer;" onclick="dismissSharedArea()"><i class="fa-solid fa-xmark"></i> Dismiss</button>
        </div>
      </div>
      <div class="shared-card-body">
        <div class="shared-item" style="grid-column: 1 / -1; display:flex; flex-direction:column; gap: 8px;">
          <div style="display:flex; align-items:center; gap: 14px;">
            <div class="status-badge badge-glow-green" style="font-size: 14px; padding: 6px 12px;">
              <i class="fa-solid fa-circle-check"></i> No Active Outage
            </div>
            <span style="font-size: 14px; color: var(--text-dim);">No outages are currently reported for <strong>${sharedArea.area} (${sharedArea.feeder})</strong> on the DHBVN portal.</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px; margin-top: 4px;">
            <i class="fa-solid fa-clock-rotate-left"></i> Last Checked: ${getLastUpdatedText()}
          </div>
        </div>
      </div>
    `;
  }
}

// Dismiss Shared View & clear url parameters
window.dismissSharedArea = function() {
  sharedArea = null;
  sharedSection.classList.add('hidden');
  
  // Remove URL query parameters without reloading
  window.history.replaceState({}, document.title, window.location.pathname);
};

// Load Pinned Locality from localStorage
function loadPinnedArea() {
  const raw = localStorage.getItem('pinned_dhbvn_outage');
  if (raw) {
    try {
      pinnedArea = JSON.parse(raw);
    } catch (e) {
      pinnedArea = null;
    }
  } else {
    pinnedArea = null;
  }
}

// Save/Unpin area helper
function savePinnedArea(districtId, districtName, feeder, area) {
  pinnedArea = { districtId, districtName, feeder, area };
  localStorage.setItem('pinned_dhbvn_outage', JSON.stringify(pinnedArea));
  renderPinnedArea();
  renderOutages();
}

window.unpinArea = function() {
  localStorage.removeItem('pinned_dhbvn_outage');
  pinnedArea = null;
  pinnedSection.classList.add('hidden');
  renderOutages();
};

// Render Pinned Dashboard Card
function renderPinnedArea() {
  if (!pinnedArea || !outagesData) {
    pinnedSection.classList.add('hidden');
    return;
  }
  
  pinnedSection.classList.remove('hidden');
  
  // Search the district's outages list for this pinned area status
  const list = outagesData.districts[pinnedArea.districtName] || [];
  const nowISTStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const nowIST = new Date(nowISTStr);
  const nowTime = nowIST.getTime();

  const activeCut = list.find(item => {
    if (item.feeder !== pinnedArea.feeder || item.area !== pinnedArea.area) return false;
    const end = parseDHBVNDate(item.expected_restoration_time);
    if (end && end.getTime() < nowTime) {
      return false; // resolved/past
    }
    return true;
  });
  
  pinnedCard.className = "pinned-card glass-card";
  
  if (activeCut) {
    pinnedCard.classList.add('active-outage');
    const remarks = activeCut.remarks || 'Active Cut';
    const isPlanned = remarks.toUpperCase().includes('PLANNED') || remarks.toUpperCase().includes('MTC');
    const badgeClass = isPlanned ? 'badge-warning' : 'badge-danger';
    const badgeText = isPlanned ? 'Planned Maintenance' : 'Unplanned Cut';
    const badgeIcon = isPlanned ? 'fa-screwdriver-wrench' : 'fa-triangle-exclamation';

    pinnedCard.innerHTML = `
      <div class="pinned-card-header">
        <h3><i class="fa-solid fa-star" style="color: var(--warning-color);"></i> Pinned Locality</h3>
        <div style="display: flex; gap: 12px; align-items: center;">
          <button class="btn-refresh pinned-refresh-btn" style="background:none; border:none; color:var(--text-dim); cursor:pointer; display:flex; align-items:center; gap:4px;" onclick="handleLiveRefresh('${pinnedArea.districtId}')" title="Refresh live status"><i class="fa-solid fa-rotate"></i> Refresh</button>
          <button class="btn-refresh" style="background:none; border:none; color:var(--text-dim); cursor:pointer; display:flex; align-items:center; gap:4px;" onclick="shareArea('${pinnedArea.districtId}', '${pinnedArea.districtName}', '${pinnedArea.feeder}', '${pinnedArea.area}')" title="Share live status link"><i class="fa-solid fa-share-nodes"></i> Share</button>
          <button class="btn-refresh" style="background:none; border:none; color:var(--text-dim); cursor:pointer; display:flex; align-items:center; gap:4px;" onclick="unpinArea()"><i class="fa-solid fa-trash-can"></i> Unpin</button>
        </div>
      </div>
      <div class="pinned-card-body">
        <div class="pinned-item" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-house-laptop"></i>
          <span><strong>Outage Detected:</strong> <span style="font-weight:700; color:#fff;">${pinnedArea.area} (${pinnedArea.feeder})</span></span>
        </div>
        <div class="pinned-item">
          <i class="fa-solid fa-clock"></i>
          <span><strong>Cut Started:</strong> ${formatTimeTo12Hr(activeCut.start_time) || 'N/A'}</span>
        </div>
        <div class="pinned-item">
          <i class="fa-solid fa-circle-chevron-right"></i>
          <span><strong>Est. Restoration:</strong> <span style="color:#67e8f9; font-weight:600;">${formatTimeTo12Hr(activeCut.expected_restoration_time) || 'Pending Estimate'}</span></span>
        </div>
        <div class="pinned-item">
          <div class="status-badge ${badgeClass}">
            <i class="fa-solid ${badgeIcon}"></i> ${badgeText}
          </div>
        </div>
        <div class="pinned-item" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-circle-info"></i>
          <span><strong>Remarks:</strong> <span style="font-style:italic;">${remarks}</span></span>
        </div>
        <div class="pinned-item" style="grid-column: 1 / -1; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px; margin-top: 4px; font-size: 12px; color: var(--text-muted);">
          <i class="fa-solid fa-clock-rotate-left"></i> Last Checked: ${getLastUpdatedText()}
        </div>
      </div>
    `;
  } else {
    pinnedCard.innerHTML = `
      <div class="pinned-card-header">
        <h3><i class="fa-solid fa-star" style="color: var(--warning-color);"></i> Pinned Locality</h3>
        <div style="display: flex; gap: 12px; align-items: center;">
          <button class="btn-refresh pinned-refresh-btn" style="background:none; border:none; color:var(--text-dim); cursor:pointer; display:flex; align-items:center; gap:4px;" onclick="handleLiveRefresh('${pinnedArea.districtId}')" title="Refresh live status"><i class="fa-solid fa-rotate"></i> Refresh</button>
          <button class="btn-refresh" style="background:none; border:none; color:var(--text-dim); cursor:pointer; display:flex; align-items:center; gap:4px;" onclick="shareArea('${pinnedArea.districtId}', '${pinnedArea.districtName}', '${pinnedArea.feeder}', '${pinnedArea.area}')" title="Share live status link"><i class="fa-solid fa-share-nodes"></i> Share</button>
          <button class="btn-refresh" style="background:none; border:none; color:var(--text-dim); cursor:pointer; display:flex; align-items:center; gap:4px;" onclick="unpinArea()"><i class="fa-solid fa-trash-can"></i> Unpin</button>
        </div>
      </div>
      <div class="pinned-card-body">
        <div class="pinned-item" style="grid-column: 1 / -1; display:flex; flex-direction:column; gap: 8px;">
          <div style="display:flex; align-items:center; gap: 14px;">
            <div class="status-badge badge-glow-green" style="font-size: 14px; padding: 6px 12px;">
              <i class="fa-solid fa-circle-check"></i> No Active Outage
            </div>
            <span style="font-size: 14px; color: var(--text-dim);">No outages are currently reported for <strong>${pinnedArea.area} (${pinnedArea.feeder})</strong> on the DHBVN portal.</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px; margin-top: 4px;">
            <i class="fa-solid fa-clock-rotate-left"></i> Last Checked: ${getLastUpdatedText()}
          </div>
        </div>
      </div>
    `;
  }
}

// Handle Manual Selection
function handleDistrictChange(e) {
  const districtId = e.target.value;
  if (!districtId) return;
  selectDistrict(districtId);
}

// Select a District and Update Views
function selectDistrict(districtId) {
  if (!districtId) return;
  
  currentDistrictId = districtId;
  currentDistrictName = DISTRICT_ID_TO_NAME[districtId];
  
  districtSelect.value = districtId;
  currentDistrictNameSpan.textContent = currentDistrictName;
  if (historyDistrictName) historyDistrictName.textContent = currentDistrictName;
  
  // Clear search and enable buttons
  searchInput.value = "";
  if (historySearchInput) historySearchInput.value = "";
  refreshBtn.disabled = false;
  
  // Make panels visible
  statsPanel.classList.remove('hidden');
  if (tabNavigationSection) tabNavigationSection.classList.remove('hidden');
  
  updateStats();
  checkLocalityOutages();
  renderPinnedArea();
  renderSharedArea();
  
  // Sync tab status and render
  switchTab(currentViewTab);
}

// Compute Stats Counter Values
function updateStats() {
  const list = outagesData.districts[currentDistrictName] || [];
  
  const nowISTStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const nowIST = new Date(nowISTStr);
  const nowTime = nowIST.getTime();
  
  // Filter active list (exclude resolved in the past)
  const activeList = list.filter(item => {
    const end = parseDHBVNDate(item.expected_restoration_time);
    if (end && end.getTime() < nowTime) {
      return false; // resolved
    }
    return true;
  });
  
  const total = activeList.length;
  let planned = 0;
  let active = 0;
  const uniqueFeeders = new Set();
  
  activeList.forEach(item => {
    const remarks = (item.remarks || '').toUpperCase();
    if (remarks.includes('PLANNED') || remarks.includes('MTC') || remarks.includes('MAINTENANCE')) {
      planned++;
    } else {
      active++;
    }
    if (item.feeder) {
      uniqueFeeders.add(item.feeder.trim().toUpperCase());
    }
  });
  
  statTotalOutages.textContent = total;
  statActive.textContent = active;
  statPlanned.textContent = planned;
  
  // Update Status Banner
  if (districtStatusHeader) {
    districtStatusHeader.classList.remove('hidden');
    statusFeedersDown.textContent = uniqueFeeders.size;
    statusAreasAffected.textContent = total;
    
    if (total > 0) {
      districtStatusBadge.textContent = "ACTIVE";
      districtStatusBadge.className = "status-badge active-outage";
    } else {
      districtStatusBadge.textContent = "ALL CLEAR";
      districtStatusBadge.className = "status-badge all-clear";
    }
  }
}

// Render Outages List & Setup Pins
function renderOutages() {
  const districtList = outagesData.districts[currentDistrictName] || [];
  const searchTerm = searchInput.value.toLowerCase().trim();
  
  // Filter by text search, active status, and severity
  const nowISTStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const nowIST = new Date(nowISTStr);
  const nowTime = nowIST.getTime();

  const filteredList = districtList.filter(item => {
    const feeder = (item.feeder || '').toLowerCase();
    const area = (item.area || '').toLowerCase();
    const matchesSearch = feeder.includes(searchTerm) || area.includes(searchTerm);
    
    if (!matchesSearch) return false;
    
    // Check if resolved
    const end = parseDHBVNDate(item.expected_restoration_time);
    if (end && end.getTime() < nowTime) {
      return false; // resolved/past
    }
    
    if (currentSeverityFilter === 'all') return true;
    return getSeverity(item) === currentSeverityFilter;
  });
  
  outagesTableBody.innerHTML = "";
  mobileCardsContainer.innerHTML = "";
  
  if (filteredList.length === 0) {
    outagesTable.parentElement.classList.add('hidden');
    mobileCardsContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }
  
  outagesTable.parentElement.classList.remove('hidden');
  mobileCardsContainer.classList.remove('hidden');
  emptyState.classList.add('hidden');
  
  filteredList.forEach(item => {
    const remarks = item.remarks || 'Active Cut';
    const isPlanned = remarks.toUpperCase().includes('PLANNED') || remarks.toUpperCase().includes('MTC') || remarks.toUpperCase().includes('MAINTENANCE');
    
    const badgeClass = isPlanned ? 'badge-warning' : 'badge-danger';
    const badgeText = isPlanned ? 'Planned' : 'Unplanned';
    const badgeIcon = isPlanned ? 'fa-screwdriver-wrench' : 'fa-triangle-exclamation';

    // Get severity
    const severity = getSeverity(item);
    const severityLabel = severity.toUpperCase();

    // Is this row currently pinned?
    const isPinned = pinnedArea && 
                     pinnedArea.districtName === currentDistrictName && 
                     pinnedArea.feeder === item.feeder && 
                     pinnedArea.area === item.area;
                     
    const pinClass = isPinned ? 'pinned' : '';
    const pinIcon = isPinned ? 'fa-solid' : 'fa-regular';

    // 1. Desktop Row Builder
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: center;">
        <button class="btn-pin ${pinClass}" onclick="togglePin('${item.feeder}', '${item.area}')" title="Star area to dashboard">
          <i class="${pinIcon} fa-star"></i>
        </button>
      </td>
      <td style="text-align: center;">
        <button class="btn-share" onclick="shareArea('${currentDistrictId}', '${currentDistrictName}', '${item.feeder}', '${item.area}')" title="Share live status link">
          <i class="fa-solid fa-share-nodes"></i>
        </button>
      </td>
      <td style="font-weight: 600; color: #fff;">${item.feeder}</td>
      <td>${item.area}</td>
      <td>${formatTimeTo12Hr(item.start_time) || 'N/A'}</td>
      <td style="font-weight: 500; color: ${item.expected_restoration_time ? '#67e8f9' : 'var(--text-dim)'};">
        ${formatTimeTo12Hr(item.expected_restoration_time) || 'Pending Estimate'}
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <div class="status-badge ${badgeClass}">
            <i class="fa-solid ${badgeIcon}"></i> ${badgeText}
          </div>
          <span class="sev-tag ${severity}">${severityLabel}</span>
        </div>
        <div style="font-size: 13px; color: var(--text-muted);">${remarks}</div>
      </td>
    `;
    outagesTableBody.appendChild(tr);

    // 2. Mobile Card Builder
    const card = document.createElement('div');
    card.className = 'mobile-outage-card';
    card.innerHTML = `
      <div class="mobile-card-row header">
        <div class="mobile-feeder">
          <button class="btn-pin ${pinClass}" onclick="togglePin('${item.feeder}', '${item.area}')" style="margin-right: 8px;">
            <i class="${pinIcon} fa-star"></i>
          </button>
          <button class="btn-share" onclick="shareArea('${currentDistrictId}', '${currentDistrictName}', '${item.feeder}', '${item.area}')" style="margin-right: 12px;">
            <i class="fa-solid fa-share-nodes"></i>
          </button>
          ${item.feeder}
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
          <div class="status-badge ${badgeClass}">
            <i class="fa-solid ${badgeIcon}"></i> ${badgeText}
          </div>
          <span class="sev-tag ${severity}" style="font-size: 9px; padding: 2px 4px;">${severityLabel}</span>
        </div>
      </div>
      <div class="mobile-card-row">
        <div class="label">Area Name</div>
        <div class="val" style="font-weight: 500; color: #fff;">${item.area}</div>
      </div>
      <div class="mobile-card-row">
        <div class="label">Cut Started</div>
        <div class="val">${formatTimeTo12Hr(item.start_time) || 'N/A'}</div>
      </div>
      <div class="mobile-card-row">
        <div class="label">Expected Back</div>
        <div class="val" style="font-weight: 600; color: #67e8f9;">${formatTimeTo12Hr(item.expected_restoration_time) || 'Pending Estimate'}</div>
      </div>
      <div class="mobile-card-row">
        <div class="label">Remarks</div>
        <div class="val" style="font-style: italic;">${remarks}</div>
      </div>
    `;
    mobileCardsContainer.appendChild(card);
  });
}

// Toggle Pin Click Event
window.togglePin = function(feeder, area) {
  const isPinned = pinnedArea && 
                   pinnedArea.districtName === currentDistrictName && 
                   pinnedArea.feeder === feeder && 
                   pinnedArea.area === area;
  
  if (isPinned) {
    unpinArea();
  } else {
    savePinnedArea(currentDistrictId, currentDistrictName, feeder, area);
  }
};

// Search Filter Input
function handleSearch() {
  if (!currentDistrictName) return;
  renderOutages();
}

// Handle Geolocation Coordinates
function handleGeolocation() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }
  
  localitySection.classList.add('hidden');
  geoFeedback.classList.remove('hidden');
  geoFeedbackText.textContent = "Requesting GPS coordinates...";
  locateBtn.disabled = true;
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      
      geoFeedbackText.textContent = "Geocoding your coordinates...";
      
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`, {
          headers: { 'Accept-Language': 'en' }
        });
        
        if (!response.ok) {
          throw new Error('Reverse geocoding lookup failure.');
        }
        
        const data = await response.json();
        const address = data.address || {};
        console.log('Address Details:', address);
        
        userLocalityData.suburb = address.suburb || "";
        userLocalityData.neighbourhood = address.neighbourhood || address.residential || "";
        userLocalityData.village = address.village || address.hamlet || "";
        userLocalityData.town = address.town || address.suburb || "";
        
        // Find mapped District ID
        let detectedDistrictId = "";
        const possibleDistKeys = [
          address.county,
          address.state_district,
          address.city,
          address.district
        ];
        
        for (const rawKey of possibleDistKeys) {
          if (!rawKey) continue;
          const cleanKey = rawKey.replace(/district/gi, "").trim().toLowerCase();
          if (GEOMAP_TO_ID[cleanKey]) {
            detectedDistrictId = GEOMAP_TO_ID[cleanKey];
            break;
          }
        }
        
        if (!detectedDistrictId) {
          throw new Error("Unable to map your locality to a DHBVN district.");
        }
        
        userLocalityData.district = DISTRICT_ID_TO_NAME[detectedDistrictId];
        const localDisplay = userLocalityData.suburb || userLocalityData.village || 'Local Area';
        geoFeedbackText.textContent = `Located: ${userLocalityData.district} (${localDisplay})`;
        
        setTimeout(() => {
          geoFeedback.classList.add('hidden');
          locateBtn.disabled = false;
          selectDistrict(detectedDistrictId);
        }, 1500);
        
      } catch (err) {
        console.error('Reverse lookup error:', err);
        geoFeedbackText.textContent = "Reverse geocoding failed.";
        setTimeout(() => {
          geoFeedback.classList.add('hidden');
          locateBtn.disabled = false;
          alert('GPS coordinates resolved, but could not geocode district. Please select manually.');
        }, 2000);
      }
    },
    (error) => {
      console.error('Geolocation Error:', error);
      let errorMsg = "Locality request timeout.";
      if (error.code === error.PERMISSION_DENIED) {
        errorMsg = "Location permission denied. Select district manually.";
      }
      geoFeedbackText.textContent = errorMsg;
      setTimeout(() => {
        geoFeedback.classList.add('hidden');
        locateBtn.disabled = false;
        alert(`Location permission error: ${errorMsg}`);
      }, 2500);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

// Find and Highlight Localized Cuts
function checkLocalityOutages() {
  if (!userLocalityData.district || userLocalityData.district !== currentDistrictName) {
    localitySection.classList.add('hidden');
    return;
  }
  
  const searchKeys = [
    userLocalityData.suburb,
    userLocalityData.neighbourhood,
    userLocalityData.village,
    userLocalityData.town
  ].filter(key => key.length > 2)
   .map(key => key.toLowerCase().trim());
   
  if (searchKeys.length === 0) {
    localitySection.classList.add('hidden');
    return;
  }
  
  const list = outagesData.districts[currentDistrictName] || [];
  const localOutages = list.filter(item => {
    const area = (item.area || '').toLowerCase();
    return searchKeys.some(key => area.includes(key) || key.includes(area));
  });
  
  if (localOutages.length === 0) {
    localitySection.classList.add('hidden');
    return;
  }
  
  localityCardContainer.innerHTML = "";
  localitySection.classList.remove('hidden');
  
  const userPlaceName = userLocalityData.suburb || userLocalityData.village || userLocalityData.neighbourhood || 'your area';
  localityTitle.innerHTML = `Active power cuts detected in <span style="color: var(--danger-color);">${userPlaceName}</span>`;
  
  localOutages.forEach(item => {
    const remarks = item.remarks || 'Active Cut';
    const card = document.createElement('div');
    card.className = 'local-outage-card';
    card.innerHTML = `
      <div class="local-card-header"><i class="fa-solid fa-bolt-lightning" style="color: var(--danger-color); margin-right: 6px;"></i> ${item.feeder}</div>
      <div class="local-card-detail">
        <i class="fa-solid fa-map-location-dot"></i>
        <span><strong>Area:</strong> ${item.area}</span>
      </div>
      <div class="local-card-detail">
        <i class="fa-solid fa-clock"></i>
        <span><strong>Cut Started:</strong> ${formatTimeTo12Hr(item.start_time) || 'N/A'}</span>
      </div>
      <div class="local-card-detail">
        <i class="fa-solid fa-circle-chevron-right"></i>
        <span><strong>Est. Restoration:</strong> <span style="color:#67e8f9; font-weight:600;">${formatTimeTo12Hr(item.expected_restoration_time) || 'Pending Estimate'}</span></span>
      </div>
      <div class="local-card-detail">
        <i class="fa-solid fa-circle-info"></i>
        <span><strong class="remarks-label">Status:</strong> ${remarks}</span>
      </div>
    `;
    localityCardContainer.appendChild(card);
  });
}

// Live On-Demand Refresh via CORS Proxy
window.handleLiveRefresh = async function(targetDistrictId) {
  const districtId = targetDistrictId || currentDistrictId;
  if (!districtId) return;
  
  const isTargetedRefresh = !!targetDistrictId;
  const districtName = DISTRICT_ID_TO_NAME[districtId];
  
  if (!isTargetedRefresh) {
    refreshBtn.disabled = true;
    refreshIcon.classList.add('spin-animation');
    refreshBtnText.textContent = "Refreshing...";
  }
  
  const pinnedRefreshIcons = document.querySelectorAll('.pinned-refresh-btn i, .shared-refresh-btn i');
  pinnedRefreshIcons.forEach(icon => icon.classList.add('fa-spin'));
  
  try {
    // 1. Build request XML string with selected district's numeric ID
    const xmlRequest = `<?xml version="1.0"?><Request VERSION="2" LANGUAGE_ID="1" LOCATION=""><Company Company_Id="93" /><Project Project_Id="304" /><User User_Id="Anonymous" /><IUVLogin IUVLogin_Id="Anonymous" /><ROLE ROLE_ID="1595" /><Event Control_Id="130404" /><Child Control_Id="125681" Report="HTML" AC_ID="163944"><Parent Control_Id="130402" Value="${districtId}" Data_Form_Id="" XValue="${districtId}" YValue="" ZValue="" /></Child></Request>`;
    
    // 2. Base64 encode XML payload
    const base64Payload = btoa(xmlRequest);
    
    // 3. POST request through corsproxy.io
    const url = 'https://corsproxy.io/?' + encodeURIComponent('https://chs.dhbvn.org.in/api/AppsavyServices/GetRelationalDataA');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'appsavylogin': 'IG7gR27IJYSa+a/dym3wpw==',
        'formid': 'TYDUFR2Pc592nssOkzMrLQ==',
        'roleid': 'KnSKi2BRa296VND7xI1XWQ==',
        'token': 'Wwzpa2LygAJqAK1uM94i8A==',
        'version': '1',
        'sourcetype': 'tzoukK4N1FBlaVGohFL/oQ=='
      },
      body: JSON.stringify({
        inputxml: base64Payload,
        DocVersion: 1
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const responseText = await response.text();
    
    // 4. Parse XML response
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(responseText, "text/xml");
    
    const rowsets = Array.from(xmlDoc.querySelectorAll('Rowset'));
    
    const list = rowsets.map(row => ({
      feeder: row.querySelector('FEEDER')?.textContent || '',
      area: row.querySelector('AREA')?.textContent || '',
      start_time: row.querySelector('START_TIME')?.textContent || '',
      expected_restoration_time: row.querySelector('EXPECTED_RESTORATION_TIME')?.textContent || '',
      remarks: row.querySelector('ADDRESS')?.textContent || ''
    }));
    
    // 5. Overwrite the in-memory array for this district
    outagesData.districts[districtName] = list;
    
    // 6. Update timestamp UI and in-memory date
    const now = new Date();
    outagesData.last_updated = now.toISOString();
    lastUpdatedTime.textContent = "Refreshed Live: " + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    
    // 7. Update UI view panels
    if (currentDistrictId === districtId) {
      updateStats();
      renderOutages();
      checkLocalityOutages();
    }
    renderPinnedArea();
    renderSharedArea();
    
  } catch (err) {
    console.error('On-demand refresh error:', err);
    alert('Failed to refresh data live from DHBVN. Please check your internet connection or try again later.');
  } finally {
    if (!isTargetedRefresh) {
      refreshBtn.disabled = false;
      refreshIcon.classList.remove('spin-animation');
      refreshBtnText.textContent = "Refresh Live";
    }
    pinnedRefreshIcons.forEach(icon => icon.classList.remove('fa-spin'));
  }
}

// Helper: Format raw DHBVN API time strings (e.g. "20-Jun-2026 18:03:54") to 12-hour AM/PM format
function formatTimeTo12Hr(timeStr) {
  if (!timeStr || timeStr.trim() === "" || timeStr.trim().toUpperCase() === "N/A" || timeStr.trim().toUpperCase() === "PENDING ESTIMATE") {
    return timeStr;
  }
  
  // Example pattern: "20-Jun-2026 18:03:54" or "20-Jun-2026 18:03"
  const parts = timeStr.trim().split(/\s+/);
  if (parts.length < 2) {
    return timeStr;
  }
  
  const datePart = parts[0]; // e.g. "20-Jun-2026"
  const timePart = parts[1]; // e.g. "18:03:54"
  
  const timeSubparts = timePart.split(':');
  if (timeSubparts.length < 2) {
    return timeStr;
  }
  
  let hours = parseInt(timeSubparts[0], 10);
  const minutes = timeSubparts[1];
  
  if (isNaN(hours)) {
    return timeStr;
  }
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  
  const formattedHours = hours < 10 ? '0' + hours : hours;
  return `${datePart} ${formattedHours}:${minutes} ${ampm}`;
}

// Helper: Get human-readable last updated time
function getLastUpdatedText() {
  if (!outagesData || !outagesData.last_updated) {
    return "N/A";
  }
  const date = new Date(outagesData.last_updated);
  if (isNaN(date.getTime())) {
    return outagesData.last_updated;
  }
  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: true
  });
}

// ==========================================================================
// Tabs & History Feature Implementations
// ==========================================================================

function switchTab(tab) {
  currentViewTab = tab;
  
  if (tab === 'live') {
    tabLive.classList.add('active');
    tabHistory.classList.remove('active');
    
    outagesSection.classList.remove('hidden');
    historySection.classList.add('hidden');
    
    renderOutages();
  } else if (tab === 'history') {
    tabLive.classList.remove('active');
    tabHistory.classList.add('active');
    
    outagesSection.classList.add('hidden');
    historySection.classList.remove('hidden');
    
    loadHistory();
  }
}

async function loadHistory() {
  if (!currentDistrictName) return;
  
  // Show history loading state
  historyTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 32px;"><i class="fa-solid fa-spinner fa-spin fa-2x" style="margin-bottom: 8px;"></i><br>Loading historical outages archive...</td></tr>`;
  historyEmptyState.classList.add('hidden');
  historyTable.parentElement.classList.remove('hidden');
  
  try {
    const res = await fetch(`data/history/${encodeURIComponent(currentDistrictName)}.json`);
    if (!res.ok) {
      throw new Error("No history file found");
    }
    
    districtHistoryData = await res.json();
    
    // Sort history by scraped_at / timestamp descending
    districtHistoryData.sort((a, b) => {
      const timeA = a.timestamp || 0;
      const timeB = b.timestamp || 0;
      return timeB - timeA;
    });
    
    renderHistory();
  } catch (err) {
    console.log("History fetch failed:", err);
    districtHistoryData = [];
    renderHistory();
  }
}

function renderHistory() {
  const searchTerm = historySearchInput.value.toLowerCase().trim();
  
  const filtered = (districtHistoryData || []).filter(item => {
    const feeder = (item.feeder || '').toLowerCase();
    const area = (item.area || '').toLowerCase();
    const remarks = (item.remarks || '').toLowerCase();
    return feeder.includes(searchTerm) || area.includes(searchTerm) || remarks.includes(searchTerm);
  });
  
  historyTableBody.innerHTML = "";
  
  if (filtered.length === 0) {
    historyTable.parentElement.classList.add('hidden');
    historyEmptyState.classList.remove('hidden');
    return;
  }
  
  historyTable.parentElement.classList.remove('hidden');
  historyEmptyState.classList.add('hidden');
  
  filtered.forEach(item => {
    const severity = getSeverity(item);
    const severityLabel = severity.toUpperCase();
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color: var(--text-dim); font-size: 13px;">${item.scraped_at || 'N/A'}</td>
      <td style="font-weight: 600; color: #fff;">${item.feeder}</td>
      <td>${item.area}</td>
      <td>${formatTimeTo12Hr(item.start_time) || 'N/A'}</td>
      <td>${formatTimeTo12Hr(item.expected_restoration_time) || 'N/A'}</td>
      <td style="font-size: 13px;">${item.remarks || ''}</td>
      <td><span class="sev-tag ${severity}">${severityLabel}</span></td>
    `;
    historyTableBody.appendChild(tr);
  });
}

function handleHistorySearch() {
  renderHistory();
}

function handleExportCsv() {
  if (!districtHistoryData || districtHistoryData.length === 0) {
    alert("No history data available to export.");
    return;
  }
  
  // Columns: Date, District, Feeder, Area, Start Time, Restoration Time, Remarks, Severity
  const csvHeaders = ["Date Recorded", "District", "Feeder Name", "Area Name", "Cut Started At", "Expected Restoration", "Outage Remarks", "Severity"];
  
  const csvRows = [csvHeaders.join(",")];
  
  districtHistoryData.forEach(item => {
    const row = [
      escapeCsvValue(item.scraped_at || 'N/A'),
      escapeCsvValue(currentDistrictName),
      escapeCsvValue(item.feeder || ''),
      escapeCsvValue(item.area || ''),
      escapeCsvValue(formatTimeTo12Hr(item.start_time) || 'N/A'),
      escapeCsvValue(formatTimeTo12Hr(item.expected_restoration_time) || 'N/A'),
      escapeCsvValue(item.remarks || ''),
      escapeCsvValue(getSeverity(item).toUpperCase())
    ];
    csvRows.push(row.join(","));
  });
  
  const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `dhbvn_outage_history_${currentDistrictName.toLowerCase()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeCsvValue(val) {
  if (val === undefined || val === null) return '""';
  let formatted = val.toString().replace(/"/g, '""'); // escape double quotes
  if (formatted.includes(",") || formatted.includes("\n") || formatted.includes('"')) {
    formatted = `"${formatted}"`;
  }
  return formatted;
}

// Helper: Classify Severity of Outage
function getSeverity(outage) {
  const remarksLower = (outage.remarks || '').toLowerCase();
  if (remarksLower.includes('breakdown') || remarksLower.includes('burst') || remarksLower.includes('damage') || remarksLower.includes('heavy') || remarksLower.includes('snapping')) {
    return 'major';
  }
  const start = parseDHBVNDate(outage.start_time);
  const end = parseDHBVNDate(outage.expected_restoration_time);
  if (!start || !end) return 'moderate'; // fallback
  const durationHours = (end - start) / (1000 * 60 * 60);
  if (durationHours >= 4) return 'major';
  if (durationHours >= 2) return 'moderate';
  return 'minor';
}

// Helper: Parse DHBVN Date strings "21-Jun-2026 05:27:00" or "21-Jun-2026 08:30"
function parseDHBVNDate(dateStr) {
  if (!dateStr || dateStr.toLowerCase().includes('pending') || dateStr.toLowerCase().includes('n/a') || dateStr.toLowerCase().includes('estimate')) return null;
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const dateParts = parts[0].split('-');
  const timeParts = parts[1].split(':');
  if (dateParts.length < 3 || timeParts.length < 2) return null;
  
  const day = parseInt(dateParts[0], 10);
  const monthStr = dateParts[1].toLowerCase();
  const year = parseInt(dateParts[2], 10);
  
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const month = months[monthStr.substring(0, 3)] || 0;
  
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  const seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
  
  return new Date(year, month, day, hours, minutes, seconds);
}
