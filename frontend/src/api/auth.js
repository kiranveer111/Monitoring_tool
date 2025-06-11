// frontend/src/api/auth.js
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

// Helper to get authorization headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('jwtToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Helper for consistent API response handling
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json();
    // Throw error with backend message if available, otherwise generic
    throw new Error(errorData.message || 'Something went wrong on the server.');
  }
  return response.json();
};

export const register = async (username, email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password }),
  });
  return handleResponse(response);
};

export const login = async (username, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
  const data = await handleResponse(response);
  // Store token upon successful login
  if (data.token) {
    localStorage.setItem('jwtToken', data.token);
  }
  return data;
};

export const getMe = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(), // Include authorization header
    },
  });
  return handleResponse(response);
};

// You can add more auth-related API calls here if needed (e.g., forgot password, reset password)
