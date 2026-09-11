export const getPhotoUrl = (photoUrl) => {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://') || photoUrl.startsWith('data:')) {
    return photoUrl;
  }
  // Construct absolute backend origin URL so images render reliably in all browsers
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
  const backendOrigin = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  const cleanPath = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`;
  return `${backendOrigin}${cleanPath}`;
};
