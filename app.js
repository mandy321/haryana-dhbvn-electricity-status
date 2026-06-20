// State variables
let outagesData = null;
let currentDistrictId = "";
let currentDistrictName = "";
let pinnedArea = null;
let sharedArea = null;

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
      const updateDate = new Date(outagesData.last_updated);
      lastUpdatedTime.textContent = updateDate.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    }
    
    showLoader(false);
    
    // Setup event listeners
    districtSelect.addEventListener('change', handleDistrictChange);
    searchInput.addEventListener('input', handleSearch);
    locateBtn.addEventListener('click', handleGeolocation);
    refreshBtn.addEventListener('click', handleLiveRefresh);
    
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
  const activeCut = list.find(item => item.feeder === sharedArea.feeder && item.area === sharedArea.area);
  
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
        <button class="btn-refresh" style="background:none; border:none; color:var(--text-dim); cursor:pointer;" onclick="dismissSharedArea()"><i class="fa-solid fa-xmark"></i> Dismiss</button>
      </div>
      <div class="shared-card-body">
        <div class="shared-item" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-house-laptop"></i>
          <span><strong>Outage Detected:</strong> <span style="font-weight:700; color:#fff;">${sharedArea.area} (${sharedArea.feeder})</span></span>
        </div>
        <div class="shared-item">
          <i class="fa-solid fa-clock"></i>
          <span><strong>Cut Started:</strong> ${activeCut.start_time || 'N/A'}</span>
        </div>
        <div class="shared-item">
          <i class="fa-solid fa-circle-chevron-right"></i>
          <span><strong>Est. Restoration:</strong> <span style="color:#67e8f9; font-weight:600;">${activeCut.expected_restoration_time || 'Pending Estimate'}</span></span>
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
      </div>
    `;
  } else {
    // Shared area is healthy
    sharedCard.innerHTML = `
      <div class="shared-card-header">
        <h3><i class="fa-solid fa-share-nodes" style="color: var(--primary-color);"></i> Shared Locality Status</h3>
        <button class="btn-refresh" style="background:none; border:none; color:var(--text-dim); cursor:pointer;" onclick="dismissSharedArea()"><i class="fa-solid fa-xmark"></i> Dismiss</button>
      </div>
      <div class="shared-card-body">
        <div class="shared-item" style="grid-column: 1 / -1; display:flex; align-items:center; gap: 14px;">
          <div class="status-badge badge-glow-green" style="font-size: 14px; padding: 6px 12px;">
            <i class="fa-solid fa-circle-check"></i> Power Active & Healthy
          </div>
          <span>No outages recorded for <strong>${sharedArea.area} (${sharedArea.feeder})</strong>. Power is currently active!</span>
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
  const activeCut = list.find(item => item.feeder === pinnedArea.feeder && item.area === pinnedArea.area);
  
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
        <button class="btn-refresh" style="background:none; border:none; color:var(--text-dim); cursor:pointer;" onclick="unpinArea()"><i class="fa-solid fa-trash-can"></i> Unpin</button>
      </div>
      <div class="pinned-card-body">
        <div class="pinned-item" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-house-laptop"></i>
          <span><strong>Outage Detected:</strong> <span style="font-weight:700; color:#fff;">${pinnedArea.area} (${pinnedArea.feeder})</span></span>
        </div>
        <div class="pinned-item">
          <i class="fa-solid fa-clock"></i>
          <span><strong>Cut Started:</strong> ${activeCut.start_time || 'N/A'}</span>
        </div>
        <div class="pinned-item">
          <i class="fa-solid fa-circle-chevron-right"></i>
          <span><strong>Est. Restoration:</strong> <span style="color:#67e8f9; font-weight:600;">${activeCut.expected_restoration_time || 'Pending Estimate'}</span></span>
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
      </div>
    `;
  } else {
    pinnedCard.innerHTML = `
      <div class="pinned-card-header">
        <h3><i class="fa-solid fa-star" style="color: var(--warning-color);"></i> Pinned Locality</h3>
        <button class="btn-refresh" style="background:none; border:none; color:var(--text-dim); cursor:pointer;" onclick="unpinArea()"><i class="fa-solid fa-trash-can"></i> Unpin</button>
      </div>
      <div class="pinned-card-body">
        <div class="pinned-item" style="grid-column: 1 / -1; display:flex; align-items:center; gap: 14px;">
          <div class="status-badge badge-glow-green" style="font-size: 14px; padding: 6px 12px;">
            <i class="fa-solid fa-circle-check"></i> Power Active & Healthy
          </div>
          <span>No outages recorded for <strong>${pinnedArea.area} (${pinnedArea.feeder})</strong>.</span>
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
  currentDistrictId = districtId;
  currentDistrictName = DISTRICT_ID_TO_NAME[districtId];
  
  districtSelect.value = districtId;
  currentDistrictNameSpan.textContent = currentDistrictName;
  
  // Clear search and enable buttons
  searchInput.value = "";
  refreshBtn.disabled = false;
  
  // Make panels visible
  outagesSection.classList.remove('hidden');
  statsPanel.classList.remove('hidden');
  
  updateStats();
  renderOutages();
  checkLocalityOutages();
  renderPinnedArea();
  renderSharedArea();
}

// Compute Stats Counter Values
function updateStats() {
  const list = outagesData.districts[currentDistrictName] || [];
  const total = list.length;
  
  let planned = 0;
  let active = 0;
  
  list.forEach(item => {
    const remarks = (item.remarks || '').toUpperCase();
    if (remarks.includes('PLANNED') || remarks.includes('MTC') || remarks.includes('MAINTENANCE')) {
      planned++;
    } else {
      active++;
    }
  });
  
  statTotalOutages.textContent = total;
  statActive.textContent = active;
  statPlanned.textContent = planned;
}

// Render Outages List & Setup Pins
function renderOutages() {
  const districtList = outagesData.districts[currentDistrictName] || [];
  const searchTerm = searchInput.value.toLowerCase().trim();
  
  // Filter by text search
  const filteredList = districtList.filter(item => {
    const feeder = (item.feeder || '').toLowerCase();
    const area = (item.area || '').toLowerCase();
    return feeder.includes(searchTerm) || area.includes(searchTerm);
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
      <td>${item.start_time || 'N/A'}</td>
      <td style="font-weight: 500; color: ${item.expected_restoration_time ? '#67e8f9' : 'var(--text-dim)'};">
        ${item.expected_restoration_time || 'Pending Estimate'}
      </td>
      <td>
        <div class="status-badge ${badgeClass}" style="margin-bottom: 6px;">
          <i class="fa-solid ${badgeIcon}"></i> ${badgeText}
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
        <div class="status-badge ${badgeClass}">
          <i class="fa-solid ${badgeIcon}"></i> ${badgeText}
        </div>
      </div>
      <div class="mobile-card-row">
        <div class="label">Area Name</div>
        <div class="val" style="font-weight: 500; color: #fff;">${item.area}</div>
      </div>
      <div class="mobile-card-row">
        <div class="label">Cut Started</div>
        <div class="val">${item.start_time || 'N/A'}</div>
      </div>
      <div class="mobile-card-row">
        <div class="label">Expected Back</div>
        <div class="val" style="font-weight: 600; color: #67e8f9;">${item.expected_restoration_time || 'Pending Estimate'}</div>
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
        <span><strong>Cut Started:</strong> ${item.start_time || 'N/A'}</span>
      </div>
      <div class="local-card-detail">
        <i class="fa-solid fa-circle-chevron-right"></i>
        <span><strong>Est. Restoration:</strong> <span style="color:#67e8f9; font-weight:600;">${item.expected_restoration_time || 'Pending Estimate'}</span></span>
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
async function handleLiveRefresh() {
  if (!currentDistrictId) return;
  
  refreshBtn.disabled = true;
  refreshIcon.classList.add('spin-animation');
  refreshBtnText.textContent = "Refreshing...";
  
  try {
    // 1. Build request XML string with selected district's numeric ID
    const xmlRequest = `<?xml version="1.0"?><Request VERSION="2" LANGUAGE_ID="1" LOCATION=""><Company Company_Id="93" /><Project Project_Id="304" /><User User_Id="Anonymous" /><IUVLogin IUVLogin_Id="Anonymous" /><ROLE ROLE_ID="1595" /><Event Control_Id="130404" /><Child Control_Id="125681" Report="HTML" AC_ID="163944"><Parent Control_Id="130402" Value="${currentDistrictId}" Data_Form_Id="" XValue="${currentDistrictId}" YValue="" ZValue="" /></Child></Request>`;
    
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
    outagesData.districts[currentDistrictName] = list;
    
    // 6. Update timestamp UI and in-memory date
    const now = new Date();
    lastUpdatedTime.textContent = "Refreshed Live: " + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // 7. Update UI view panels
    updateStats();
    renderOutages();
    checkLocalityOutages();
    renderPinnedArea();
    renderSharedArea();
    
  } catch (err) {
    console.error('On-demand refresh error:', err);
    alert('Failed to refresh data live from DHBVN. Please check your internet connection or try again later.');
  } finally {
    refreshBtn.disabled = false;
    refreshIcon.classList.remove('spin-animation');
    refreshBtnText.textContent = "Refresh Live";
  }
}
