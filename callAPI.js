const URLAPI = "https://otawebsocket.onrender.com";

const useAPI = async ({method, endpoint, body, tokenNeed}) => {
  try {
    if (!method || !endpoint) {
      throw new Error('Method and endpoint are required');
    }

    // Check if body is FormData
    const isFormData = body instanceof FormData;

    const headers = {
      ...(tokenNeed ? { 'Authorization': `Bearer ${JSON.parse(sessionStorage.getItem('userToken'))}` } : {})
    };
    
    // Only set Content-Type for non-FormData requests
    // For FormData, let the browser set the Content-Type with boundary
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${URLAPI}${endpoint}`, {
      method: method,
      headers: headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : null),
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage += ` - ${errorData.message || errorData.error || 'Unknown error'}`;
      } catch (e) {
        // If response is not JSON, use the status text
        errorMessage += ` - ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error using API:', error);
    throw error;
  }
}

const loginToServer = async (userData) => {
  return useAPI({
    method: 'POST',
    endpoint: '/api/login',
    body: userData,
    tokenNeed: false
  });
}

const forgotPassword = async (userData) => {
  return useAPI({
    method: 'POST',
    endpoint: '/api/forgot-password',
    body: { email: userData },
    tokenNeed: true,
  });
}

const getInfo = async () => {
  return useAPI({
    method: 'GET',
    endpoint: '/api/me',
    body: null,
    tokenNeed: true
  });
}

const getDeviceList = async () => {
  return useAPI({
    method: 'GET',
    endpoint: '/api/my-devices',
    body: null,
    tokenNeed: true
  })
}

const getVersionsList = async () => {
  return useAPI({
    method: 'GET',
    endpoint: '/api/list-versions',
    body: null,
    tokenNeed: false
  })
}

const deleteDevice = async (deviceId) => {
  return useAPI({
    method: 'DELETE',
    endpoint: '/api/delete-device',
    body: { device_id: deviceId },
    tokenNeed: true
  })
}

const updateDeviceInfo = async (deviceInfo) => {
  return useAPI({
    method: 'POST',
    endpoint: '/api/update-device-info',
    body: deviceInfo,
    tokenNeed: true
  })
}

const updateDeviceVersion = async (deviceIds, versionInput) => {
  return useAPI({
    method: 'POST',
    endpoint: '/api/update-device-version',
    body: { device_ids: deviceIds, version: versionInput },
    tokenNeed: true
  })
}

const updateDevice = async (deviceIds) => {
  return useAPI({
    method: 'POST',
    endpoint: '/api/update-device',
    body: { device_ids: deviceIds },
    tokenNeed: false
  })
}

const deleteFirmware = async (deviceName, version) => {
  return useAPI({
    method: 'DELETE',
    endpoint: `/api/delete-version?device_name=${deviceName}&version=${version}`,
    body: null,
    tokenNeed: false
  });
}

const uploadFirmware = async (formData) => {
  return useAPI({
    method: 'POST',
    endpoint: '/api/upload-firmware',
    body: formData,
    need: false
  });
} 

const checkAuthentication = () => {
  const userToken = sessionStorage.getItem('userToken');
  const userInfo = sessionStorage.getItem('userInfo');
  
  console.log('Upload page - checking authentication:', { 
    userToken: !!userToken, 
    userInfo: !!userInfo 
  });
  
  if (!userToken || !userInfo) {
    console.log('No user session found, redirecting to login');
    window.location.href = '../login/login.html';
    return false;
  }
  
  try {
    const user = JSON.parse(userInfo);
    if (user && user.user && user.user.role) {
      const userRole = user.user.role;
      console.log('User role:', userRole);
      
      // Check if user has admin role (technician role)
      if (userRole !== 'admin') {
        console.log('User role is not admin, redirecting to customer page');
        window.location.href = '../customer/customer.html';
        return false;
      }
      
      return true;
    } else {
      console.warn('Invalid user info structure');
      window.location.href = '../login/login.html';
      return false;
    }
  } catch (error) {
    console.error('Error parsing user info:', error);
    window.location.href = '../login/login.html';
    return false;
  }
}

export {
  loginToServer,
  forgotPassword,
  getInfo,
  getDeviceList,
  getVersionsList,
  deleteDevice,
  updateDeviceInfo,
  updateDeviceVersion,
  updateDevice,
  deleteFirmware,
  checkAuthentication,
  uploadFirmware
};