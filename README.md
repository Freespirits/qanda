# qanda backend

This repository now includes a lightweight Node.js backend for collecting and retrieving anonymous questionnaire responses that mirror the fields in `index.html`.

## Running the server

```bash
npm start
```

The server listens on port `3000` by default and exposes:

- `GET /api/questions` – return the list of questions and their metadata.
- `POST /api/answers` – accept a JSON body with an `answers` object keyed by question id.
- `GET /api/answers` – return all stored submissions.

Answers are saved to `data/answers.json`. You can override the file location with the `ANSWERS_PATH` environment variable.

## Testing

The project uses the built-in Node.js test runner. Run the full suite with:

```bash
npm test
```

## Deploying to Vercel

For static hosting providers such as Vercel, the `/api` endpoints are implemented as
serverless functions in the `api/` directory. Deploy the repo as a Node.js project and
the same API behavior available locally will be exposed at `/api/questions` and
`/api/answers`.
