const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:5000/api/v1').replace(/\/$/, '');

export default {
  expo: {
    name: 'Dropboxz',
    slug: 'dropboxz',
    version: '2.0.0',
    orientation: 'portrait',
    extra: { apiBase: API_BASE }
  }
};
