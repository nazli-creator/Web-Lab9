import express from 'express';
import cors from 'cors';
import * as store from './booksStore.js';
import { validateBook, validateListQuery, pickBookFields, parseId } from './validate.js';

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();

// CORS: one exact origin (never "*"). Sends the headers itself, no proxy.
app.use(cors({ origin: CLIENT_ORIGIN }));
// Body parsing must be registered BEFORE the routes.
app.use(express.json());

// ---------- Routes ----------

app.get('/api/books', async (req, res) => {
  const { value, error } = validateListQuery(req.query);
  if (error) return res.status(400).json({ error });
  const books = await store.listBooks(value);
  return res.status(200).json(books);
});

app.get('/api/stats', async (req, res) => {
  const stats = await store.getStats();
  return res.status(200).json(stats);
});

app.get('/api/books/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Book id must be a positive integer' });
  const book = await store.getBook(id);
  if (!book) return res.status(404).json({ error: `Book ${id} not found` });
  return res.status(200).json(book);
});

app.post('/api/books', async (req, res) => {
  const { value, error } = validateBook(req.body);
  if (error) return res.status(400).json({ error });
  if (await store.isDuplicate(value)) {
    return res.status(409).json({ error: 'A book with the same title and author already exists' });
  }
  const book = await store.createBook(value);
  return res.status(201).location(`/api/books/${book.id}`).json(book);
});

app.put('/api/books/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Book id must be a positive integer' });
  const { value, error } = validateBook(req.body);
  if (error) return res.status(400).json({ error });
  if (!(await store.getBook(id))) return res.status(404).json({ error: `Book ${id} not found` });
  if (await store.isDuplicate(value, id)) {
    return res.status(409).json({ error: 'A book with the same title and author already exists' });
  }
  const book = await store.replaceBook(id, value);
  if (!book) return res.status(404).json({ error: `Book ${id} not found` });
  return res.status(200).json(book);
});

app.patch('/api/books/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Book id must be a positive integer' });
  if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }
  const existing = await store.getBook(id);
  if (!existing) return res.status(404).json({ error: `Book ${id} not found` });

  // Merge existing values with the changes, then validate the MERGED book.
  const { id: _existingId, ...existingFields } = existing;
  const { value, error } = validateBook({ ...existingFields, ...pickBookFields(req.body) });
  if (error) return res.status(400).json({ error });
  if (await store.isDuplicate(value, id)) {
    return res.status(409).json({ error: 'A book with the same title and author already exists' });
  }
  const book = await store.replaceBook(id, value);
  if (!book) return res.status(404).json({ error: `Book ${id} not found` });
  return res.status(200).json(book);
});

app.delete('/api/books/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Book id must be a positive integer' });
  const deleted = await store.deleteBook(id);
  if (!deleted) return res.status(404).json({ error: `Book ${id} not found` });
  return res.status(204).end();
});

// Deliberate failure inside an async handler, to prove the error middleware
// works (documented in the README).
app.get('/api/crash', async () => {
  await Promise.resolve();
  throw new Error('Deliberate crash for testing the error middleware');
});

// ---------- 404 fallback (Express 5: no '*' wildcard) ----------

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------- Error-handling middleware (4 parameters, after all routes) ----------

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    return res.status(400).json({ error: 'Malformed JSON in request body' });
  }
  if (err.status === 413 || err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT} (allowed origin: ${CLIENT_ORIGIN})`);
});
