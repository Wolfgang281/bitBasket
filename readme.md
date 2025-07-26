# BitBasket Backend Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack & Versioning](#tech-stack--versioning)
3. [Directory Structure](#directory-structure)
4. [Installation & Setup](#installation--setup)
5. [Environment Variables](#environment-variables)
6. [Database Models](#database-models)
7. [Middleware](#middleware)
8. [Authentication & Authorization](#authentication--authorization)
9. [REST API Routes](#rest-api-routes)
10. [Utilities](#utilities)
11. [Seeder Script](#seeder-script)
12. [Error Handling](#error-handling)
13. [File Uploads (Cloudinary)](#file-uploads-cloudinary)
14. [Payment Integration (PayPal)](#payment-integration-paypal)
15. [Running the Server](#running-the-server)
16. [Deployment Notes](#deployment-notes)
17. [Best Practices & Security](#best-practices--security)
18. [Changelog](#changelog)
19. [License](#license)

---

## Project Overview

The **BitBasket** backend is a RESTful API built with **Node.js** and **Express.js** that powers a full-stack e-commerce platform. It manages user authentication, product catalog, cart & order workflow, admin operations, image uploads, and PayPal payments while persisting data in **MongoDB** using **Mongoose** ODM.

## Tech Stack & Versioning

| Layer            | Library                                                    | Version\* |
| ---------------- | ---------------------------------------------------------- | --------- |
| HTTP Server      | express                                                    | ^5.1.0    |
| Database         | mongoose                                                   | ^8.16.1   |
| Auth             | jsonwebtoken                                               | ^9.0.2    |
| Password Hashing | bcryptjs                                                   | ^3.0.2    |
| File Upload      | multer                                                     | ^2.0.1    |
| Cloud Storage    | cloudinary                                                 | ^2.7.0    |
| Payment          | paypal-rest-sdk                                            | ^1.8.1    |
| Misc             | cors, morgan, dotenv, cookie-parser, express-async-handler |
| Dev              | nodemon                                                    | ^3.1.0    |

> \*Check `package.json` for the exact versions used in this snapshot.

## Directory Structure

```
backend/
├── app.js                # Express app & route mounting
├── server.js             # Entry point, DB connect & server listen
├── package.json
├── config/               # Service configs
│   ├── database.js       # Mongo connection helper
│   ├── cloudinary.config.js
│   └── paypal.config.js
├── controllers/          # Business logic (admin, shop, user, common)
├── models/               # Mongoose schemas
├── routes/               # API route definitions
│   ├── admin/
│   ├── shop/
│   ├── user/
│   └── common/
├── middleware/           # Auth, error, multer wrappers
├── utils/                # Helper classes & functions
├── seeder/               # Admin seeding script
└── .env                  # *Never commit*
```

## Installation & Setup

```bash
# 1. Clone repository
$ git clone https://github.com/Wolfgang281/bitBasket.git && cd bitBasket/backend

# 2. Install dependencies
$ npm install

# 3. Configure environment
$ cp .env.example .env   # then fill values (see below)

# 4. Run development server
$ npm run dev            # nodemon with live reload
```

> Node ≥ 18.x and MongoDB ≥ 6.x are recommended.

## Environment Variables

| Variable                                                                 | Purpose                                              |
| ------------------------------------------------------------------------ | ---------------------------------------------------- |
| `PORT`                                                                   | Port on which Express listens (e.g. 9000)            |
| `MONGODB_LOCAL_URL`                                                      | MongoDB connection string                            |
| `JWT_SECRET`                                                             | Secret key for signing JSON Web Tokens               |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials                               |
| `PAYPAL_MODE`                                                            | `sandbox` or `live`                                  |
| `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET_KEY`                                 | PayPal REST credentials                              |
| `CORS_ORIGIN`                                                            | Allowed frontend origin (e.g. http://localhost:5173) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`                                         | Seed admin credentials                               |

## Database Models

### 1. User (`models/user.model.js`)

```js
userName: String (unique, lowercase)
email:    String (unique, validated)
password: String (hashed, excluded from queries)
role:     String ('user' | 'admin')
```

Pre-save hook hashes passwords via **bcrypt**; instance method `comparePassword()` checks credentials.

### 2. Product

Stores catalog data plus computed `averageReview`.

### 3. Order

Captures snapshot of cart items, shipping address, totals, payment status, and PayPal IDs.

### 4. Cart, Address, Review, Feature

Additional collections supporting shopping workflow, addresses, product reviews, and landing-page banners.

## Middleware

| File                   | Responsibility                                                       |
| ---------------------- | -------------------------------------------------------------------- |
| `auth.middleware.js`   | `authenticate` (JWT cookie → `req.user`) & `authorize` (admin guard) |
| `error.middleware.js`  | Central error formatter incl. Mongoose & JWT cases                   |
| `multer.middleware.js` | In-memory file storage used for Cloudinary uploads                   |

## Authentication & Authorization

1. **Register / Login** (`POST /api/v1/user/*`)
2. Server sets `token` cookie (HTTP-only, 30 days).
3. Subsequent requests pass through `authenticate`.
4. Admin-only routes chain `authorize` to ensure `role === 'admin'`.

## REST API Routes

> Base path: `/api/v1`
> (Auth = requires valid JWT; Admin = requires `role: admin`)

### User

| Method | Path             | Auth | Action               |
| ------ | ---------------- | ---- | -------------------- |
| POST   | `/user/register` | –    | Create account       |
| POST   | `/user/login`    | –    | Issue token          |
| POST   | `/user/logout`   | ✓    | Clear cookie         |
| GET    | `/user/me`       | ✓    | Current user profile |

### Admin ‑ Product

| Method | Path                          | Auth  | Description                |
| ------ | ----------------------------- | ----- | -------------------------- |
| POST   | `/admin/product/upload-image` | Admin | Single image to Cloudinary |
| POST   | `/admin/product/add`          | Admin | Add product                |
| GET    | `/admin/product/all`          | Admin | List products              |
| PATCH  | `/admin/product/update/:id`   | Admin | Modify product             |
| DELETE | `/admin/product/delete/:id`   | Admin | Remove product             |

### Shop

| Module      | Key Endpoints                                                                     |
| ----------- | --------------------------------------------------------------------------------- |
| **Product** | `GET /shop/product/get` (filters), `GET /shop/product/get/:id`                    |
| **Cart**    | Add, update, delete, clear (`/shop/cart/*` – Auth)                                |
| **Address** | CRUD addresses (`/shop/address/*` – Auth)                                         |
| **Order**   | `POST /shop/order/create`, `POST /shop/order/capture/:id` (PayPal), list & detail |
| **Review**  | `POST /shop/review/add`, `GET /shop/review/:id`                                   |
| **Search**  | `GET /shop/search/:keyword` full-text search                                      |

### Admin ‑ Order

Manage all orders & status updates (`/admin/order/*`).

## Utilities

- **ApiResponse** – uniform success wrapper
- **ErrorHandler** – custom `Error` subclass used throughout
- **jwt.util.js** – helper to sign tokens
- **cloudinary.utils.js** – async wrapper around Cloudinary uploader

## Seeder Script

Run once to create an admin user:

```bash
node app.js seed  # or: node server.js seed
```

Script checks for existing admin to avoid duplicates.

## Error Handling

`error.middleware.js` intercepts thrown errors or rejected promises, classifies them (validation, cast, duplicate, JWT), and returns structured JSON:

```json
{
  "success": false,
  "message": "Cart item not found",
  "stack": "..." // stack only in development
}
```

## File Uploads (Cloudinary)

1. Client uploads multipart form-data via `/admin/product/upload-image`.
2. `multer` stores file in memory → passed to `cloudinary.utils.uploadImageOnCloudinary()`.
3. Cloudinary URL returned & stored in product document.

## Payment Integration (PayPal)

- `paypal-rest-sdk` is configured via `config/paypal.config.js`.
- `/shop/order/create` generates PayPal payment and saves pending order.
- `/shop/order/capture/:id` captures the payment and updates `paymentStatus` & order timeline.

## Running the Server

```bash
# Development
npm run dev   # nodemon

# Production
npm start     # node server.js
```

Logs are printed via **morgan** in `dev` format.

## Deployment Notes

1. Build frontend and copy `frontend/dist` (or `build`) into `backend/` if serving statically.
2. Set environment vars in hosting provider (Render, Railway, etc.).
3. Ingress rules should forward HTTPS → Express `PORT`.
4. Remember to whitelist frontend origin in `CORS_ORIGIN`.

## Best Practices & Security

- **HTTP-only Cookies** for JWT mitigate XSS token theft.
- Passwords hashed with **bcrypt** (salt rounds 10).
- Input validation via Mongoose schemas & payload checks.
- Centralized error responses avoid information leakage.
- Do **not** commit `.env` or `node_modules`.

---

_Created by UTK_
