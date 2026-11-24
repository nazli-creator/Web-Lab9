import BookItem from './BookItem.jsx';

export default function BookList({ books, loading, error, busy, onToggleRead, onRate, onEdit, onDelete }) {
  if (loading) return <p>Loading books…</p>;
  if (error) return <p className="error" role="alert">{error}</p>;
  if (books.length === 0) return <p>No books match. Try changing the filters or add a book.</p>;

  return (
    <ul className="book-list">
      {books.map((book) => (
        <BookItem
          key={book.id}
          book={book}
          busy={busy}
          onToggleRead={onToggleRead}
          onRate={onRate}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
