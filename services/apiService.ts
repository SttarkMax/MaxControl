import { API_BASE_URL } from '../config';

const getToken = () => {
    try {
        const token = localStorage.getItem('authToken');
        return token;
    } catch (e) {
        return null;
    }
};

const request = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  // Using the Headers class is the correct way to handle the HeadersInit type.
  const headers = new Headers(options.headers);

  // Set default Content-Type only if there's a body and it's not already set.
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers, // Use the constructed Headers object
    });

    if (response.status === 204) { // No Content
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'An API error occurred');
    }

    return data;
  } catch (error) {
    console.error('API Service Error:', error);
    // Re-throw the error to be caught by the calling function
    throw error;
  }
};

export const api = {
  get: (endpoint: string) => request(endpoint),
  post: (endpoint: string, body: any) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint: string, body: any) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint: string) => request(endpoint, { method: 'DELETE' }),
};
