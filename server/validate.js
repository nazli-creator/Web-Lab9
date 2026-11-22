// Hand-written validation (no schema libraries allowed in this assignment).

export const GENRES = ['fiction', 'non-fiction', 'science', 'history', 'fantasy', 'other'];

const SORT_FIELDS = ['title', 'author', 'year', 'rating'];
const ORDERS = ['asc', 'desc'];

export const BOOK_FIELDS = ['title', 'author', 'year', 'genre', 'read', 'rating'];

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateText(value, name, errors) {
  if (typeof value !== 'string') {
    errors.push(`"${name}" must be a string`);
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    errors.push(`"${name}" must be between 1 and 100 characters after trimming`);
    return null;
  }
  return trimmed;
}

/**
 * Validates a complete book (without id) and returns { value } or { error }.
 * `read` defaults to false and `rating` defaults to null.
 * Unknown fields (including id) are ignored.
 */
export function validateBook(body) {
  if (!isPlainObject(body)) {
    return { error: 'Request body must be a JSON object' };
  }

  const errors = [];
  const title = validateText(body.title, 'title', errors);
  const author = validateText(body.author, 'author', errors);

  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(body.year) || body.year < 1000 || body.year > currentYear) {
    errors.push(`"year" must be an integer between 1000 and ${currentYear}`);
  }

  if (!GENRES.includes(body.genre)) {
    errors.push(`"genre" must be one of: ${GENRES.join(', ')}`);
  }

  const read = body.read === undefined ? false : body.read;
  if (typeof read !== 'boolean') {
    errors.push('"read" must be true or false');
  }

  const rating = body.rating === undefined ? null : body.rating;
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    errors.push('"rating" must be an integer from 1 to 5, or null');
  } else if (rating !== null && read !== true) {
    errors.push('"rating" is allowed only when "read" is true');
  }

  if (errors.length > 0) {
    return { error: errors.join('; ') };
  }
  return { value: { title, author, year: body.year, genre: body.genre, read, rating } };
}

/** Keeps only the known book fields that are present in a PATCH body. */
export function pickBookFields(body) {
  const picked = {};
  for (const field of BOOK_FIELDS) {
    if (Object.hasOwn(body, field)) picked[field] = body[field];
  }
  return picked;
}

/** Parses an id route parameter: a positive integer, otherwise null. */
export function parseId(raw) {
  if (typeof raw !== 'string' || !/^[0-9]+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function singleValue(query, name, errors) {
  const raw = query[name];
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') {
    errors.push(`Query parameter "${name}" must not be repeated or nested`);
    return undefined;
  }
  return raw;
}

function parsePositiveInt(raw, name, min, max, fallback, errors) {
  if (raw === undefined) return fallback;
  if (!/^[0-9]+$/.test(raw)) {
    errors.push(`"${name}" must be an integer`);
    return fallback;
  }
  const n = Number(raw);
  if (n < min || n > max) {
    errors.push(`"${name}" must be between ${min} and ${max}`);
    return fallback;
  }
  return n;
}

/** Validates the query options of GET /api/books; returns { value } or { error }. */
export function validateListQuery(query) {
  const errors = [];
  const options = {};

  const genre = singleValue(query, 'genre', errors);
  if (genre !== undefined) {
    if (GENRES.includes(genre)) options.genre = genre;
    else errors.push(`"genre" must be one of: ${GENRES.join(', ')}`);
  }

  const read = singleValue(query, 'read', errors);
  if (read !== undefined) {
    if (read === 'true' || read === 'false') options.read = read === 'true';
    else errors.push('"read" must be true or false');
  }

  const q = singleValue(query, 'q', errors);
  if (q !== undefined && q.trim() !== '') options.q = q.trim().toLowerCase();

  const sort = singleValue(query, 'sort', errors);
  if (sort !== undefined) {
    if (SORT_FIELDS.includes(sort)) options.sort = sort;
    else errors.push(`"sort" must be one of: ${SORT_FIELDS.join(', ')}`);
  }

  const order = singleValue(query, 'order', errors);
  options.order = 'asc';
  if (order !== undefined) {
    if (ORDERS.includes(order)) options.order = order;
    else errors.push('"order" must be asc or desc');
  }

  options.limit = parsePositiveInt(singleValue(query, 'limit', errors), 'limit', 1, 50, 50, errors);
  options.page = parsePositiveInt(singleValue(query, 'page', errors), 'page', 1, Number.MAX_SAFE_INTEGER, 1, errors);

  if (errors.length > 0) return { error: errors.join('; ') };
  return { value: options };
}
