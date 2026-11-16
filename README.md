
# BookNook – A Small Online Library

BookNook is a simple online library where users can browse books, add their own books, borrow available copies, and return borrowed books.

## Live Website

[Visit BookNook](https://booknook-delta-blond.vercel.app)

## Features

- Browse the available books in the library.
- View book details, including author, description, category, and available copies.
- Create an account and sign in to access library features.
- Add books to the library with details and a cover image.
- Edit or delete books that you have added.
- Borrow available books and view your borrowed books.
- Return borrowed books.
- View new arrivals in the library.

## Technologies Used

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Better Auth

### Backend
- Node.js
- Express.js
- MongoDB
- JSON Web Tokens (JWT)

### Services
- Vercel – Deployment
- ImgBB – Book cover image hosting
- Google OAuth – Authentication

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- MongoDB database

### 1. Clone the repository

```bash
git clone <your-client-repository-url>
cd booknook
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the frontend project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000

BETTER_AUTH_SECRET=your_better_auth_secret
BETTER_AUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Create a `.env` file in the backend project root:

```env
MONGODB_URI=your_mongodb_connection_string
IMGBB_API_KEY=your_imgbb_api_key

CLIENT_URL=http://localhost:3000
AUTH_ISSUER=http://localhost:3000
AUTH_JWKS_URL=http://localhost:3000/api/auth/jwks
```

Use your actual credentials and deployment URLs. Do not commit environment files or secrets to GitHub.

### 4. Start the backend

From the backend project directory, install dependencies and start the server using the scripts defined in its `package.json`.

For example:

```bash
npm install
npm run dev
```

### 5. Start the frontend

From the frontend project directory:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```text
booknook/
├── src/
│   ├── app/          # Next.js pages and layouts
│   ├── components/   # Reusable UI components
│   ├── lib/          # Shared utilities and API helpers
│   └── types/        # TypeScript types
├── public/           # Static assets
└── package.json
```

The backend is maintained separately and provides the API endpoints used by the frontend.

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| GET | `/books` | Get all books |
| GET | `/books/:id` | Get a book by ID |
| GET | `/new-arrivals` | Get the latest books |
| POST | `/addbooks` | Add a book |
| PATCH | `/books/:id` | Update a book |
| DELETE | `/books/:id` | Delete a book |
| POST | `/borrowedbooks` | Borrow a book |
| GET | `/my-borrows/:email` | Get a user's borrowed books |
| DELETE | `/my-borrows/:id` | Return a borrowed book |
| POST | `/upload-image` | Upload a book cover image |

Some endpoints require the user to be authenticated.

## Author

Created as a library management project using Next.js, Express, and MongoDB.
