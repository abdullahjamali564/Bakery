# Porto's Bakery

Porto's Bakery is a multi-platform bakery ordering system. It includes a customer storefront for the web, a Flutter customer app, a branch manager dashboard, and a shared Express/MongoDB API.

The project is organized as a small monorepo:

```text
.
├── backend/       Express API, MongoDB models, seed data, and tests
├── client-web/    React customer storefront
├── admin-panel/   React branch manager dashboard
└── mobile-app/    Flutter customer application
```

## What the app does

Customers can:

- Browse the bakery menu and filter products by category.
- Add products to a shopping bag and adjust quantities.
- Enter delivery information and choose cash or card at delivery.
- Use browser or device geolocation to provide delivery coordinates.
- Submit an order to the nearest open branch.
- View an order status by order ID. The Flutter app stores submitted orders locally and refreshes their status periodically.

Branch managers can:

- Sign in with branch credentials.
- View branch order activity and monthly statistics.
- Change the branch open/closed status.
- Move orders through `Received`, `Baking`, `Out for Delivery`, `Completed`, and `Cancelled`.

The backend selects a branch using MongoDB geospatial ordering and only accepts checkout when a suitable branch is open according to its configured local operating hours.

## Applications

### Customer web app

`client-web` is the React/Vite customer storefront. It provides the public menu, product categories, cart, checkout form, geolocation support, and order submission.

The web app uses `VITE_API_URL` to locate the backend. If it is not set, it uses `http://localhost:4000/api`.

### Admin panel

`admin-panel` is the React/Vite dashboard for branch managers. It uses the same API and stores the returned JWT in browser local storage for authenticated dashboard requests.

The admin panel uses `VITE_API_URL` and defaults to `http://localhost:4000/api`.

### Flutter mobile app

`mobile-app` is the Flutter customer app. It includes menu browsing, cart and checkout screens, local order history, status refresh, and an About screen.

The API URL is supplied at build or run time with Dart's `--dart-define`:

```bash
flutter run --dart-define=API_URL=http://10.0.2.2:4000/api
```

The default URL is `http://10.0.2.2:4000/api`, which points from an Android emulator to the host computer. For a physical phone, replace `10.0.2.2` with the computer's LAN IP address and make sure the backend port is reachable.

## Technology

- Backend: Node.js, Express, Mongoose, MongoDB, JWT, bcryptjs
- Customer web and admin: React, Vite, Lucide React
- Mobile: Flutter and Dart
- Testing: Node's built-in test runner, Supertest, and MongoDB Memory Server

## Prerequisites

Install the following before starting:

1. Node.js 20 or newer and npm.
2. MongoDB running locally or a MongoDB connection string.
3. Flutter SDK 3.x, Dart, and a configured emulator or physical device for the mobile app.
4. Android Studio and Android SDK for Android development, or Xcode on macOS for iOS development.
5. Git, if you are cloning or contributing to the repository.

Check the main tools with:

```bash
node --version
npm --version
mongosh --version
flutter --version
```

## Backend setup

From the repository root, install backend dependencies and create a local environment file:

```bash
cd backend
npm install
```

Copy `backend/.env.example` to `backend/.env` and set values appropriate for your machine:

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/portos_bakery
JWT_SECRET=replace-with-a-long-random-secret
```

Never commit `.env`. The repository ignores local environment files; `.env.example` contains placeholders only.

Seed the local database with sample products and one sample branch:

```bash
npm run seed
```

Start the API in development mode:

```bash
npm run dev
```

The API is available at `http://localhost:4000`. A successful health check is available at `GET http://localhost:4000/api/health`.

The seed script creates demo manager credentials for local development. Change or replace those credentials before using the application outside a local demo environment.

## Customer web setup

Open a second terminal at the repository root:

```bash
cd client-web
npm install
```

The default API URL works when the backend is running locally. To use a different API, copy `.env.example` to `.env` and edit it:

```env
VITE_API_URL=http://localhost:4000/api
```

Start the development server:

```bash
npm run dev
```

Vite prints the local URL in the terminal. Build the production assets with:

```bash
npm run build
```

## Admin panel setup

Open another terminal:

```bash
cd admin-panel
npm install
```

For a local backend, the default API URL is sufficient. To override it, copy `.env.example` to `.env`:

```env
VITE_API_URL=http://localhost:4000/api
```

Start the dashboard:

```bash
npm run dev
```

Use the manager email and password created by the backend seed script. The admin login calls `POST /api/admin/login`; the dashboard then uses the returned JWT for protected requests.

Create a production build with:

```bash
npm run build
```

## Flutter mobile setup

From the repository root:

```bash
cd mobile-app
flutter pub get
```

Start an Android emulator or connect a device, then run:

```bash
flutter run --dart-define=API_URL=http://10.0.2.2:4000/api
```

For a physical device, use the host machine's LAN IP instead:

```bash
flutter run --dart-define=API_URL=http://192.168.1.10:4000/api
```

The device and computer must be on the same network, and the backend must be reachable from that device. Android location permission is required to fill delivery coordinates automatically.

Run Flutter tests with:

```bash
flutter test
```

Build an Android APK with:

```bash
flutter build apk --dart-define=API_URL=https://your-api.example.com/api
```

## API reference

All API paths are prefixed with `/api`.

### Public endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check whether the API is running. |
| `GET` | `/products` | Return available products sorted by category and name. |
| `GET` | `/branches` | Return branch locations, contact details, hours, and status fields. |
| `POST` | `/orders/checkout` | Validate a cart, select an open nearby branch, and create an order. |
| `GET` | `/orders/:id` | Return order status and summary information. |

### Manager endpoints

Manager endpoints require an `Authorization` header in this format:

```http
Authorization: Bearer <jwt>
```

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/admin/login` | Authenticate a branch manager and return a JWT. |
| `GET` | `/admin/dashboard` | Return recent orders and branch statistics. |
| `PATCH` | `/admin/branch/status` | Set the authenticated branch's `isOpen` value. |
| `PATCH` | `/admin/orders/:id/status` | Update an order belonging to the authenticated branch. |

Checkout expects product IDs, quantities, customer name, phone, address, and delivery coordinates in `[longitude, latitude]` order. Delivery is free when the subtotal is at least PKR 5,000; otherwise the current delivery fee is PKR 450.

## Running tests

Backend tests use an in-memory MongoDB server and do not require the local MongoDB service:

```bash
cd backend
npm test
```

The test suite covers unauthenticated manager access, branch-scoped order updates, time-zone-aware opening hours, and overnight opening hours.

## Development workflow

Run these processes during full-stack development:

| Process | Directory | Command |
| --- | --- | --- |
| API | `backend` | `npm run dev` |
| Customer web | `client-web` | `npm run dev` |
| Admin panel | `admin-panel` | `npm run dev` |
| Mobile app | `mobile-app` | `flutter run --dart-define=API_URL=...` |

Start the backend first, then start whichever client you are working on. The web and admin clients default to port 4000 for the API. The Android emulator uses `10.0.2.2` instead of `localhost` because `localhost` inside the emulator refers to the emulator itself.

## Configuration and security notes

- Keep all `.env` files local. Use the checked-in `.env.example` files as templates.
- Use a long, random `JWT_SECRET` in every non-development environment.
- Do not use the seeded demo manager credentials in production.
- Configure CORS, rate limits, HTTPS, database access controls, and deployment secrets for production.
- Customer checkout currently accepts cash or card at delivery; it does not integrate with a payment gateway.
- Product images are loaded from external Unsplash URLs in the sample data, so an internet connection may be needed to display them.
- Generated builds, SDK paths, IDE metadata, and local machine configuration are excluded by `.gitignore`.

## Repository scripts

### Backend

```bash
npm run dev      # Start with nodemon
npm start        # Start normally
npm run seed     # Replace local data with sample data
npm test         # Run backend tests
```

### Web and admin clients

```bash
npm run dev      # Start the Vite development server
npm run build    # Create a production build
```

## Troubleshooting

### The API cannot connect to MongoDB

Make sure MongoDB is running and that `MONGODB_URI` points to the correct instance. Then run `npm run seed` again if the database has no products or branches.

### The web app shows fallback products

The customer web app has local fallback menu data, but API-backed checkout requires the backend to be running and reachable at `VITE_API_URL`. Check the browser console and verify `GET /api/products` directly.

### The mobile app cannot reach the API

Do not use `localhost` from an Android emulator. Use `http://10.0.2.2:4000/api`, or use the computer's LAN IP for a physical device. Confirm that the phone and computer share a network and that the backend port is allowed through the firewall.

### Checkout reports that no branch is open

The API chooses a nearby branch and checks its configured operating hours and `isOpen` value. Use the admin panel to open the branch, or update the seeded branch hours and coordinates for your test location.

### Manager login fails

Run the seed command, verify the manager credentials from the seed script, and confirm that `JWT_SECRET` is set. A token is valid for eight hours.
