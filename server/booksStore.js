// In-memory data source. Every function is async (simulating a slow data
// source) and NEVER modifies the existing array or objects: each change
// builds a new array / new objects and replaces the reference.

let books = [
  { id: 1, title: 'Dune', author: 'Frank Herbert', year: 1965, genre: 'fiction', read: true, rating: 5 },
  { id: 2, title: 'A Brief History of Time', author: 'Stephen Hawking', year: 1988, genre: 'science', read: true, rating: 4 },
  { id: 3, title: 'The Hobbit', author: 'J.R.R. Tolkien', year: 1937, genre: 'fantasy', read: true, rating: 5 },
  { id: 4, title: 'Sapiens', author: 'Yuval Noah Harari', year: 2011, genre: 'history', read: false, rating: null },
  { id: 5, title: 'The Name of the Wind', author: 'Patrick Rothfuss', year: 2007, genre: 'fantasy', read: false, rating: null },
  { id: 6, title: 'Cosmos', author: 'Carl Sagan', year: 1980, genre: 'science', read: true, rating: null },
  { id: 7, title: 'Educated', author: 'Tara Westover', year: 2018, genre: 'non-fiction', read: true, rating: 3 },
];
let nextId = 8;

const delay = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

const sameBook = (a, b) =>
  a.title.trim().toLowerCase() === b.title.trim().toLowerCase() &&
  a.author.trim().toLowerCase() === b.author.trim().toLowerCase();

function compareBy(sort, order) {
  const direction = order === 'desc' ? -1 : 1;
  return (a, b) => {
    if (sort === 'rating') {
      // Books without a rating always go last, whatever the direction.
      if (a.rating === null && b.rating === null) return a.id - b.id;
      if (a.rating === null) return 1;
      if (b.rating === null) return -1;
    }
    let result;
    if (sort === 'title' || sort === 'author') {
      result = a[sort].localeCompare(b[sort], undefined, { sensitivity: 'base' });
    } else if (sort) {
      result = a[sort] - b[sort];
    } else {
      result = a.id - b.id;
    }
    if (result === 0) return a.id - b.id;
    return result * direction;
  };
}

export async function listBooks({ genre, read, q, sort, order, limit, page }) {
  await delay();
  const filtered = books.filter(
    (book) =>
      (genre === undefined || book.genre === genre) &&
      (read === undefined || book.read === read) &&
      (q === undefined ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q)),
  );
  // [...filtered] is already a new array, but copy explicitly: never sort the stored one.
  const sorted = [...filtered].sort(compareBy(sort, order));
  const start = (page - 1) * limit;
  return sorted.slice(start, start + limit);
}

export async function getBook(id) {
  await delay();
  return books.find((book) => book.id === id) ?? null;
}

/** Returns true when another book (other than `ignoreId`) has the same title and author. */
export async function isDuplicate(candidate, ignoreId = null) {
  await delay();
  return books.some((book) => book.id !== ignoreId && sameBook(book, candidate));
}

export async function createBook(data) {
  await delay();
  const book = { id: nextId, ...data };
  nextId += 1;
  books = [...books, book];
  return book;
}

export async function replaceBook(id, data) {
  await delay();
  if (!books.some((book) => book.id === id)) return null;
  const updated = { id, ...data };
  books = books.map((book) => (book.id === id ? updated : book));
  return updated;
}

export async function deleteBook(id) {
  await delay();
  if (!books.some((book) => book.id === id)) return false;
  books = books.filter((book) => book.id !== id);
  return true;
}

export async function getStats() {
  await delay();
  const rated = books.filter((book) => book.rating !== null);
  const readCount = books.filter((book) => book.read).length;
  const averageRating =
    rated.length === 0
      ? null
      : Math.round((rated.reduce((sum, book) => sum + book.rating, 0) / rated.length) * 10) / 10;
  const byGenre = books.reduce(
    (acc, book) => ({ ...acc, [book.genre]: (acc[book.genre] ?? 0) + 1 }),
    {},
  );
  return {
    total: books.length,
    read: readCount,
    unread: books.length - readCount,
    averageRating,
    byGenre,
  };
}
