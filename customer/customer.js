import { getDeviceList, getVersionsList, updateDevice, deleteDevice, getInfo, updateDeviceVersion, updateDeviceInfo } from '../callAPI.js';

// Function to populate the device table
async function populateDeviceTable() {
  const tableBody = document.querySelector("#firmwareTableBody");
  tableBody.innerHTML = ""; // Clear existing rows

  const data = await getDeviceList();
  let deviceList = data['devices'] || []; // Fallback to empty array if API call fails
  if (!deviceList) {
    deviceList = []; // Fallback to empty array if API call fails
  }
  let filteredDevices = [...deviceList];

  let allLastestVersionForEachDevice = await getVersionsList();

  filteredDevices.forEach(device => {
    const row = document.createElement("tr");

    const latestVersion = (() => {
      const versionList = allLastestVersionForEachDevice?.[device.name];
      const versionInfo = Array.isArray(versionList) ? versionList[0] : null;
      return versionInfo?.version || device.version;
    })();


    // Connection status with proper CSS classes
    const status = (device?.is_connect || 'unknown').toLowerCase();

    const connectionStatus = `
      <span class="connection-status connection-${status}">
        <span class="connection-dot"></span>
        ${status}
      </span>`;


    // Warning status with proper CSS classes
    const warningStatus = !device.warning
      ? '<span class="warning-indicator warning-none">Bình thường</span>'
      : `<span class="warning-indicator warning-low">${device.warning}</span>`;

    // Status badge based on update status, connection and warning
    let statusBadge;
    
    if (device.status === "done") {
      statusBadge = '<span class="status-badge status-up-to-date">Done</span>';
    } else if (device.status === "failed") {
      statusBadge = '<span class="status-badge status-outdated">Failed</span>';
    } else if (device.status === "waiting") {
      statusBadge = '<span class="status-badge status-update-available">Waiting</span>';
    } else {
      statusBadge = device.status;
    }

    // Create 10 columns for the row (matching the CSS structure)
    row.innerHTML = `
      <td><input type="checkbox" class="device-checkbox" data-device-id="${device.device_id}"></td>
      <td data-label="ID">${device.device_id}</td>
      <td data-label="Name">${device.name}</td>
      <td data-label="Location">${device.location}</td>
      <td data-label="Current Version">${device.version}</td>
      <td data-label="Latest Version">${latestVersion || 'N/A'}</td>
      <td data-label="Is Connected">${connectionStatus}</td>
      <td data-label="Warning">${warningStatus}</td>
      <td data-label="Status">${statusBadge}</td>
      <td data-label="Actions">
        <button class="table-action-btn edit-btn" data-device-id="${device.device_id}" title="Edit Device">
          Edit
        </button>
        <button class="table-action-btn update-btn" data-device-id="${device.device_id}" title="Update Device">
          Update
        </button>
        <button class="table-action-btn delete-btn" data-device-id="${device.device_id}" title="Delete Device" style="background:linear-gradient(135deg,#ef4444 0%,#b91c1c 100%);color:#fff;">
          <span class="delete-icon" style="margin-right:4px;">🗑️</span>Delete
        </button>
      </td>
    `;

    tableBody.appendChild(row);
  });

  // Update checkbox event listeners
  updateCheckboxListeners();
}

// Function to update checkbox event listeners
function updateCheckboxListeners() {
  const checkboxes = document.querySelectorAll('.device-checkbox');
  const selectAllCheckbox = document.getElementById('selectAll');
  const selectedCountSpan = document.getElementById('selectedCount');
  const bulkUpdateButton = document.getElementById('bulkUpdateButton');

  // Update selected count and button state
  function updateSelectedCount() {
    const selectedCheckboxes = document.querySelectorAll('.device-checkbox:checked');
    const count = selectedCheckboxes.length;
    
    // Update count display
    selectedCountSpan.textContent = `${count} device${count !== 1 ? 's' : ''} selected`;
    
    // Update bulk update button state and appearance
    if (bulkUpdateButton) {
      bulkUpdateButton.disabled = count === 0;
      
      if (count === 0) {
        // Hide icon when no devices selected
        bulkUpdateButton.innerHTML = 'Update Latest Version';
        bulkUpdateButton.style.opacity = '0.5';
        bulkUpdateButton.style.cursor = 'not-allowed';
      } else {
        // Show icon when devices are selected
        bulkUpdateButton.innerHTML = '<span class="update-icon">🔄</span>Update Latest Version';
        bulkUpdateButton.style.opacity = '1';
        bulkUpdateButton.style.cursor = 'pointer';
      }
    }
    
    // Update optional version button state
    const bulkUpdateOptionalButton = document.getElementById('bulkUpdateOptionalButton');
    if (bulkUpdateOptionalButton) {
      bulkUpdateOptionalButton.disabled = count === 0;
      
      if (count === 0) {
        bulkUpdateOptionalButton.innerHTML = 'Update with Selected Version';
        bulkUpdateOptionalButton.style.opacity = '0.5';
        bulkUpdateOptionalButton.style.cursor = 'not-allowed';
      } else {
        bulkUpdateOptionalButton.innerHTML = '<span class="update-icon">⚙️</span>Update with Selected Version';
        bulkUpdateOptionalButton.style.opacity = '1';
        bulkUpdateOptionalButton.style.cursor = 'pointer';
      }
    }
  }

  // Select all functionality with improved handling
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
      const isChecked = this.checked;
      checkboxes.forEach(checkbox => {
        // Only check visible and enabled checkboxes
        if (!checkbox.disabled && checkbox.closest('tr').style.display !== 'none') {
          checkbox.checked = isChecked;
        }
      });
      updateSelectedCount();
    });
  }

  // Individual checkbox listeners with better state management
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      updateSelectedCount();
      
      // Update select all checkbox state
      const visibleCheckboxes = Array.from(checkboxes).filter(cb => 
        !cb.disabled && cb.closest('tr').style.display !== 'none'
      );
      const totalVisibleCheckboxes = visibleCheckboxes.length;
      const checkedVisibleCheckboxes = visibleCheckboxes.filter(cb => cb.checked).length;
      
      if (selectAllCheckbox) {
        if (checkedVisibleCheckboxes === 0) {
          selectAllCheckbox.checked = false;
          selectAllCheckbox.indeterminate = false;
        } else if (checkedVisibleCheckboxes === totalVisibleCheckboxes) {
          selectAllCheckbox.checked = true;
          selectAllCheckbox.indeterminate = false;
        } else {
          selectAllCheckbox.checked = false;
          selectAllCheckbox.indeterminate = true;
        }
      }
    });
  });

  // Initial count update
  updateSelectedCount();
}

// Function to handle refresh button click
async function handleRefreshButtonClick(event) {
  const button = event.target.closest('.refresh-btn'); // Get the button element
  const btnText = button.querySelector('.btn-text');
  const btnIcon = button.querySelector('.btn-icon');
  
  button.disabled = true; // Disable the button to prevent multiple clicks
  btnText.textContent = "Refreshing...";
  btnIcon.textContent = "⏳";

  // Simulate a refresh process
  setTimeout(async () => {
    await populateDeviceTable(); // Refresh the table

    btnText.textContent = "Refreshed!";
    btnIcon.textContent = "✅";
    button.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)"; // Green color for success

    // Add a success animation
    button.classList.add("success-animation");

    // Revert button state after animation
    setTimeout(() => {
      btnText.textContent = "Refresh";
      btnIcon.textContent = "🔄";
      button.style.background = ""; // Reset to default
      button.disabled = false;
      button.classList.remove("success-animation");
    }, 2000); // Animation duration
  }, 1500); // Simulated refresh duration
}

// Function to apply filters
async function applyFilters() {
  // Get filter values
  const locationFilter = document.getElementById('locationFilter').value.trim().toLowerCase();
  const isConnectedFilter = document.getElementById('isConnectedFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;

  const data = await getDeviceList();
  let filteredDevices = data;
  if (filteredDevices.devices) filteredDevices = filteredDevices['devices'] || []; // Fallback to empty array if API call fails

  // Apply filters
  filteredDevices = filteredDevices.filter(device => {
    let match = true;
    if (locationFilter && (!device.location || !device.location.toLowerCase().includes(locationFilter))) match = false;
    if (isConnectedFilter && device.is_connect !== isConnectedFilter) match = false;
    if (statusFilter && device.status !== statusFilter) match = false;
    return match;
  });

  // Re-populate table with filtered devices
  const tableBody = document.querySelector("#firmwareTableBody");
  tableBody.innerHTML = "";
  filteredDevices.forEach(device => {
    const row = document.createElement("tr");
    // ...existing code for row rendering...
    // Check if the device needs update
    const needsUpdate = device.version !== (device.latest_version || (device.version));
    if (needsUpdate) row.classList.add("needs-update");
    const connectionStatus = device.is_connected 
      ? '<span class="connection-status connection-online"><span class="connection-dot"></span>Online</span>'
      : '<span class="connection-status connection-offline"><span class="connection-dot"></span>Offline</span>';
    const warningStatus = device.warning === "None" || !device.warning
      ? '<span class="warning-indicator warning-none">None</span>'
      : `<span class="warning-indicator warning-${device.warning.toLowerCase()}">${device.warning}</span>`;
    let statusBadge;
    if (device.status === "done") {
      statusBadge = '<span class="status-badge status-up-to-date">Done</span>';
    } else if (device.status === "failed") {
      statusBadge = '<span class="status-badge status-outdated">Failed</span>';
    } else if (device.status === "waiting") {
      statusBadge = '<span class="status-badge status-update-available">Waiting</span>';
    } else {
      statusBadge = device.status;
    }

    row.innerHTML = `
      <td><input type="checkbox" class="device-checkbox" data-device-id="${device.device_id}"></td>
      <td data-label="ID">${device.device_id}</td>
      <td data-label="Name">${device.name}</td>
      <td data-label="Location">${device.location}</td>
      <td data-label="Current Version">${device.version}</td>
      <td data-label="Latest Version">${device.latest_version || 'N/A'}</td>
      <td data-label="Is Connected">${connectionStatus}</td>
      <td data-label="Warning">${warningStatus}</td>
      <td data-label="Status">${statusBadge}</td>
      <td data-label="Actions">
        <button class="table-action-btn edit-btn" data-device-id="${device.device_id}" data-device-name=" title="Edit Device">
          Edit
        </button>
        <button class="table-action-btn update-btn" data-device-id="${device.device_id}" title="Update Device">
          Update
        </button>
        <button class="table-action-btn delete-btn" data-device-id="${device.device_id}" title="Delete Device">
          Delete
        </button>
      </td> 
    `;
    tableBody.appendChild(row);
  });
  updateCheckboxListeners();
}

// Function to setup modal event listeners
function setupModalEventListeners(modal) {
  if (!modal) return;

  // Handle close button click
  const closeButton = modal.querySelector('.modal-close');
  if (closeButton) {
    closeButton.addEventListener('click', closeEditDeviceForm);
  }

  // Handle cancel button click
  const cancelButton = modal.querySelector('.cancel-btn');
  if (cancelButton) {
    cancelButton.addEventListener('click', closeEditDeviceForm);
  }

  const closeOptionalModal = modal.querySelector('.close-optional-modal');
  if (closeOptionalModal) {
    closeOptionalModal.addEventListener('click', closeEditDeviceForm);
  }

  // Handle form submission
  const form = modal.querySelector('#editDeviceFormNew');
  if (form) {
    form.addEventListener('submit', submitEditDeviceForm);
  }

  // Handle clicking outside modal to close
  modal.addEventListener('click', function(event) {
    if (event.target === modal) {
      closeEditDeviceForm();
    }
  });

  // Prevent clicks inside modal content from bubbling up
  const modalContent = modal.querySelector('.edit-form-modal');
  if (modalContent) {
    modalContent.addEventListener('click', function(event) {
      event.stopPropagation();
    });
  }
}

// Helper function to set modal loading state
function setModalLoadingState(modal, isLoading) {
  if (!modal) return;
  
  const formInputs = modal.querySelectorAll('input:not([type="hidden"]), select, textarea');
  const submitButton = modal.querySelector('button[type="submit"]');
  const cancelButton = modal.querySelector('button[type="button"], .cancel-btn');
  
  if (isLoading) {
    // Set loading state
    formInputs.forEach(input => {
      input.disabled = true;
      if (input.id !== 'editDeviceId') { // Don't change device ID field
        if (input.tagName === 'SELECT') {
          // For select fields, add a loading option
          const loadingOption = document.createElement('option');
          loadingOption.value = '';
          loadingOption.textContent = 'Loading...';
          loadingOption.disabled = true;
          loadingOption.selected = true;
          input.innerHTML = '';
          input.appendChild(loadingOption);
        } else {
          // For input fields
          input.value = 'Loading...';
          input.style.fontStyle = 'italic';
          input.style.color = '#6b7280';
        }
      }
    });
    
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="loading-spinner"></span> Loading...';
    }
    
    // Keep cancel button enabled
    if (cancelButton) {
      cancelButton.disabled = false;
    }
  } else {
    // Clear loading state
    formInputs.forEach(input => {
      input.disabled = false;
      if (input.tagName === 'SELECT') {
        // For select fields, we'll repopulate them with proper options
        // This will be handled by the populate function
      } else {
        input.style.fontStyle = '';
        input.style.color = '';
      }
    });
    
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Save Changes';
    }
  }
}

// Enhanced modal error handling
function showModalError(modal, message) {
  if (!modal) return;
  
  // Remove existing modal errors
  const existingErrors = modal.querySelectorAll('.modal-error-message');
  existingErrors.forEach(error => error.remove());
  
  // Create new error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'modal-error-message';
  errorDiv.innerHTML = `
    <span class="error-icon">❌</span>
    <span class="error-text">${message}</span>
  `;
  
  // Insert at the top of modal content
  const modalContent = modal.querySelector('.modal-content') || modal.querySelector('.modal-body') || modal;
  modalContent.insertBefore(errorDiv, modalContent.firstChild);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}

// Enhanced device data validation
function validateDeviceData(device) {
  const errors = [];
  
  if (!device) {
    errors.push('Device data is missing');
    return errors;
  }
  
  if (!device.device_id) {
    errors.push('Device ID is missing');
  }
  
  if (!device.name || device.name.trim().length === 0) {
    errors.push('Device name is missing');
  }
  
  if (!device.version) {
    errors.push('Device version is missing');
  }
  
  return errors;
}

// Toast notification system for better UX
function createToast(message, type = 'info', duration = 4000) {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✅' : 
               type === 'error' ? '❌' : 
               type === 'warning' ? '⚠️' : 'ℹ️';
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  // Add to container
  toastContainer.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);

  return toast;
}

// Function to clear filters
async function clearFilters() {
  document.getElementById('locationFilter').value = '';
  await populateDeviceTable();
}

// Function to handle bulk update
async function handleBulkUpdate() {
  const selectedCheckboxes = document.querySelectorAll('.device-checkbox:checked');
  const bulkUpdateButton = document.getElementById('bulkUpdateButton');
  
  if (selectedCheckboxes.length === 0) {
    showErrorMessage('No devices selected for update.');
    createToast('Please select at least one device to update.', 'warning', 4000);
    return;
  }

  // Get device IDs and validate
  const deviceIds = Array.from(selectedCheckboxes).map(checkbox => checkbox.getAttribute('data-device-id')).filter(id => id);
  
  if (deviceIds.length === 0) {
    showErrorMessage('Invalid device selection. Please try again.');
    createToast('Invalid device selection.', 'error', 4000);
    return;
  }

  // Confirm bulk update
  const confirmMessage = `Are you sure you want to update ${deviceIds.length} selected device${deviceIds.length !== 1 ? 's' : ''}?`;
  if (!confirm(confirmMessage)) {
    return;
  }

  // Set loading state
  bulkUpdateButton.disabled = true;
  bulkUpdateButton.innerHTML = '<span class="update-icon">⏳</span>Updating...';
  bulkUpdateButton.style.opacity = '0.7';

  try {
    // Show loading toast
    const loadingToast = createToast(`Updating ${deviceIds.length} device${deviceIds.length !== 1 ? 's' : ''}...`, 'info', 15000);
    
    // Call update API
    const response = await updateDevice(deviceIds);
    
    // Remove loading toast
    if (loadingToast && loadingToast.parentElement) {
      loadingToast.remove();
    }
    
    if (!response || response.error) {
      throw new Error(response?.error || 'Bulk update failed');
    }
    
    // Success - update UI
    bulkUpdateButton.innerHTML = '<span class="update-icon">✅</span>Updated Successfully!';
    bulkUpdateButton.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    bulkUpdateButton.style.opacity = '1';

    // Mark rows as updated and uncheck them
    selectedCheckboxes.forEach(checkbox => {
      const row = checkbox.closest('tr');
      if (row) {
        row.classList.remove('needs-update');
        // Add visual feedback for updated row
        row.style.backgroundColor = '#f0fdf4';
        setTimeout(() => {
          row.style.backgroundColor = '';
        }, 3000);
      }
      checkbox.checked = false;
    });

    // Show success message
    const deviceCount = deviceIds.length;
    showSuccessMessage(`${deviceCount} device${deviceCount !== 1 ? 's' : ''} updated successfully!`);
    createToast(`${deviceCount} device${deviceCount !== 1 ? 's' : ''} updated successfully!`, 'success', 5000);

    // Reset selection UI
    document.getElementById('selectedCount').textContent = '0 devices selected';
    document.getElementById('selectAll').checked = false;
    document.getElementById('selectAll').indeterminate = false;

    // Reset button after animation and refresh table
    setTimeout(async () => {
      bulkUpdateButton.innerHTML = '<span class="update-icon">🔄</span>Update Selected Devices';
      bulkUpdateButton.style.background = '';
      bulkUpdateButton.style.opacity = '';
      bulkUpdateButton.disabled = true; // Keep disabled until new selection
      
      // Refresh the table to show updated statuses
      await populateDeviceTable();
    }, 3000);

  } catch (error) {
    // Reset button state
    bulkUpdateButton.disabled = false;
    bulkUpdateButton.innerHTML = '<span class="update-icon">🔄</span>Update Selected Devices';
    bulkUpdateButton.style.background = '';
    bulkUpdateButton.style.opacity = '';
    
    // Show error message
    let errorMessage = 'Failed to update selected devices. ';
    if (error.message.includes('timeout')) {
      errorMessage += 'The request timed out. Please try again.';
    } else if (error.message.includes('Network')) {
      errorMessage += 'Network error. Please check your connection.';
    } else {
      errorMessage += error.message || 'Please try again.';
    }
    
    showErrorMessage(errorMessage);
    createToast(errorMessage, 'error', 6000);
  }
}

// Function to handle single device update
async function handleSingleDeviceUpdate(deviceId) {
  // Get device info
  const data = await getDeviceList();
  const device = data && data.devices ? data.devices.find(d => d.device_id === deviceId) : null;
  if (!device) {
    showErrorMessage('Device not found!');
    return;
  }

  // Show choose version modal instead of direct update
  await showChooseVersionModal(device);
}

// Function to handle single device delete
async function handleSingleDeviceDelete(deviceId) {
  // Get device information for confirmation
  const row = document.querySelector(`[data-device-id="${deviceId}"]`)?.closest('tr');
  if (!row) {
    showErrorMessage('Device not found in the table.');
    return;
  }
  
  const deviceNameCell = row.querySelector('td[data-label="Name"]');
  const deviceName = deviceNameCell ? deviceNameCell.textContent.trim() : `Device ${deviceId}`;

  // Enhanced confirmation dialog
  const confirmMessage = `⚠️ Delete Device Confirmation\n\nDevice: "${deviceName}"\nID: ${deviceId}\n\nThis action cannot be undone. Are you sure you want to proceed?`;
  if (!confirm(confirmMessage)) {
    return;
  }

  // Add visual feedback to all delete buttons for this device (if multiple exist)
  const allDeleteButtons = document.querySelectorAll(`[data-device-id="${deviceId}"].delete-btn`);
  if (allDeleteButtons.length > 0) {
    allDeleteButtons.forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner" style="margin-right:4px;"></span>Deleting...';
      btn.style.background = 'linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)';
      btn.style.cursor = 'not-allowed';
      btn.style.opacity = '0.7';
    });
  }

  // Add row-level visual feedback
  if (row) {
    row.style.opacity = '0.6';
    row.style.transition = 'opacity 0.3s ease';
  }

  try {
    // Call the delete API with timeout
    const deletePromise = deleteDevice(deviceId);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 15000)
    );
    
    const result = await Promise.race([deletePromise, timeoutPromise]);
    
    // Validate API response
    if (!result) {
      throw new Error('No response from server');
    }
    
    if (result.error) {
      throw new Error(result.error || 'Delete operation failed');
    }
    
    if (result.message || result.success !== false) {
      // Success - animate row removal
      if (row) {
        row.style.transform = 'translateX(-100%)';
        row.style.opacity = '0';
        setTimeout(() => {
          if (row.parentNode) {
            row.remove();
          }
          updateDeviceCount();
          showSuccessMessage(`Device "${deviceName}" has been successfully deleted!`);
          createToast(`Device "${deviceName}" deleted successfully!`, 'success');
        }, 300);
      } else {
        showSuccessMessage(`Device "${deviceName}" has been successfully deleted!`);
        createToast(`Device "${deviceName}" deleted successfully!`, 'success');
        await populateDeviceTable();
      }
    } else {
      throw new Error('Unexpected response from server');
    }
    
  } catch (error) {
    // Reset row appearance
    if (row) {
      row.style.opacity = '';
      row.style.transition = '';
      row.style.transform = '';
    }
    // Reset button state with better error handling
    if (allDeleteButtons.length > 0) {
      allDeleteButtons.forEach(btn => {
        btn.disabled = false;
        btn.innerHTML = '<span class="delete-icon" style="margin-right:4px;">🗑️</span>Delete';
        btn.style.background = 'linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)';
        btn.style.cursor = '';
        btn.style.opacity = '';
      });
    }
    // Show appropriate error message
    let errorMessage = 'Failed to delete device. ';
    if (error.message === 'Request timeout') {
      errorMessage += 'The request timed out. Please check your connection and try again.';
    } else if (error.message === 'No response from server') {
      errorMessage += 'No response from server. Please try again later.';
    } else if (error.message.includes('Network')) {
      errorMessage += 'Network error. Please check your connection.';
    } else {
      errorMessage += error.message || 'Please try again.';
    }
    showErrorMessage(errorMessage);
    createToast(errorMessage, 'error', 6000);
  }
}

// Helper function to update device count display
function updateDeviceCount() {
  const deviceRows = document.querySelectorAll('#firmwareTableBody tr');
  const deviceCountElement = document.querySelector('.device-count');
  if (deviceCountElement) {
    const count = deviceRows.length;
    deviceCountElement.textContent = `${count} device${count !== 1 ? 's' : ''}`;
  }
}

// Enhanced error message function
function showErrorMessage(message) {
  const existingMessage = document.querySelector('.error-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.innerHTML = `
    <span class="error-icon">❌</span>
    ${message}
  `;
  
  // Insert after the action buttons container
  const buttonContainer = document.querySelector('.action-buttons-container');
  if (buttonContainer) {
    buttonContainer.parentNode.insertBefore(errorDiv, buttonContainer.nextSibling);
  } else {
    // Fallback to body if container not found
    document.body.appendChild(errorDiv);
  }
  
  // Remove message after 5 seconds (longer than success message)
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}



// Function to handle editing a device
async function handleEditDevice(deviceId) {
  try {
    // Validate device ID
    if (!deviceId) {
      showErrorMessage('Invalid device ID provided.');
      createToast('Invalid device ID provided.', 'error');
      return;
    }

    // Get device data first
    const data = await getDeviceList();
    if (!data || !data.devices) {
      throw new Error('Unable to fetch device list');
    }

    const device = data.devices.find(d => d.device_id === deviceId);
    if (!device) {
      throw new Error(`Device with ID "${deviceId}" not found`);
    }

    // Create and show edit form modal
    showEditDeviceForm(device);

  } catch (error) {
    let errorMessage = 'Failed to load device information. ';
    if (error.message.includes('not found')) {
      errorMessage += 'Device not found. It may have been deleted.';
    } else if (error.message.includes('fetch device list')) {
      errorMessage += 'Unable to connect to server.';
    } else {
      errorMessage += error.message || 'Please try again.';
    }
    
    showErrorMessage(errorMessage);
    createToast(errorMessage, 'error', 6000);
  }
}

// Function to show edit device form
async function showEditDeviceForm(device) {
  // Remove existing form if any
  const existingForm = document.getElementById('editDeviceFormModal');
  if (existingForm) {
    existingForm.remove();
  }
  
  let data = await getVersionsList();
  const deviceList = Object.keys(data);

  // Create form modal HTML
  const formModalHTML = `
    <div id="editDeviceFormModal" class="modal-overlay">
      <div class="modal-content edit-form-modal">
        <div class="modal-header">
          <h3>Edit Device</h3>
          <button type="button" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="editDeviceFormNew">
            <input type="hidden" id="editFormDeviceId" value="${device.device_id}">
            
            <div class="form-group">
              <label for="editFormDeviceName">Device Name <span class="required">*</span></label>
              <select id="editFormDeviceName" name="deviceName" required>
                ${deviceList.map(deviceName => `
                  <option value="${deviceName}" ${deviceName === device.name ? 'selected' : ''}>
                    ${deviceName}
                  </option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label for="editFormDeviceLocation">Location</label>
              <input type="text" id="editFormDeviceLocation" name="deviceLocation" value="${device.location || ''}">
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // Add form to body
  document.body.insertAdjacentHTML('beforeend', formModalHTML);
  
  // Show modal
  const modal = document.getElementById('editDeviceFormModal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  // Add event listeners for modal interactions
  setupModalEventListeners(modal);

  // Add CSS styles if not already added
  addEditFormStyles();
}

// Function to close edit device form
function closeEditDeviceForm() {
  const modal = document.getElementById('editDeviceFormModal');
  if (modal) {
    modal.remove();
  }
  document.body.style.overflow = 'auto';
}

// Function to submit edit device form
async function submitEditDeviceForm(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const data = await getVersionsList();
  
  // Get form values
  const deviceId = document.getElementById('editFormDeviceId').value;
  const deviceName = formData.get('deviceName');
  const deviceLocation = formData.get('deviceLocation') || '';
  const deviceVersion = data[deviceName][0].version; // Get the first version for the selected device name
  
  // Validate inputs
  if (!deviceName) {
    createToast('Device name is required.', 'error');
    return;
  }

  // Set loading state
  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="loading-spinner"></span> Updating...';

  try {
    // Create loading toast
    const loadingToast = createToast('Updating device...', 'info', 10000);

    // Call update API
    const updateData = await updateDeviceInfo({
      device_id: deviceId,
      name: deviceName,
      location: deviceLocation,
      version: deviceVersion
    });

    // Remove loading toast
    if (loadingToast && loadingToast.parentElement) {
      loadingToast.remove();
    }

    if (updateData && !updateData.error) {
      // Close form
      closeEditDeviceForm();
      
      // Refresh the table
      await populateDeviceTable();
      
      // Show success message
      showSuccessMessage(`Device "${deviceName}" has been updated successfully!`);
      createToast(`Device "${deviceName}" updated successfully!`, 'success');
    } else {
      throw new Error(updateData?.error || 'Update failed');
    }

  } catch (error) {
    let errorMessage = 'Failed to update device. ';
    if (error.message.includes('not found')) {
      errorMessage += 'Device not found. It may have been deleted.';
    } else {
      errorMessage += error.message || 'Please try again.';
    }
    
    createToast(errorMessage, 'error', 6000);
    
    // Reset button s
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
}

// Function to add CSS styles for the edit form
function addEditFormStyles() {
  // Check if styles already exist
  if (document.getElementById('editFormStyles')) {
    return;
  }

  const styles = `
    <style id="editFormStyles">
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      }
      
      .edit-form-modal {
        background: white;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
      }
      
      .modal-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #6b7280;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      }
      
      .modal-close:hover {
        background: #f3f4f6;
        color: #374151;
      }
      
      .modal-body {
        padding: 24px;
      }
      
      .form-group {
        margin-bottom: 20px;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        color: #374151;
        font-size: 14px;
      }
      
      .required {
        color: #ef4444;
      }
      
      .form-group input,
      .form-group select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }
      
      .form-group input:focus,
      .form-group select:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
      }
      
      .btn {
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      
      .btn-secondary {
        background: #f3f4f6;
        color: #374151;
      }
      
      .btn-secondary:hover {
        background: #e5e7eb;
      }
      
      .btn-primary {
        background: #3b82f6;
        color: white;
      }
      
      .btn-primary:hover {
        background: #2563eb;
      }
      
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .loading-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    </style>
  `;

  document.head.insertAdjacentHTML('beforeend', styles);
}

// Function to show success message
function showSuccessMessage(message) {
  const existingMessage = document.querySelector('.success-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.innerHTML = `
    <span class="success-icon">✅</span>
    ${message}
  `;
  
  // Insert after the action buttons container
  const buttonContainer = document.querySelector('.action-buttons-container');
  if (buttonContainer) {
    buttonContainer.parentNode.insertBefore(successDiv, buttonContainer.nextSibling);
  } else {
    // Fallback to body if container not found
    document.body.appendChild(successDiv);
  }
  
  // Remove message after 3 seconds
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

// Logout functionality
function handleLogout() {
  // Confirm logout action
  const confirmLogout = confirm('Are you sure you want to logout?');
  
  if (confirmLogout) {
    // Clear any session data if needed
    localStorage.removeItem('userSession');
    sessionStorage.clear();
    
    // Show logout message
    showSuccessMessage('Logged out successfully. Redirecting to login page...');
    
    // Redirect to login page after a short delay
    setTimeout(() => {
      window.location.href = '../login/login.html';
    }, 1500);
  }
}

// Account information management
let currentUser = null;

// Function to load user account information
async function loadAccountInfo() {
  const response = await getInfo();
  if (!response || response.error) {
    return;
  }
  
  updateAccountDisplay({
    id: response.user.id,
    name: response.user.name || 'Not available',
    role: response.user.role || 'user',
  }); 
}

// Function to update account display with user data
function updateAccountDisplay(userData) {
  const userIdElement = document.getElementById('userId');
  const userFullNameElement = document.getElementById('userFullName');
  const userRoleElement = document.getElementById('userRole');
  
  // Update User ID section with copy button
  if (userIdElement) {
    const userId = userData.id || 'Not available';
    userIdElement.innerHTML = `
      <span class="user-id-text">${userId}</span>
      ${userId !== 'Not available' && userId !== 'Loading...' ? 
        '<button class="copy-btn" title="Copy User ID">📋</button>' : 
        ''
      }
    `;
    // Store the userId for the copy function
    userIdElement.setAttribute('data-user-id', userId);
    
    // Add event listener to copy button if it exists
    const copyBtn = userIdElement.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', copyUserId);
    }
  }
  
  // Update Full Name section
  if (userFullNameElement) {
    userFullNameElement.textContent = userData.name || 'Not available';
  }
  
  // Update User Role section with appropriate styling
  if (userRoleElement) {
    const role = userData.role || 'user';
    userRoleElement.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    
    // Add role-specific styling
    userRoleElement.className = 'account-value role-badge';
    if (role === 'admin') {
      userRoleElement.classList.add('role-admin');
    } else if (role === 'manager') {
      userRoleElement.classList.add('role-manager');
    } else {
      userRoleElement.classList.add('role-user');
    }
  }
}

// Function to copy user ID to clipboard
async function copyUserId() {
  try {
    const userIdElement = document.getElementById('userId');
    if (!userIdElement) {
      createToast('User ID element not found', 'error');
      return;
    }
    
    const userId = userIdElement.getAttribute('data-user-id');
    
    if (!userId || userId === 'Not available' || userId === 'Loading...' || userId.trim() === '') {
      createToast('No valid User ID to copy', 'warning');
      return;
    }
    
    // Try to copy to clipboard
    if (navigator.clipboard && window.isSecureContext) {
      // Use modern clipboard API
      try {
        await navigator.clipboard.writeText(userId);
        createToast('User ID copied to clipboard!', 'success');
        showCopyFeedback('Copied!', true);
      } catch (err) {
        createToast('Clipboard API failed, using fallback', 'warning');
        fallbackCopyToClipboard(userId);
      }
    } else {
      // Fallback for older browsers or insecure contexts
      createToast('Using fallback copy method', 'info');
      fallbackCopyToClipboard(userId);
    }
  } catch (error) {
    createToast('Error in copy function: ' + error.message, 'error');
    // Try fallback as last resort
    const userIdElement = document.getElementById('userId');
    const userId = userIdElement ? userIdElement.getAttribute('data-user-id') : null;
    if (userId) {
      fallbackCopyToClipboard(userId);
    }
  }
}

// Function to show copy feedback
function showCopyFeedback(message, success) {
  const copyBtn = document.querySelector('.copy-btn');
  if (!copyBtn) return;
  
  const originalText = copyBtn.innerHTML;
  const originalTitle = copyBtn.title;
  
  // Update button appearance
  copyBtn.innerHTML = success ? '✅' : '❌';
  copyBtn.title = message;
  copyBtn.style.color = success ? '#10b981' : '#ef4444';
  
  // Create and show tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'copy-tooltip';
  tooltip.textContent = message;
  tooltip.style.cssText = `
    position: absolute;
    background: ${success ? '#065f46' : '#991b1b'};
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    top: -30px;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.2s;
  `;
  
  copyBtn.style.position = 'relative';
  copyBtn.appendChild(tooltip);
  
  // Animate tooltip
  setTimeout(() => {
    tooltip.style.opacity = '1';
  }, 10);
  
  // Reset after 2 seconds
  setTimeout(() => {
    if (tooltip.parentNode) {
      tooltip.style.opacity = '0';
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      }, 200);
    }
    copyBtn.innerHTML = originalText;
    copyBtn.title = originalTitle;
    copyBtn.style.color = '';
  }, 2000);
}

// Fallback copy function for older browsers
function fallbackCopyToClipboard(text) {
  try {
    // Create a temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    
    // Focus and select the text
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999); // For mobile devices
    
    // Try to copy
    const successful = document.execCommand('copy');
    
    // Clean up
    document.body.removeChild(textArea);
    
    if (successful) {
      createToast('User ID copied to clipboard!', 'success');
      showCopyFeedback('Copied!', true);
    } else {
      createToast('Failed to copy User ID - please copy manually: ' + text, 'error');
      showCopyFeedback('Failed', false);
    }
  } catch (err) {
    createToast('Copy failed - please copy manually: ' + text, 'error');
    showCopyFeedback('Failed', false);
  }
}

// Function to toggle account info visibility
function toggleAccountInfo() {
  const content = document.getElementById('accountInfoContent');
  const toggleBtn = document.getElementById('toggleAccountInfo');
  const icon = toggleBtn.querySelector('.toggle-icon');
  
  if (content.classList.contains('active')) {
    content.classList.remove('active');
    toggleBtn.classList.remove('active');
    icon.textContent = '▶';
  } else {
    content.classList.add('active');
    toggleBtn.classList.add('active');
    icon.textContent = '▼';
  }
}

// Main initialization
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize account information
  await loadAccountInfo();
  
  // Make account info visible by default
  const accountContent = document.getElementById('accountInfoContent');
  const toggleBtn = document.getElementById('toggleAccountInfo');
  const icon = toggleBtn.querySelector('.toggle-icon');
  
  accountContent.classList.add('active');
  toggleBtn.classList.add('active');
  icon.textContent = '▼';
  
  // Account info toggle event listener
  const toggleAccountInfoBtn = document.getElementById('toggleAccountInfo');
  if (toggleAccountInfoBtn) {
    toggleAccountInfoBtn.addEventListener('click', toggleAccountInfo);
  }
  
  const refreshButton = document.querySelector("#refreshButton");
  if (refreshButton) {
    refreshButton.addEventListener("click", handleRefreshButtonClick);
  }

  // Logout button event listener
  const logoutButton = document.querySelector("#logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }

  // Filter event listeners
  const applyFilterButton = document.getElementById('applyFilterButton');
  if (applyFilterButton) {
    applyFilterButton.addEventListener('click', applyFilters);
  }

  const clearFilterButton = document.getElementById('clearFilterButton');
  if (clearFilterButton) {
    clearFilterButton.addEventListener('click', clearFilters);
  }
  
  // Bulk update event listener
  const bulkUpdateButton = document.getElementById('bulkUpdateButton');
  if (bulkUpdateButton) {
    bulkUpdateButton.addEventListener('click', handleBulkUpdate);
  }
  
  // Optional version update event listener
  const bulkUpdateOptionalButton = document.getElementById('bulkUpdateOptionalButton');
  if (bulkUpdateOptionalButton) {
    bulkUpdateOptionalButton.addEventListener('click', handleOptionalVersionUpdate);
  }
  
  // Event delegation for table action buttons
  document.addEventListener('click', function(event) {
    if (event.target.closest('.edit-btn')) {
      const button = event.target.closest('.edit-btn');
      const deviceId = button.getAttribute('data-device-id');
      handleEditDevice(deviceId);
    }
    
    if (event.target.closest('.update-btn')) {
      const button = event.target.closest('.update-btn');
      const deviceId = button.getAttribute('data-device-id');
      handleSingleDeviceUpdate(deviceId);
    }
    
    if (event.target.closest('.delete-btn')) {
      const button = event.target.closest('.delete-btn');
      const deviceId = button.getAttribute('data-device-id');
      handleSingleDeviceDelete(deviceId);
    }
    
    // Handle optional version modal buttons
    if (event.target.id === 'applyOptionalUpdates') {
      handleApplyOptionalUpdates();
    }
    
    if (event.target.id === 'cancelOptionalUpdates') {
      const optionalVersionModal = document.getElementById('optionalVersionModal');
      if (optionalVersionModal) {
        hideModalWithAnimation(optionalVersionModal);
      }
    }
    
    // Handle close button for optional version modal
    if (event.target.id === 'closeOptionalModal') {
      const optionalVersionModal = document.getElementById('optionalVersionModal');
      if (optionalVersionModal) {
        hideModalWithAnimation(optionalVersionModal);
      }
    }
    
    // Handle clicking outside optional version modal to close
    if (event.target.id === 'optionalVersionModal') {
      hideModalWithAnimation(event.target);
    }
    
    // Handle choose version modal buttons
    if (event.target.id === 'confirmChooseVersion') {
      handleChooseVersionConfirm();
    }
    
    if (event.target.id === 'cancelChooseVersion') {
      closeChooseVersionModal();
    }
    
    // Handle close button for choose version modal
    if (event.target.id === 'closeChooseVersionModal') {
      closeChooseVersionModal();
    }
    
    // Handle clicking outside choose version modal to close
    if (event.target.id === 'chooseVersionModal') {
      closeChooseVersionModal();
    }
  });
  
  // Close modal on Escape key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      const editModal = document.getElementById('editDeviceFormModal');
      const optionalVersionModal = document.getElementById('optionalVersionModal');
      const chooseVersionModal = document.getElementById('chooseVersionModal');
      
      if (editModal && editModal.style.display === 'flex') {
        closeEditDeviceForm();
      } else if (optionalVersionModal && (optionalVersionModal.style.display === 'flex' || optionalVersionModal.classList.contains('show'))) {
        hideModalWithAnimation(optionalVersionModal);
      } else if (chooseVersionModal && (chooseVersionModal.style.display === 'flex' || chooseVersionModal.classList.contains('show'))) {
        closeChooseVersionModal();
      }
    }
  });

  // Initial population of the table
  await populateDeviceTable();
  
  // Start auto-reload functionality
  // startAutoReload();
});

// Auto-reload functionality
let autoReloadInterval = null;
let autoReloadEnabled = true;

// Function to start auto-reload
function startAutoReload() {
  if (autoReloadInterval) {
    clearInterval(autoReloadInterval);
  }
  
  autoReloadInterval = setInterval(async () => {
    if (autoReloadEnabled) {
      await populateDeviceTable();
    }
  }, 30000); // 30 seconds
}

// Function to stop auto-reload
function stopAutoReload() {
  if (autoReloadInterval) {
    clearInterval(autoReloadInterval);
    autoReloadInterval = null;
  }
}

// Function to toggle auto-reload
function toggleAutoReload() {
  autoReloadEnabled = !autoReloadEnabled;
  
  // Update UI if there's a toggle button
  const toggleBtn = document.getElementById('autoReloadToggle');
  if (toggleBtn) {
    toggleBtn.textContent = autoReloadEnabled ? 'Disable Auto-Reload' : 'Enable Auto-Reload';
    toggleBtn.style.background = autoReloadEnabled ? 
      'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 
      'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  }
}

// Cleanup when page is unloaded
window.addEventListener('beforeunload', () => {
  stopAutoReload();
});

// Pause auto-reload when page loses focus and resume when it gains focus
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    autoReloadEnabled = false;
  } else {
    autoReloadEnabled = true;
  }
});

// Start auto-reload on initial load
// startAutoReload();

// Function to handle optional version update
async function handleOptionalVersionUpdate() {
  const selectedCheckboxes = document.querySelectorAll('.device-checkbox:checked');
  
  if (selectedCheckboxes.length === 0) {
    showErrorMessage('No devices selected for update.');
    createToast('Please select at least one device to update.', 'warning', 4000);
    return;
  }

  // Get selected devices with their details
  const selectedDevices = Array.from(selectedCheckboxes).map(checkbox => {
    const row = checkbox.closest('tr');
    const deviceId = checkbox.getAttribute('data-device-id');
    const deviceName = row.querySelector('td:nth-child(3)')?.textContent?.trim();
    const currentVersion = row.querySelector('td:nth-child(4)')?.textContent?.trim();
    
    return {
      id: deviceId,
      name: deviceName,
      version: currentVersion
    };
  }).filter(device => device.id);

  if (selectedDevices.length === 0) {
    showErrorMessage('Invalid device selection. Please try again.');
    createToast('Invalid device selection.', 'error', 4000);
    return;
  }

  const response = await getVersionsList();

  // Group devices by name
  const deviceGroups = {};
  selectedDevices.forEach(device => {
    if (!deviceGroups[device.name]) {
      deviceGroups[device.name] = {
        name: device.name,
        count: 0,
        devices: [],
        currentVersions: response[device.name] ? new Set(response[device.name].map(v => v.version)) : new Set()
      };
    }
    deviceGroups[device.name].count++;
    deviceGroups[device.name].devices.push(device.id);
  });

  // Generate sections for the modal
  await generateOptionalVersionSections(deviceGroups);
  
  // Show the modal
  const optionalVersionModal = document.getElementById('optionalVersionModal');
  
  if (optionalVersionModal) {
    // Simple show first to test
    optionalVersionModal.style.display = 'flex';
    optionalVersionModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Then apply animation
    setTimeout(() => {
      showModalWithAnimation(optionalVersionModal);
    }, 100);
  } else {
    console.error('Optional version modal not found!');
  }
}

// Function to generate device sections for optional version modal
async function generateOptionalVersionSections(deviceGroups) {
  const sectionsContainer = document.getElementById('optionalVersionSections');
  if (!sectionsContainer) return;

  // Clear existing sections
  sectionsContainer.innerHTML = '';

  let listOfDeviceIds = {};

  // Create sections for each device group
  Object.values(deviceGroups).forEach((group, index) => {
    listOfDeviceIds[group.name] = group.devices;
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'device-section';
    sectionDiv.innerHTML = `  
      <div class="section-header">
        <div class="device-info">
          <h4 class="device-name">${group.name}</h4>
          <span class="device-count">${group.count} device${group.count !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div class="version-selector">
        <label for="version-select-${index}">Target Version:</label>
        <select id="version-select-${index}" class="version-select" data-group-name="${group.name}">
          <option value="">Select version...</option>
          ${Array.from(group.currentVersions).map(version => 
            `<option value="${version}">${version}</option>`
          ).join('')}
        </select>
      </div>
    `;

    sessionStorage.setItem('listOfDeviceIds', JSON.stringify(listOfDeviceIds));

    sectionsContainer.appendChild(sectionDiv);
  });
}

// Function to handle applying optional version updates
async function handleApplyOptionalUpdates() {
  const versionSelects = document.querySelectorAll('.version-select');
  const listOfDeviceIds = JSON.parse(sessionStorage.getItem('listOfDeviceIds')) || {};
  
  // Collect update plans from all sections
  versionSelects.forEach( async (select) => {
    const selectedVersion = select.value;
    const groupName = select.getAttribute('data-group-name');
    const groupDeviceId = listOfDeviceIds[groupName];

    if (!groupDeviceId) return;

    if (selectedVersion) {
      try {
        const response = await updateDeviceVersion(groupDeviceId, selectedVersion);
      }
      catch (error) {
        showErrorMessage(`Failed to update devices for ${groupName}: ${error.message}`);
        return;
      }
    }
  });

  // Hide the modal after applying updates
  const optionalVersionModal = document.getElementById('optionalVersionModal');
  if (optionalVersionModal) {
    hideModalWithAnimation(optionalVersionModal);
  }
  // Show success message
  showSuccessMessage('Optional version updates applied successfully!');
  createToast('Optional version updates applied successfully!', 'success', 4000);
  // Reset the session storage
  sessionStorage.removeItem('listOfDeviceIds');
  // Refresh the device table
  await populateDeviceTable();
}

// Modal animation helper functions
function showModalWithAnimation(modal) {
  if (!modal) {
    console.error('Modal element is null or undefined');
    return;
  }
  
  modal.style.display = 'flex';
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  
  // Add entrance animation
  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.style.transform = 'scale(0.7) translateY(-20px)';
    modalContent.style.opacity = '0';
    
    // Trigger animation
    setTimeout(() => {
      modalContent.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      modalContent.style.transform = 'scale(1) translateY(0)';
      modalContent.style.opacity = '1';
    }, 10);
  } else {
    console.warn('Modal content not found within modal');
  }
}

function hideModalWithAnimation(modal) {
  if (!modal) return;
  
  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    modalContent.style.transform = 'scale(0.7) translateY(-20px)';
    modalContent.style.opacity = '0';
    
    // Hide modal after animation
    setTimeout(() => {
      modal.style.display = 'none';
      modal.classList.remove('show');
      document.body.style.overflow = 'auto';
      
      // Reset transform for next time
      modalContent.style.transform = '';
      modalContent.style.opacity = '';
      modalContent.style.transition = '';
    }, 300);
  } else {
    // Fallback if no modal content found
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
  }
}

// Function to show choose version modal for single device update
async function showChooseVersionModal(device) {
  const modal = document.getElementById('chooseVersionModal');
  if (!modal) {
    console.error('Choose version modal not found!');
    return;
  }

  // Populate device information
  document.getElementById('chooseVersionDeviceName').textContent = device.name;
  document.getElementById('chooseVersionDeviceId').textContent = device.device_id;
  document.getElementById('chooseVersionCurrentVersion').textContent = device.version;

  // Get available versions for this device
  const versionsData = await getVersionsList();
  const deviceVersions = versionsData[device.name] || [];
  
  // Populate version select dropdown
  const versionSelect = document.getElementById('chooseVersionSelect');
  versionSelect.innerHTML = '<option value="">Select a version...</option>';
  
  deviceVersions.forEach(versionInfo => {
    const option = document.createElement('option');
    option.value = versionInfo.version;
    option.textContent = versionInfo.version;
    
    // Highlight current version
    if (versionInfo.version === device.version) {
      option.textContent += ' (Current)';
      option.style.fontWeight = 'bold';
      option.style.color = '#6c757d';
    }
    
    versionSelect.appendChild(option);
  });

  // Store device data for later use
  modal.setAttribute('data-device-id', device.device_id);
  modal.setAttribute('data-device-name', device.name);

  // Enable/disable confirm button based on selection
  const confirmButton = document.getElementById('confirmChooseVersion');
  const updateButtonState = () => {
    confirmButton.disabled = !versionSelect.value || versionSelect.value === device.version;
  };
  
  versionSelect.addEventListener('change', updateButtonState);
  updateButtonState(); // Initial state

  // Show modal with animation
  showModalWithAnimation(modal);
}

// Function to handle version selection confirmation
async function handleChooseVersionConfirm() {
  const modal = document.getElementById('chooseVersionModal');
  const deviceId = modal.getAttribute('data-device-id');
  const deviceName = modal.getAttribute('data-device-name');
  const selectedVersion = document.getElementById('chooseVersionSelect').value;

  if (!selectedVersion) {
    createToast('Please select a version to update to.', 'warning');
    return;
  }

  // Hide modal first
  hideModalWithAnimation(modal);

  // Confirm update
  const confirmMessage = `Are you sure you want to update device "${deviceName}" (ID: ${deviceId}) to version ${selectedVersion}?`;
  if (!confirm(confirmMessage)) {
    return;
  }

  // Find the update button for this device
  const updateButton = document.querySelector(`[data-device-id="${deviceId}"].update-btn`);
  if (updateButton) {
    updateButton.disabled = true;
    updateButton.textContent = 'Updating...';
    updateButton.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  }

  try {
    // Show loading toast
    const loadingToast = createToast(`Updating device "${deviceName}" to version ${selectedVersion}...`, 'info', 15000);
    
    // Call update API with specific version
    const response = await updateDeviceVersion([deviceId], selectedVersion);
    
    // Remove loading toast
    if (loadingToast && loadingToast.parentElement) {
      loadingToast.remove();
    }
    
    if (!response || response.error) {
      throw new Error(response?.error || 'Update failed');
    }

    // Success - update button appearance
    if (updateButton) {
      updateButton.textContent = 'Updated!';
      updateButton.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    }

    // Show success message
    showSuccessMessage(`Device "${deviceName}" updated to version ${selectedVersion} successfully!`);
    createToast(`Device "${deviceName}" updated to version ${selectedVersion}!`, 'success', 5000);

    // Reset button after animation and refresh table
    setTimeout(async () => {
      if (updateButton) {
        updateButton.disabled = false;
        updateButton.textContent = 'Update';
        updateButton.style.background = '';
      }
      
      // Refresh the table to show updated version
      await populateDeviceTable();
    }, 2000);

  } catch (error) {
    // Reset button state
    if (updateButton) {
      updateButton.disabled = false;
      updateButton.textContent = 'Update';
      updateButton.style.background = '';
    }
    
    // Show error message
    let errorMessage = `Failed to update device "${deviceName}". `;
    if (error.message.includes('timeout')) {
      errorMessage += 'The request timed out. Please try again.';
    } else if (error.message.includes('Network')) {
      errorMessage += 'Network error. Please check your connection.';
    } else {
      errorMessage += error.message || 'Please try again.';
    }
    
    showErrorMessage(errorMessage);
    createToast(errorMessage, 'error', 6000);
  }
}

// Function to close choose version modal
function closeChooseVersionModal() {
  const modal = document.getElementById('chooseVersionModal');
  if (modal) {
    hideModalWithAnimation(modal);
  }
}
