// Small async fetch helpers.
//
// In dev, the Vite proxy forwards /api -> http://localhost:5000, so the default
// base is the same-origin /api prefix.
// In production (Vercel static hosting) there is NO proxy, so the frontend must
// call the Render backend directly. Set VITE_API_URL to your Render URL, e.g.
//   VITE_API_URL=https://your-api.onrender.com
// Vite inlines it at build time. The final URL is:  <base>/api/<path>
//
// Non-2xx responses are parsed for a `{error}` shape and thrown as Error with
// that message.

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_PREFIX = '/api';

function withPrefix(url) {
  if (url.startsWith('/api') || url.startsWith('http')) return url;
  return `${API_PREFIX}${url}`;
}

function fullUrl(url) {
  const p = withPrefix(url);
  return BASE ? `${BASE}${p}` : p;
}

async function handle(res) {
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && data.error) ||
      (typeof data === 'string' ? data : `Request failed with status ${res.status}`);
    throw new Error(message);
  }
  return data;
}

function opts(method, body) {
  const o = { method, headers: {} };
  if (body !== undefined) {
    o.headers['Content-Type'] = 'application/json';
    o.body = JSON.stringify(body);
  }
  return o;
}

export async function getJSON(url) {
  const res = await fetch(fullUrl(url), opts('GET'));
  return handle(res);
}

export async function postJSON(url, body) {
  const res = await fetch(fullUrl(url), opts('POST', body));
  return handle(res);
}

export async function patchJSON(url, body) {
  const res = await fetch(fullUrl(url), opts('PATCH', body));
  return handle(res);
}

export async function putJSON(url, body) {
  const res = await fetch(fullUrl(url), opts('PUT', body));
  return handle(res);
}

export async function delJSON(url) {
  const res = await fetch(fullUrl(url), opts('DELETE'));
  return handle(res);
}