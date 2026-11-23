// The ONLY place in the client that calls fetch or knows about URLs.

const BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Shared helper for every request.
 * - sets Content-Type only when there is a body
 * - checks response.ok and turns the server's { error } into an Error
 * - returns null for 204 (no body to parse)
 */
async function request(path, { method = 'GET', body, signal } = {}) {
  const options = { method, signal };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch (err) {
    if (err.name === 'AbortError') throw err; // cancelled on purpose: let callers recognise it
    throw new Error('Cannot reach the server. Is it running, and is CORS configured for this origin?');
  }

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {
    // body was not JSON; fall through to the generic message below
  }

  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed with status ${response.status}`);
  }
  return data;
}

/** Builds "?a=1&b=2" safely (URLSearchParams encodes values); empty values are skipped. */
function buildQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== '' && value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function listBooks(filters, signal) {
  return request(`/api/books${buildQuery(filters)}`, { signal });
}

export function createBook(book) {
  return request('/api/books', { method: 'POST', body: book });
}

export function replaceBook(id, book) {
  return request(`/api/books/${id}`, { method: 'PUT', body: book });
}

export function updateBook(id, changes) {
  return request(`/api/books/${id}`, { method: 'PATCH', body: changes });
}

export function deleteBook(id) {
  return request(`/api/books/${id}`, { method: 'DELETE' });
}

export function getStats(signal) {
  return request('/api/stats', { signal });
}
