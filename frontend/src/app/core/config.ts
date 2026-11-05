export const API_URL = 'http://localhost:5080/api';
export const FILES_URL = 'http://localhost:5080';

export const fileUrl = (path?: string | null) => (path ? `${FILES_URL}/${path}` : null);