# Porto's Bakery

A multi-platform bakery ordering system with separated apps:

- `backend`: Express + MongoDB API. Run `npm install`, copy `.env.example` to `.env`, then `npm run seed` and `npm run dev`.
- `client-web`: React customer storefront. Run `npm install` and `npm run dev`.
- `admin-panel`: React branch manager dashboard. Run `npm install` and `npm run dev`.
- `mobile-app`: Flutter customer app starter. Run `flutter pub get` and `flutter run`.

The API is public for menus and checkout. Only `/api/admin/*` requires a branch-scoped JWT. Checkout uses MongoDB `$near` ordering and filters candidates by current local operating hours.
