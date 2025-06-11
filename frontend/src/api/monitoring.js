// frontend/src/api/monitoring.js
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('jwtToken'); // Get token from localStorage
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper for handling responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const fetchUrls = async () => {
  const response = await fetch(`${API_BASE_URL}/monitor/urls`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });
  const data = await handleResponse(response);
  // The backend now returns the array directly under 'data'
  return data.data; // Return the array of URLs
};

export const addUrl = async (urlData) => {
  const response = await fetch(`${API_BASE_URL}/monitor/urls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(urlData),
  });
  return handleResponse(response);
};

export const updateUrl = async (id, urlData) => {
  const response = await fetch(`${API_BASE_URL}/monitor/urls/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(urlData),
  });
  return handleResponse(response);
};

export const deleteUrl = async (id) => {
  const response = await fetch(`${API_BASE_URL}/monitor/urls/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });
  return handleResponse(response);
};

export const fetchMonitoringLogs = async (urlId, limit = 100) => {
  const response = await fetch(`${API_BASE_URL}/monitor/urls/${urlId}/logs?limit=${limit}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });
  return handleResponse(response);
};

export const fetchCertificateInfo = async (urlId) => {
  const response = await fetch(`${API_BASE_URL}/monitor/urls/${urlId}/certificate`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });
  return handleResponse(response);
};

// Add functions for proxy and alert configs here
export const fetchProxyConfigs = async () => {
    const response = await fetch(`${API_BASE_URL}/monitor/proxy-configs`, {
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
    });
    const data = await handleResponse(response);
    return data.data.proxyConfigs; // Assuming backend returns { data: { proxyConfigs: [] } }
};

export const addProxyConfig = async (configData) => {
    const response = await fetch(`${API_BASE_URL}/monitor/proxy-configs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(configData),
    });
    return handleResponse(response);
};

export const updateProxyConfig = async (id, configData) => {
    const response = await fetch(`${API_BASE_URL}/monitor/proxy-configs/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(configData),
    });
    return handleResponse(response);
};

export const deleteProxyConfig = async (id) => {
    const response = await fetch(`${API_BASE_URL}/monitor/proxy-configs/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
    });
    return handleResponse(response);
};

export const fetchAlertConfig = async () => {
    const response = await fetch(`${API_BASE_URL}/alerts/config`, {
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
    });
    return handleResponse(response);
};

export const saveAlertConfig = async (configData) => {
    const response = await fetch(`${API_BASE_URL}/alerts/config`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(configData),
    });
    return handleResponse(response);
};
