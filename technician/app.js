import { getVersionsList, deleteFirmware } from "../callAPI.js";

let firmwareData = null;

// DOM elements - will be initialized after DOM loads
let root, logoutButton, addButton, refreshButton;

// Initialize firmware data
async function initializeFirmwareData() {
  try {
    firmwareData = await getVersionsList();
    return firmwareData;
  } catch (error) {
    firmwareData = {};
    return firmwareData;
  }
}

// Auth handling - Check if user is logged in
function checkAuthentication() {
  const userToken = sessionStorage.getItem('userToken');
  const userInfo = sessionStorage.getItem('userInfo');
  
  if (userToken && userInfo) {
    try {
      const user = JSON.parse(userInfo);
      if (user && user.user && user.user.role) {
        const userRole = user.user.role;
        if (userRole === 'admin') {
          if (root) root.classList.remove("hidden");
        } else {
          window.location.href = "../customer/customer.html";
        }
      } else {
        window.location.href = "../login/login.html";
      }
    } catch (error) {
      window.location.href = "../login/login.html";
    }
  } else {
    window.location.href = "../login/login.html";
  }
}

// Initialize authentication check on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize DOM elements
  root = document.getElementById("root");
  logoutButton = document.getElementById("logoutButton");
  addButton = document.getElementById("addButton");
  refreshButton = document.getElementById("refreshButton");
  
  // Check authentication first
  checkAuthentication();
  
  // Setup button event listeners
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      sessionStorage.removeItem('userToken');
      sessionStorage.removeItem('userInfo');
      window.location.href = "../login/login.html";
    });
  }
  
  if (addButton) {
    addButton.addEventListener("click", () => {
      window.location.href = "upload.html";
    });
  }

  // Initialize firmware data and page
  try {
    await initializeFirmwareData();
    
    if (root && refreshButton) {
      initFirmwarePage();
    }
  } catch (error) {
    // Error handled silently
  }
});

// ===============================
// Firmware page logic
// ===============================
function initFirmwarePage() {
  // Initialize page
  loadFirmwareData();
  setupEventListeners();

  // Process and filter firmware data
  function processAndFilterFirmwareData(versionList) {
    if (!versionList || Object.keys(versionList).length === 0) {
      return [];
    }

    // Get filter values
    const deviceNameFilter = document.getElementById('filterDeviceName')?.value?.toLowerCase() || '';
    const sortVersion = document.getElementById('sortVersion')?.value || '';
    const sortDate = document.getElementById('sortDate')?.value || '';
    
    // Collect all versions with device names
    let allVersions = [];
    Object.keys(versionList).forEach(deviceName => {
      const versions = versionList[deviceName];
      if (Array.isArray(versions)) {
        versions.forEach(version => {
          allVersions.push({
            ...version,
            deviceName: deviceName
          });
        });
      }
    });
    
    // Apply device name filter
    if (deviceNameFilter) {
      allVersions = allVersions.filter(item => 
        item.deviceName.toLowerCase().includes(deviceNameFilter)
      );
    }
    
    // Apply sorting
    if (sortVersion) {
      allVersions.sort((a, b) => {
        const aVersion = a.version || '0';
        const bVersion = b.version || '0';
        
        // Compare versions using semantic version comparison
        const compareResult = compareVersions(aVersion, bVersion);
        return sortVersion === 'asc' ? compareResult : -compareResult;
      });
    }
    
    if (sortDate) {
      allVersions.sort((a, b) => {
        const aDate = new Date(a.release_date || a.released_date || a.released);
        const bDate = new Date(b.release_date || b.released_date || b.released);
        return sortDate === 'asc' ? aDate - bDate : bDate - aDate;
      });
    }
    
    return allVersions;
  }

  // Populate device name filter dropdown
  function populateDeviceNameFilter(versionList) {
    const deviceNameSelect = document.getElementById('filterDeviceName');
    if (!deviceNameSelect || !versionList) return;

    const uniqueDeviceNames = new Set();
    Object.keys(versionList).forEach(deviceName => {
      if (Array.isArray(versionList[deviceName])) {
        uniqueDeviceNames.add(deviceName);
      }
    });
    
    // Preserve current selection
    const currentValue = deviceNameSelect.value;
    
    // Clear and repopulate options
    deviceNameSelect.innerHTML = '<option value="">All Devices</option>';
    uniqueDeviceNames.forEach(deviceName => {
      const option = document.createElement('option');
      option.value = deviceName;
      option.textContent = deviceName;
      deviceNameSelect.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (currentValue && Array.from(deviceNameSelect.options).some(opt => opt.value === currentValue)) {
      deviceNameSelect.value = currentValue;
    }
  }

  // Load firmware data and populate table
  async function loadFirmwareData() {
    const tbody = document.getElementById('firmwareTableBody');
    
    try {
      // Ensure we have firmware data
      if (!firmwareData) {
        await initializeFirmwareData();
      }
      
      const versionList = firmwareData;

      // Populate device name filter dropdown
      populateDeviceNameFilter(versionList);
      
      if (versionList && Object.keys(versionList).length > 0) {
        tbody.innerHTML = ''; // Clear existing rows
        
        // Process and filter data
        const filteredVersions = processAndFilterFirmwareData(versionList);
        
        // Display results
        if (filteredVersions.length > 0) {
          filteredVersions.forEach(item => {
            showRowData(item, item.deviceName);
          });
          
          // Attach delete handlers after rows are created
          attachDeleteHandlers();
        } else {
          // Show no results message
          tbody.innerHTML = `
            <tr>
              <td colspan="5" style="text-align: center; color: #7f8c8d; font-style: italic;">
                No firmware versions match your filter criteria.
              </td>
            </tr>`;
        }
      } else {
        // Show empty state
        showEmptyData();
      }
    } catch (error) {
      showErrorData();
    }
  }

  // Show empty state
  function showEmptyData() {
    const tbody = document.getElementById('firmwareTableBody');
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #7f8c8d; font-style: italic;">
          No firmware versions available.
        </td>
      </tr>`;
  }

  // Show error state
  function showErrorData() {
    const tbody = document.getElementById('firmwareTableBody');
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #e74c3c; font-style: italic;">
          Failed to load firmware versions. Please try refreshing.
        </td>
      </tr>`;
  }

  // Show row data
  function showRowData(version, deviceName) {
    const tbody = document.getElementById('firmwareTableBody');
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${deviceName || 'N/A'}</td>
      <td>${version.version || 'N/A'}</td>
      <td>${formatDate(version.release_date)}</td>
      <td title="${version.changelog || 'No changelog available'}">${(version.changelog || 'No changelog available').substring(0, 50)}${version.changelog && version.changelog.length > 50 ? '...' : ''}</td>
      <td>
        <div class="actions-container">
          <a href="${version.file_url || '#'}" target="_blank" class="action-btn-clean action-download-clean" title="Download firmware">📥 Download</a>
          <button class="delete-btn action-btn-clean action-delete-clean" data-version="${version.version}" data-device="${deviceName}" title="Delete firmware version">🗑️ Delete</button>
        </div>
      </td>`;
    
    tbody.appendChild(row);
  }

  // Attach delete event handlers
  function attachDeleteHandlers() {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
      // Remove any existing event listeners to prevent duplicates
      btn.removeEventListener('click', handleDeleteClick);
      btn.addEventListener('click', handleDeleteClick);
    });
  }

  // Separate click handler to avoid closure issues
  function handleDeleteClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const btn = event.target;
    const version = btn.dataset.version;
    const deviceName = btn.dataset.device;
    
    // Use setTimeout to ensure the event handling is complete
    setTimeout(() => {
      handleDeleteFirmware(version, deviceName, btn);
    }, 0);
  }

  // Setup all event listeners
  function setupEventListeners() {
    // Refresh button
    if (refreshButton) {
      refreshButton.addEventListener('click', handleRefresh);
    } else {
      const foundRefreshButton = document.getElementById('refreshButton');
    }
    
    // Clear filter button
    const clearBtn = document.getElementById('clearFilterBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', handleClearFilter);
    }
    
    // Real-time filtering on input change
    const deviceNameInput = document.getElementById('filterDeviceName');
    const sortVersionSelect = document.getElementById('sortVersion');
    const sortDateSelect = document.getElementById('sortDate');
    
    if (deviceNameInput) {
      deviceNameInput.addEventListener('change', () => {
        loadFirmwareData(); // Re-filter data when selection changes
      });
    }
    
    if (sortVersionSelect) {
      sortVersionSelect.addEventListener('change', () => {
        loadFirmwareData(); // Re-sort data when selection changes
      });
    }
    
    if (sortDateSelect) {
      sortDateSelect.addEventListener('change', () => {
        loadFirmwareData(); // Re-sort data when selection changes
      });
    }
  }

  // Handle refresh button click
  async function handleRefresh() {
    if (!refreshButton) {
      return;
    }
    
    // Prevent multiple simultaneous refresh operations
    if (refreshButton.disabled) {
      return;
    }
    
    refreshButton.textContent = '🔄 Refreshing...';
    refreshButton.disabled = true;
    
    try {
      // Re-fetch data from API
      firmwareData = await getVersionsList();
      await loadFirmwareData();
    } catch (error) {
      alert('Failed to refresh data. Please try again.');
    } finally {
      // Always reset button state
      refreshButton.textContent = '🔄 Refresh';
      refreshButton.disabled = false;
    }
  }

  // Handle clear filter button
  function handleClearFilter() {
    document.getElementById('filterDeviceName').value = '';
    document.getElementById('sortVersion').value = '';
    document.getElementById('sortDate').value = '';
    loadFirmwareData();
  }

  // Format date for display
  function formatDate(dateString) {
    if (!dateString) {
      return 'N/A';
    }
    
    try {
      let date;
      
      // If it's already a Date object
      if (dateString instanceof Date) {
        date = dateString;
      } 
      // If it's a timestamp (number)
      else if (typeof dateString === 'number') {
        date = new Date(dateString);
      }
      // If it's a string - handle ISO format with microseconds
      else if (typeof dateString === 'string') {
        // Handle format like "2025-07-09T07:11:12.598639" (microseconds without timezone)
        let processedDateString = dateString.trim();
        
        // Check if it's an ISO-like format without timezone
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(processedDateString)) {
          // If it has microseconds (more than 3 decimal places), truncate to milliseconds
          if (processedDateString.includes('.')) {
            const [datePart, fractionalPart] = processedDateString.split('.');
            if (fractionalPart.length > 3) {
              // Keep only first 3 digits (milliseconds)
              processedDateString = datePart + '.' + fractionalPart.substring(0, 3);
            }
          }
          // Add 'Z' to indicate UTC timezone
          processedDateString += 'Z';
        }
        
        date = new Date(processedDateString);
      }
      else {
        return 'Invalid Date';
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString; // Return original if can't parse
      }
      
      const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      };
      
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      return dateString || 'N/A';
    }
  }

  // Helper function to compare semantic versions
  function compareVersions(version1, version2) {
    // Convert versions to arrays of numbers
    const v1Parts = version1.toString().split('.').map(part => {
      // Extract numeric part from strings like "1.0.0-beta" or "2.1a"
      const numMatch = part.match(/^\d+/);
      return numMatch ? parseInt(numMatch[0], 10) : 0;
    });
    
    const v2Parts = version2.toString().split('.').map(part => {
      const numMatch = part.match(/^\d+/);
      return numMatch ? parseInt(numMatch[0], 10) : 0;
    });
    
    // Pad arrays to same length with zeros
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    while (v1Parts.length < maxLength) v1Parts.push(0);
    while (v2Parts.length < maxLength) v2Parts.push(0);
    
    // Compare each part
    for (let i = 0; i < maxLength; i++) {
      if (v1Parts[i] < v2Parts[i]) return -1;
      if (v1Parts[i] > v2Parts[i]) return 1;
    }
    
    return 0; // Versions are equal
  }

  // Handle delete firmware version
  async function handleDeleteFirmware(version, deviceName, deleteBtn) {
    try {
      if (!confirm(`Are you sure you want to delete firmware version ${version} for ${deviceName}? This cannot be undone.`)) {
        return;
      }
      
      // Update button state
      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Deleting...';
      deleteBtn.classList.add('deleting');

      // Call API to delete firmware version
      const response = await deleteFirmware(deviceName, version);

      if (response && response.success) {
        // Show success message
        alert(response.message || `Successfully deleted firmware version ${version} for ${deviceName}`);
        
        // Refresh data and reload table
        firmwareData = await getVersionsList();
        loadFirmwareData();
      } else {
        throw new Error(response?.message || `Failed to delete firmware version ${version} for ${deviceName}`);
      }
    } catch (error) {
      // Reset button state on error
      deleteBtn.disabled = false;
      deleteBtn.textContent = '🗑️ Delete';
      deleteBtn.classList.remove('deleting');
      
      // Show error message
      const errorMessage = error.message || `Failed to delete firmware version ${version}. Please try again.`;
      alert(errorMessage);
    }
  }
}
