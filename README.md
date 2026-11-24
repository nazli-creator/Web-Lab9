# Reading List — Assignment 9

A first full-stack application: a REST API (Node.js + Express 5, ES modules) that keeps books in memory, and a React (Vite) client that searches, filters, sorts, adds, edits, rates and deletes them and shows statistics. There is no database and no login; when the server restarts the data returns to its seed.

## 1. How to install and run

Requirements: Node.js (current LTS) and npm. Run the server and the client in two terminals.

### Server (default port 3000)

```bash
cd server
npm install
npm start          # node server.js
# or: npm run dev  # node --watch server.js (restarts on file change)
```

| Environment variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | Port the API listens on |
| `CLIENT_ORIGIN` | `http://localhost:5173` | The single origin allowed by CORS |

Example: `PORT=4000 CLIENT_ORIGIN=http://localhost:5173 npm start`

### Client (Vite dev server, port 5173)

```bash
cd client
cp .env.example .env     # then edit if the API is not on http://localhost:3000
npm install
npm run dev
```

| Environment variable | Example | Meaning |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3000` | Base URL of the API. Documented in `client/.env.example`. |

Open <http://localhost:5173>. No Vite proxy is configured: the browser calls the API directly and the server sends the CORS headers itself (`cors` package, restricted to `CLIENT_ORIGIN`).

`node_modules/` and `.env` are in `.gitignore` and are not committed.

## 2. File organization

```text
assignment9/
├── server/
│   ├── server.js        # Express app: CORS, express.json, routes, 404 fallback, error middleware
│   ├── booksStore.js    # async in-memory data access; never mutates existing arrays/objects
│   ├── validate.js      # hand-written validation (book body, id, list query options)
│   ├── package.json     # "type": "module", start + dev scripts
│   └── package-lock.json
├── client/
│   ├── src/
│   │   ├── api/books.js       # the only place with fetch / URLs / import.meta.env
│   │   ├── components/        # Filters, BookList, BookItem, BookForm, StatsPanel
│   │   ├── constants.js       # genre and sort option lists
│   │   ├── App.jsx            # state, effects (AbortController), change handlers
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   └── package.json
├── .gitignore
└── README.md
```

### API summary

| Method and path | Success | Errors |
| --- | --- | --- |
| `GET /api/books` (`genre`, `read`, `q`, `sort`, `order`, `limit`, `page`) | 200 | 400 |
| `GET /api/books/:id` | 200 | 400, 404 |
| `POST /api/books` | 201 + `Location` | 400, 409 |
| `PUT /api/books/:id` | 200 | 400, 404, 409 |
| `PATCH /api/books/:id` | 200 | 400, 404, 409 |
| `DELETE /api/books/:id` | 204, no body | 400, 404 |
| `GET /api/stats` | 200 | — |

All errors are JSON: `{ "error": "message" }`. `GET /api/crash` is a deliberate async throw that proves the error-handling middleware works (it answers `500 {"error":"Something went wrong"}` and logs the error on the server); it is kept and documented here as the assignment allows.

## 3. `curl` and preflight evidence (Section 7)

Server started fresh with `npm start` (seed: 7 books). `$BASE` is `http://localhost:3000`. The `X-Powered-By`, `Date`, `Connection`, `Keep-Alive`, `ETag` headers were left out for brevity.

**1. `200` list with two query parameters combined (genre + sort, plus order)**

```text
$ curl --include "$BASE/api/books?genre=fantasy&sort=title&order=desc"
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 235

[{"id":5,"title":"The Name of the Wind","author":"Patrick Rothfuss","year":2007,"genre":"fantasy","read":false,"rating":null},{"id":3,"title":"The Hobbit","author":"J.R.R. Tolkien","year":1937,"genre":"fantasy","read":true,"rating":5}]
```

**2. `200` one book**

```text
$ curl --include $BASE/api/books/1
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 101

{"id":1,"title":"Dune","author":"Frank Herbert","year":1965,"genre":"fiction","read":true,"rating":5}
```

**3. `201` created, with the `Location` header**

```text
$ curl --include -X POST $BASE/api/books -H 'Content-Type: application/json' -d '{"title":"Neuromancer","author":"William Gibson","year":1984,"genre":"fiction"}'
HTTP/1.1 201 Created
Access-Control-Allow-Origin: http://localhost:5173
Location: /api/books/8
Content-Type: application/json; charset=utf-8
Content-Length: 113

{"id":8,"title":"Neuromancer","author":"William Gibson","year":1984,"genre":"fiction","read":false,"rating":null}
```

**4. `400` invalid body (three problems reported at once)**

```text
$ curl --include -X POST $BASE/api/books -H 'Content-Type: application/json' -d '{"title":"","author":"X","year":3000,"genre":"poetry"}'
HTTP/1.1 400 Bad Request
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 206

{"error":"\"title\" must be between 1 and 100 characters after trimming; \"year\" must be an integer between 1000 and 2026; \"genre\" must be one of: fiction, non-fiction, science, history, fantasy, other"}
```

**5. `400` repeated query parameter**

```text
$ curl --include "$BASE/api/books?genre=fiction&genre=history"
HTTP/1.1 400 Bad Request
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 68

{"error":"Query parameter \"genre\" must not be repeated or nested"}
```

**6. `404` missing book**

```text
$ curl --include $BASE/api/books/999
HTTP/1.1 404 Not Found
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 30

{"error":"Book 999 not found"}
```

**7. `409` duplicate (title/author compared case-insensitively)**

```text
$ curl --include -X POST $BASE/api/books -H 'Content-Type: application/json' -d '{"title":"dune","author":"FRANK HERBERT","year":1965,"genre":"fiction"}'
HTTP/1.1 409 Conflict
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 64

{"error":"A book with the same title and author already exists"}
```

**8a. `PUT` vs `PATCH` on book 4 — before**

```text
$ curl --include $BASE/api/books/4
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 112

{"id":4,"title":"Sapiens","author":"Yuval Noah Harari","year":2011,"genre":"history","read":false,"rating":null}
```

**8b. `PUT` replaces the whole book (only `year` changed, but `read`/`rating` fall back to defaults because they were not sent)**

```text
$ curl --include -X PUT $BASE/api/books/4 -H 'Content-Type: application/json' -d '{"title":"Sapiens","author":"Yuval Noah Harari","year":2014,"genre":"history"}'
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 112

{"id":4,"title":"Sapiens","author":"Yuval Noah Harari","year":2014,"genre":"history","read":false,"rating":null}
```

**8c. `PATCH` changes only the fields sent**

```text
$ curl --include -X PATCH $BASE/api/books/4 -H 'Content-Type: application/json' -d '{"read":true,"rating":4}'
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 108

{"id":4,"title":"Sapiens","author":"Yuval Noah Harari","year":2014,"genre":"history","read":true,"rating":4}
```

**9a. `GET /api/stats` before a change (total 8 after the POST above)**

```text
$ curl --include $BASE/api/stats
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 127

{"total":8,"read":6,"unread":2,"averageRating":4.2,"byGenre":{"fiction":2,"science":2,"fantasy":2,"history":1,"non-fiction":1}}
```

**9b. `204` for a delete**

```text
$ curl --include -X DELETE $BASE/api/books/8
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
```

**9c. the same delete repeated gives `404`**

```text
$ curl --include -X DELETE $BASE/api/books/8
HTTP/1.1 404 Not Found
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 28

{"error":"Book 8 not found"}
```

**9d. `GET /api/stats` after the change**

```text
$ curl --include $BASE/api/stats
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 127

{"total":7,"read":6,"unread":1,"averageRating":4.2,"byGenre":{"fiction":1,"science":2,"fantasy":2,"history":1,"non-fiction":1}}
```

**Extra: malformed JSON → `400` JSON error (not Express's HTML page)**

```text
$ curl --include -X POST $BASE/api/books -H 'Content-Type: application/json' -d '{bad json'
HTTP/1.1 400 Bad Request
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 42

{"error":"Malformed JSON in request body"}
```

**Extra: unknown `/api` route → `404` JSON fallback**

```text
$ curl --include $BASE/api/nothing
HTTP/1.1 404 Not Found
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 21

{"error":"Not found"}
```

**Extra: `GET /api/crash` (async throw) → `500` from the error middleware, no stack trace**

```text
$ curl --include $BASE/api/crash
HTTP/1.1 500 Internal Server Error
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 32

{"error":"Something went wrong"}
```

**Extra: `PATCH` validates the *merged* book (rating on an unread book → `400`)**

```text
$ curl --include -X PATCH $BASE/api/books/5 -H 'Content-Type: application/json' -d '{"rating":3}'
HTTP/1.1 400 Bad Request
Access-Control-Allow-Origin: http://localhost:5173
Content-Type: application/json; charset=utf-8
Content-Length: 60

{"error":"\"rating\" is allowed only when \"read\" is true"}
```

**Extra: CORS preflight simulated with curl**

```text
$ curl --include -X OPTIONS $BASE/api/books -H 'Origin: http://localhost:5173' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type'
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
Access-Control-Allow-Headers: content-type
Content-Length: 0
```

### Browser Network tab: the `OPTIONS` preflight

When the React page (origin `http://localhost:5173`) sends a request with `Content-Type: application/json` (POST/PUT/PATCH) or any DELETE/PUT/PATCH, the browser first sends an automatic preflight. In the Network tab it appears as a row `books` (or `books/4`) with method **OPTIONS** and status **204**, listed just before the real request.

- Request headers: `Origin: http://localhost:5173`, `Access-Control-Request-Method: POST`, `Access-Control-Request-Headers: content-type`.
- Response headers: `Access-Control-Allow-Origin: http://localhost:5173`, `Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE`, `Access-Control-Allow-Headers: content-type`, `Vary: Origin, Access-Control-Request-Headers`.

The last item of the curl list above reproduces exactly this exchange from the command line.

<!-- TODO (student): add a screenshot of the real OPTIONS row from the browser Network tab here. -->

## 4. Answers to the reasoning questions (Section 8)

**1. Parameters.** The `id` identifies *which* resource I am talking about (`/api/books/4` is a book), so it belongs in the path; `genre` and `sort` only shape a view of the collection (filter, ordering), are optional, and can be combined, so they are query parameters. If `id` were in the query string (`/api/books?id=4`) the URL would no longer name one resource, `GET /api/books` would have to mean two things (a list or one book), and caching and routing would get messier.

**2. Body parsing.** *Experiment:* I moved `app.use(express.json())` below the routes. In Express 5 `req.body` was `undefined` inside the handler because the body had never been parsed when the route ran. A valid `POST` therefore failed: my validation saw "no object" and the server answered `400 {"error":"Request body must be a JSON object"}` even though the client sent a correct JSON body. Middleware runs in the order it is registered, so the parser must come first.

**3. One response.** *Experiment:* I removed the `return` before the `404` response in `GET /api/books/:id`. The client still got the `404` (the first response), but the code kept running and tried to send a second response with `res.status(200).json(book)`. Node threw `Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client`, which was logged on the server; the error middleware then also failed to send its own `500` for the same reason. `return` stops the handler so each request gets exactly one response.

**4. PUT and PATCH.** `PATCH` is better when the user changes one thing, e.g. the checkbox "mark as read" or the rating select: the client sends only `{ "read": true }` and everything else stays untouched. `PUT` is better for the edit form, where the client sends the complete book and wants it to replace the stored one (fields not sent, such as `rating`, go back to their defaults). The curl evidence above shows it: `PUT` with no `read`/`rating` reset them, `PATCH` with `{read, rating}` kept title, author and year.

**5. CORS.** *Experiment:* I started the server with `CLIENT_ORIGIN=http://localhost:9999` (wrong) while the page runs on `:5173`. The server still received and processed the request, and answered it with `Access-Control-Allow-Origin: http://localhost:9999` (checked with curl, sending `Origin: http://localhost:5173`). The browser compares that header with the page's origin, sees they differ, and refuses to give the response to the JavaScript; the console shows the familiar "blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value 'http://localhost:9999' that is not equal to the supplied origin" error and the `fetch` rejects. `curl` still works because CORS is enforced only by browsers; curl is not a web page with an origin to protect, so it simply prints the response. (CORS protects users' browsers, not the server.)

**6. Validation.** Client-side checks only improve the user experience; anyone can bypass the page and send requests with `curl`, Postman or a modified script, or an old client version may send different data. The server is the only part that guards the data, so it must check every body, parameter and id itself. The client in this project also shows the server's error message (duplicate, invalid year) to prove it relies on the server.

**7. State.** *Experiment:* I created book 8 via `POST` (stats: `total: 8`), restarted the server, and then `GET /api/books/8` returned `404` and the stats were back to `total: 7`. The data lives in a variable in the server's memory, so it disappears when the process ends. To keep it, it must be written to something persistent outside the process, such as a file or a database (which comes later in the course).

## 5. Notes on the self-study items

- **Building a query string with `URLSearchParams`.** `client/src/api/books.js` builds the list URL with `new URLSearchParams()` and `search.set(key, value)`, skipping empty values. `toString()` percent-encodes the values (e.g. `q=the hobbit & more` becomes `q=the+hobbit+%26+more`), so a user typing `&` or `#` cannot break or inject parameters, which string concatenation would allow.
- **Sorting with `localeCompare`.** For `title` and `author` the server uses `a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })`, which compares alphabetically by locale rules and ignores case/accents, unlike `<` which puts every capital letter before lowercase ones. Numeric fields use subtraction. Sorting is done on a copy (`[...filtered].sort(...)`) because `Array.prototype.sort` mutates its array, and books without a rating are forced to the end when sorting by `rating`.
- **`import.meta.env` and the `VITE_` prefix.** Vite exposes env values to client code through `import.meta.env`, but only variables starting with `VITE_` (so secrets that happen to be in `.env` are not bundled into the browser code by accident). The API module reads `import.meta.env.VITE_API_URL`; the variable is documented in `client/.env.example`, and the dev server must be restarted after editing `.env`.
- **A `204` in Express 5.** A `204` must have no body, so the handler sends `res.status(204).end()` (`res.sendStatus(204)` is equivalent). On the client, the shared `request()` helper checks `response.status === 204` and returns `null` *before* trying `response.json()`, which would fail on an empty body.
- **Cancelling a `fetch` and `AbortError`.** The effect in `App.jsx` creates an `AbortController`, passes `controller.signal` to `fetch`, and aborts it in the cleanup function, so when filters change quickly an old slow response can never overwrite a newer list. An aborted `fetch` rejects with a `DOMException` whose `name` is `'AbortError'`; the code recognises it (`err.name === 'AbortError'`) and ignores it instead of showing an error.
- **Express 5 specifics.** `app.get('*', …)` no longer works in Express 5, so the 404 fallback is `app.use('/api', …)`. Rejected promises / errors thrown in async handlers are forwarded to the error middleware automatically (no `try/catch` + `next(err)` needed), which `GET /api/crash` demonstrates. Repeated query parameters (`?genre=a&genre=b`) arrive as arrays in `req.query`, which is how the server detects and rejects them with `400`.

## 6. Challenges faced

- **PATCH validation.** Validating only the fields sent is not enough: `{ "rating": 3 }` on an unread book must fail. The server merges the stored book with the changes and validates the *merged* result with the same function used for complete books. The client mirrors this: "Mark unread" sends `{ read: false, rating: null }`.
- **One response per request.** Early returns (`return res.status(404)...`) are easy to forget in async handlers; I used `return` on every response.
- **Immutability.** Even `sort` and "update a book" mutate by default; the store replaces its array with new arrays (`map`, `filter`, spread), and the client builds new filter objects.
- **Stale responses in React.** Fast typing in the search box fired overlapping requests; `AbortController` cleanup in `useEffect` solved the race. In React StrictMode effects run twice in development, so the abort path is exercised on every page load.
- **Malformed JSON.** By default `express.json()` answers with an HTML error page. The error middleware checks for the parse error and sends a JSON `400` instead.
- **Understanding CORS vs. curl.** It was confusing that a request works with curl but not in the browser until I did the experiment in Question 5.
