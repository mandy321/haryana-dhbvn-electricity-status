// State variables
let outagesData = null;
let currentDistrict = "";
let userLocalityData = {
  district: "",
  suburb: "",
  neighbourhood: "",
  village: "",
  town: ""
};

// District mapping utility (to match OSM geocoding with DHBVN names)
const DISTRICT_MAP = {
  "gurgaon": "Gurugram",
  "gurugram": "Gurugram",
  "mahendragarh": "Mahendrgarh",
  "nuh": "Nuh",
  "mewat": "Nuh",
  "palwal": "Palwal",
  "faridabad": "Faridabad",
  "jind": "Jind",
  "fatehabad": "Fatehabad",
  "sirsa": "Sirsa",
  "hisar": "Hisar",
  "bhiwani": "Bhiwani",
  "rewari": "Rewari",
  "charkhi dadri": "Charkhi Dadri",
  "dadri": "Charkhi Dadri"
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
const currentDistrictName = document.getElementById('currentDistrictName');
const searchInput = document.getElementById('searchInput');
const outagesTable = document.getElementById('outagesTable');
const outagesTableBody = document.getElementById('outagesTableBody');
const mobileCardsContainer = document.getElementById('mobileCardsContainer');
const emptyState = document.getElementById('emptyState');
const pageLoader = document.getElementById('pageLoader');
const lastUpdatedTime = document.getElementById('lastUpdatedTime');

// Initialize App
window.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  showLoader(true);
  try {
    // Fetch data/outages.json (which is updated by GitHub Actions)
    const response = await fetch('data/outages.json');
    if (!response.ok) {
      throw new Error('Outages data file not found. Scraper may not have run yet.');
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
    
  } catch (error) {
    console.error('Initialization error:', error);
    showLoader(false);
    alert('Failed to load outages database. Please try refreshing or check back later.');
  }
}

// Show/Hide loader spinner
function showLoader(show) {
  if (show) {
    pageLoader.classList.remove('hidden');
    outagesSection.classList.add('hidden');
    statsPanel.classList.add('hidden');
    localitySection.classList.add('hidden');
  } else {
    pageLoader.classList.add('hidden');
  }
}

// Handle Manual District Dropdown Change
function handleDistrictChange(e) {
  const selectedDistrict = e.target.value;
  if (!selectedDistrict) return;
  
  selectDistrict(selectedDistrict);
}

// Select a District and Render its Data
function selectDistrict(district) {
  currentDistrict = district;
  districtSelect.value = district;
  currentDistrictName.textContent = district;
  
  // Clear search input
  searchInput.value = "";
  
  // Update UI sections visibility
  outagesSection.classList.remove('hidden');
  statsPanel.classList.remove('hidden');
  
  // Calculate and display stats
  updateStats(district);
  
  // Render main outage grid
  renderOutages();
  
  // If we have user geolocation matching this district, check for matching locality outages
  checkLocalityOutages(district);
}

// Calculate Stats for District
function updateStats(district) {
  const list = outagesData.districts[district] || [];
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

// Render Outages in Table and Mobile Cards
function renderOutages() {
  const districtList = outagesData.districts[currentDistrict] || [];
  const searchTerm = searchInput.value.toLowerCase().trim();
  
  // Filter list by search term
  const filteredList = districtList.filter(item => {
    const feeder = (item.feeder || '').toLowerCase();
    const area = (item.area || '').toLowerCase();
    return feeder.includes(searchTerm) || area.includes(searchTerm);
  });
  
  // Clear containers
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
    const badgeText = isPlanned ? 'Planned Maintenance' : 'Unplanned Cut';
    const badgeIcon = isPlanned ? 'fa-screwdriver-wrench' : 'fa-triangle-exclamation';

    // 1. Desktop Row HTML
    const tr = document.createElement('tr');
    tr.innerHTML = `
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

    // 2. Mobile Card HTML
    const card = document.createElement('div');
    card.className = 'mobile-outage-card';
    card.innerHTML = `
      <div class="mobile-card-row header">
        <div class="mobile-feeder">${item.feeder}</div>
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

// Handle Search Input Filtering
function handleSearch() {
  if (!currentDistrict) return;
  renderOutages();
}

// Handle Geolocation Click
function handleGeolocation() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }
  
  // Reset locality display and show loader
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
        // Reverse Geocode using Nominatim API (OpenStreetMap)
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`, {
          headers: {
            'Accept-Language': 'en'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch reverse geocode details from OpenStreetMap.');
        }
        
        const data = await response.json();
        const address = data.address || {};
        console.log('Geocoded address:', address);
        
        // Extract locality keys
        userLocalityData.suburb = address.suburb || "";
        userLocalityData.neighbourhood = address.neighbourhood || address.residential || "";
        userLocalityData.village = address.village || address.hamlet || "";
        userLocalityData.town = address.town || address.suburb || "";
        
        // Find mapped District
        let detectedDistrictName = "";
        
        // Look in OSM keys in order of resolution (county / state_district / city)
        const possibleDistKeys = [
          address.county,
          address.state_district,
          address.city,
          address.district
        ];
        
        for (const rawKey of possibleDistKeys) {
          if (!rawKey) continue;
          const cleanKey = rawKey.replace(/district/gi, "").trim().toLowerCase();
          if (DISTRICT_MAP[cleanKey]) {
            detectedDistrictName = DISTRICT_MAP[cleanKey];
            break;
          }
        }
        
        if (!detectedDistrictName) {
          throw new Error("Unable to map your locality to one of the DHBVN districts.");
        }
        
        userLocalityData.district = detectedDistrictName;
        geoFeedbackText.textContent = `Located: ${detectedDistrictName} (${userLocalityData.suburb || userLocalityData.village || 'Local Area'})`;
        
        // Automatically select district and render
        setTimeout(() => {
          geoFeedback.classList.add('hidden');
          locateBtn.disabled = false;
          selectDistrict(detectedDistrictName);
        }, 1500);
        
      } catch (err) {
        console.error('Reverse Geocode error:', err);
        geoFeedbackText.textContent = "Reverse geocoding failed. Mapped to default.";
        setTimeout(() => {
          geoFeedback.classList.add('hidden');
          locateBtn.disabled = false;
          alert(`Detected coordinates, but failed to reverse lookup district. Please select your district manually.`);
        }, 2000);
      }
    },
    (error) => {
      console.error('Geolocation position error:', error);
      let errorMsg = "Permission denied or GPS signal timeout.";
      if (error.code === error.PERMISSION_DENIED) {
        errorMsg = "Geolocation permission denied. Please select district manually.";
      }
      geoFeedbackText.textContent = errorMsg;
      setTimeout(() => {
        geoFeedback.classList.add('hidden');
        locateBtn.disabled = false;
        alert(`Location detection failed: ${errorMsg}`);
      }, 2500);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

// Check for and Highlight Outages in User's Specific Locality
function checkLocalityOutages(district) {
  // If the user hasn't successfully geocoded or the geocoded district differs from selection, hide alert
  if (!userLocalityData.district || userLocalityData.district !== district) {
    localitySection.classList.add('hidden');
    return;
  }
  
  // Find locality search keys (e.g. suburb name, village name)
  const searchKeys = [
    userLocalityData.suburb,
    userLocalityData.neighbourhood,
    userLocalityData.village,
    userLocalityData.town
  ].filter(key => key.length > 2) // keep non-empty, reasonably long strings
   .map(key => key.toLowerCase().trim());
   
  if (searchKeys.length === 0) {
    localitySection.classList.add('hidden');
    return;
  }
  
  const districtList = outagesData.districts[district] || [];
  
  // Filter outages where area name contains any of the locality keys
  const localOutages = districtList.filter(item => {
    const areaName = (item.area || '').toLowerCase();
    return searchKeys.some(key => areaName.includes(key) || key.includes(areaName));
  });
  
  if (localOutages.length === 0) {
    // No local cuts found in matched area - render nice clear message or hide
    localitySection.classList.add('hidden');
    return;
  }
  
  // Render local matching outages cards
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
        <span><strong>Est. Restoration:</strong> <span style="color: #67e8f9; font-weight:600;">${item.expected_restoration_time || 'Pending Estimate'}</span></span>
      </div>
      <div class="local-card-detail">
        <i class="fa-solid fa-circle-info"></i>
        <span><strong class="remarks-label">Status:</strong> ${remarks}</span>
      </div>
    `;
    localityCardContainer.appendChild(card);
  });
}
