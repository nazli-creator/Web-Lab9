import { useState } from 'react';
import { GENRES } from '../constants.js';

const EMPTY = { title: '', author: '', year: '', genre: 'fiction', read: false, rating: '' };

function toFormState(book) {
  if (!book) return EMPTY;
  return {
    title: book.title,
    author: book.author,
    year: String(book.year),
    genre: book.genre,
    read: book.read,
    rating: book.rating === null ? '' : String(book.rating),
  };
}

/**
 * Add form and edit form in one component. When `book` is given the form edits
 * it (the parent sends PUT), otherwise it adds a new one (POST).
 * Only light checks happen here; the server remains the authority and its
 * error message is shown through the `error` prop.
 */
export default function BookForm({ book, submitting, error, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => toFormState(book));
  const [localError, setLocalError] = useState(null);

  const setField = (name, value) => setForm((previous) => ({ ...previous, [name]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.author.trim() || form.year.trim() === '') {
      setLocalError('Title, author and year are required.');
      return;
    }
    setLocalError(null);
    const saved = await onSubmit({
      title: form.title,
      author: form.author,
      year: Number(form.year),
      genre: form.genre,
      read: form.read,
      rating: form.read && form.rating !== '' ? Number(form.rating) : null,
    });
    if (saved && !book) setForm(EMPTY); // clear only after the server accepted a new book
  };

  return (
    <form className="panel book-form" onSubmit={handleSubmit} noValidate>
      <h2>{book ? `Edit book #${book.id}` : 'Add a book'}</h2>
      <label>
        Title
        <input value={form.title} onChange={(e) => setField('title', e.target.value)} />
      </label>
      <label>
        Author
        <input value={form.author} onChange={(e) => setField('author', e.target.value)} />
      </label>
      <label>
        Year
        <input type="number" value={form.year} onChange={(e) => setField('year', e.target.value)} />
      </label>
      <label>
        Genre
        <select value={form.genre} onChange={(e) => setField('genre', e.target.value)}>
          {GENRES.map((genre) => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>
      </label>
      <label className="inline">
        <input
          type="checkbox"
          checked={form.read}
          onChange={(e) => setForm((previous) => ({ ...previous, read: e.target.checked, rating: e.target.checked ? previous.rating : '' }))}
        />
        Already read
      </label>
      <label>
        Rating
        <select disabled={!form.read} value={form.rating} onChange={(e) => setField('rating', e.target.value)}>
          <option value="">none</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
      {(localError || error) && <p className="error" role="alert">{localError ?? error}</p>}
      <div className="form-buttons">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : book ? 'Save changes' : 'Add book'}
        </button>
        {book && (
          <button type="button" disabled={submitting} onClick={onCancel}>Cancel</button>
        )}
      </div>
    </form>
  );
}
