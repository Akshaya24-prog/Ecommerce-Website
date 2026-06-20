# Marketstand — E-Commerce Web Application

A full-stack online store with a product catalog, shopping cart, checkout, order
tracking, and role-based access for Admins and Customers.

- **Frontend:** HTML, CSS, vanilla JavaScript (no frameworks, no build step)
- **Backend:** Django 5.1 + Django REST Framework, JWT authentication
- **Database:** PostgreSQL 18

---

## 1. Prerequisites

- Python (Anaconda recommended)
- PostgreSQL 18 (running locally)
- All Python dependencies listed in `backend/requirements.txt` already installed

---

## 2. Setup

### 2.1 Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2.2 Create the database and tables

Run this once. It creates the `.env` file, the PostgreSQL database and user,
and runs all Django migrations.

```bash
python setup_db.py
```

You will be prompted for your PostgreSQL `postgres` superuser password.

To customise the database name, app username, or password before running,
edit the variables at the top of `setup_db.py` (lines 14–19):

```python
DB_NAME     = "ecommerce_db"
DB_USER     = "ecommerce_user"
DB_PASSWORD = "ecommerce_pass123"
DB_HOST     = "127.0.0.1"
DB_PORT     = "5432"
ADMIN_USER  = "postgres"
```

### 2.3 Seed demo data (optional)

```bash
python manage.py seed_data
```

Creates 5 categories, 12 demo products, an admin account, and a demo customer
account (see [Credentials](#4-credentials)).

### 2.4 Run the server

```bash
python manage.py runserver
```

Open **http://127.0.0.1:8000** — the full app is live. Both the frontend and
the API are served from the same port; no second terminal is needed.

---

## 3. URL map

| URL | What you get |
|---|---|
| `http://127.0.0.1:8000/` | Catalog |
| `http://127.0.0.1:8000/login.html` | Customer login |
| `http://127.0.0.1:8000/register.html` | Customer registration |
| `http://127.0.0.1:8000/cart.html` | Shopping cart |
| `http://127.0.0.1:8000/orders.html` | Order history |
| `http://127.0.0.1:8000/admin-dashboard.html` | Admin dashboard |
| `http://127.0.0.1:8000/admin-products.html` | Product management |
| `http://127.0.0.1:8000/admin-orders.html` | Order management |
| `http://127.0.0.1:8000/api/` | REST API |
| `http://127.0.0.1:8000/media/` | Uploaded product images |

---

## 4. Credentials

| Role     | Username   | Password          |
|----------|------------|-------------------|
| Admin    | `admin`    | `admin123`        |
| Customer | `customer` | `CustomerPass123!`|

**Admin quick-access:** Click the small **⚙ Admin** button in the bottom-right
corner of the catalog page — it logs in automatically and goes straight to the
product management page.

**To change the admin password in the database:**

```bash
python manage.py shell
```
```python
from accounts.models import User
u = User.objects.get(username="admin")
u.set_password("your_new_password")
u.save()
exit()
```

Then update the matching lines in `frontend/index.html` so the one-click button
keeps working:

```js
var ADMIN_USERNAME = "admin";
var ADMIN_PASSWORD = "admin123";
```

---

## 5. Using the app

### Customer
- Browse the catalog without logging in — no account required to view products.
- Click **Log in** (top-right) or **Add to cart** — a login modal appears
  inline without leaving the page.
- After logging in: add items, adjust quantities, check out, view order history,
  and cancel orders that are still `pending`.

### Admin
- Click **⚙ Admin** (bottom-right corner) to auto-login and open product management.
- **Add product** — name, price, stock, category, description, image, active toggle.
- **Edit / Delete** any existing product.
- **Dashboard** — total products, orders, pending orders, and revenue.
- **Orders** — filter by status, update status, inspect line items.

---

## 6. API reference

All endpoints are prefixed with `/api`. Authenticated requests send
`Authorization: Bearer <access_token>`.

**Auth**
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/auth/register/` | Creates a `customer` account |
| POST | `/auth/login/` | Returns `{ access, refresh, user }` |
| POST | `/auth/login/refresh/` | Exchanges a refresh token for a new access token |
| GET/PATCH | `/auth/me/` | View/update the logged-in user's profile |

**Products & categories**
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/products/categories/` | List categories |
| POST | `/products/categories/` | Admin only |
| GET | `/products/` | Supports `?search=&category=&ordering=&in_stock=true`, paginated |
| POST | `/products/` | Admin only, multipart for image upload |
| GET/PATCH/DELETE | `/products/<id>/` | Admin write, public read (active only) |

**Cart**
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/orders/cart/` | Current user's cart |
| POST | `/orders/cart/items/` | `{ product, quantity }` |
| PATCH | `/orders/cart/items/<item_id>/` | `{ quantity }` |
| DELETE | `/orders/cart/items/<item_id>/` | Remove one line |
| DELETE | `/orders/cart/clear/` | Empty the cart |

**Orders**
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/orders/checkout/` | `{ shipping_address, contact_phone }` — converts cart to order |
| GET | `/orders/` | Own orders (customer); all orders with `?status=&user=` filter (admin) |
| GET | `/orders/<id>/` | Owner or admin |
| PATCH | `/orders/<id>/status/` | Admin only |
| PATCH | `/orders/<id>/cancel/` | Owner or admin, only while `pending`; restores stock |

---

## 7. Project structure

```
ecommerce-app/
├── backend/
│   ├── ecommerce/        # Django project settings and URLs
│   ├── accounts/         # Custom User model, auth endpoints, permissions
│   ├── products/         # Category & Product models, seed_data command
│   ├── orders/           # Cart, CartItem, Order, OrderItem
│   ├── media/products/   # Uploaded product images
│   ├── manage.py
│   ├── setup_db.py       # One-time database + table creation script
│   ├── requirements.txt
│   └── .env.example
└── frontend/             # Served by Django at http://127.0.0.1:8000
    ├── index.html              # Catalog + floating admin button
    ├── login.html / register.html
    ├── cart.html / checkout.html / orders.html
    ├── admin-dashboard.html / admin-products.html / admin-orders.html
    ├── css/style.css
    └── js/
        ├── config.js           # API base URL (/api)
        ├── api.js, ui.js, nav.js
        ├── login-modal.js      # Inline login modal for guests
        ├── auth.js, products.js, cart.js, checkout.js, orders.js
        └── admin-dashboard.js, admin-products.js, admin-orders.js
```

---

## 8. Deploying to Neon + Render

### 8.1 Neon (PostgreSQL database)

1. Sign up at **neon.tech** → New Project → choose a region
2. Copy the **connection string** from the dashboard:
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

### 8.2 Update `settings.py` for production

Add the following to `ecommerce/settings.py` (after the existing `DATABASES` block):

```python
import dj_database_url, os

# Production database — reads DATABASE_URL env var set by Render
if os.environ.get("DATABASE_URL"):
    DATABASES["default"] = dj_database_url.config(
        default=os.environ["DATABASE_URL"],
        conn_max_age=600,
        ssl_require=True,
    )

# Serve static files without a separate server
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
```

### 8.3 Render (Django backend + frontend)

1. Push the repo to **GitHub**
2. Go to **render.com** → New → **Web Service** → connect your repo
3. Set:

| Field | Value |
|---|---|
| Root directory | `ecommerce-app/backend` |
| Build command | `pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate` |
| Start command | `gunicorn ecommerce.wsgi:application` |

4. Add environment variables in Render:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `SECRET_KEY` | A long random string |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `your-app.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | URL of your frontend (e.g. Netlify URL) |

5. Deploy — Render gives you a URL like `https://your-app.onrender.com`

### 8.4 Frontend

The frontend is plain HTML/JS. Options:
- **Netlify** — drag and drop the `frontend/` folder at netlify.com (free, instant)
- **Render Static Site** — point Root directory to `ecommerce-app/frontend`

After deploying the frontend, update `frontend/js/config.js` to point to your Render backend URL instead of `http://127.0.0.1:8000`.

---

## 9. Design notes

- **Single port:** Django serves both the REST API (`/api/`) and all frontend
  static files from port 8000. No separate frontend server needed.
- **Guest browsing:** The catalog loads without login. The login modal appears
  inline when a guest clicks "Add to cart" or "Log in".
- **Admin quick-access:** The ⚙ Admin button auto-logs in with hardcoded
  credentials — for development and demo use.
- **Auth:** JWT access/refresh tokens stored in `localStorage`. `api.js`
  silently retries on 401 with a refreshed token; logs out if refresh fails.
- **Roles:** `User.role` is `admin` or `customer`. Admin-only endpoints are
  protected server-side; the frontend guards pages with `data-requires-admin`.
- **Stock handling:** Checkout decrements stock per item; cancelling a pending
  order restores it.
