import axios from 'axios';

const BASE_URL = process.env.SMOKE_TEST_URL || 'http://localhost:3000';

// Create axios instance with defaults
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  validateStatus: () => true, // Don't throw on any status code
});

export interface ApiResponse<T = any> {
  response: {
    status: number;
    statusText: string;
    headers: any;
  };
  data: T;
}

/**
 * Make an API request using axios
 */
export async function apiRequest(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<ApiResponse> {
  const { method = 'GET', body, headers = {} } = options;
  
  try {
    const response = await api.request({
      url: path,
      method,
      data: body,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
    
    return {
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      },
      data: response.data,
    };
  } catch (error) {
    // Even if axios throws, return a response object
    if (axios.isAxiosError(error) && error.response) {
      return {
        response: {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
        },
        data: error.response.data,
      };
    }
    
    // Network or other error
    throw error;
  }
}

export { BASE_URL };