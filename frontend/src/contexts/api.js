import axios from 'axios';
import { getAuthHeader } from './AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Products
export const getProducts = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.search) params.append('search', filters.search);
  if (filters.low_stock) params.append('low_stock', 'true');
  
  const response = await axios.get(`${API}/products?${params}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const getProduct = async (id) => {
  const response = await axios.get(`${API}/products/${id}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const createProduct = async (product) => {
  const response = await axios.post(`${API}/products`, product, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const updateProduct = async (id, product) => {
  const response = await axios.put(`${API}/products/${id}`, product, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await axios.delete(`${API}/products/${id}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

// Categories
export const getCategories = async () => {
  const response = await axios.get(`${API}/categories`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const createCategory = async (category) => {
  const response = await axios.post(`${API}/categories`, category, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await axios.delete(`${API}/categories/${id}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

// Stats & Reports
export const getStats = async () => {
  const response = await axios.get(`${API}/stats`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const getLowStockReport = async () => {
  const response = await axios.get(`${API}/reports/low-stock`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const getActivityLogs = async (limit = 100) => {
  const response = await axios.get(`${API}/reports/activity-logs?limit=${limit}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const getInventoryReport = async () => {
  const response = await axios.get(`${API}/reports/inventory`, {
    headers: getAuthHeader()
  });
  return response.data;
};

// Upload
export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${API}/upload`, formData, {
    headers: {
      ...getAuthHeader(),
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

// Admins
export const getAdmins = async () => {
  const response = await axios.get(`${API}/admins`, {
    headers: getAuthHeader()
  });
  return response.data;
};