const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:5000/api/v1').replace(/\/$/, '');

module.exports = { API_BASE };
