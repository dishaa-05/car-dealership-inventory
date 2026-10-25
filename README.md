# DriveHub — Car Dealership Inventory System

A full-stack car dealership inventory management system built with **FastAPI** (Python), **React**, **Tailwind CSS**, and **SQLite**.

---

## Project Overview

DriveHub allows a car dealership to manage its vehicle inventory. Users can browse and purchase vehicles. Admins can add, update, delete, and restock vehicles.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy, SQLite |
| Auth | JWT (PyJWT), password hashing (pwdlib) |
| Frontend | React 19, Vite, Tailwind CSS v4 |
| Testing | pytest, FastAPI TestClient |

---

## Project Structure

```
car-dealership-inventory/
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI app, all routes
│   │   ├── models.py      # SQLAlchemy models (User, Vehicle)
│   │   ├── database.py    # DB engine and session
│   │   └── __init__.py
│   ├── tests/             # pytest test suite
│   ├── seed_admin.py      # Creates default admin account
│   └── requirements.txt
├── frontend-react/
│   ├── src/
│   │   └── App.jsx        # Single-page React application
│   ├── package.json
│   └── vite.config.js
├── README.md
└── PROMPTS.md
```

---

## Setup & Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Seed the default admin account (run once)
python seed_admin.py

# Start the backend server
uvicorn app.main:app --reload
```

Backend runs at: http://localhost:8000  
API docs at: http://localhost:8000/docs

### Frontend

```bash
cd frontend-react

npm install
npm run dev
```

Frontend runs at: http://localhost:5173

---

## Default Admin Credentials

| Field | Value |
|---|---|
| Email | admin@drivehub.com |
| Password | Admin@1234 |

> Run `python seed_admin.py` from the `backend/` directory before first login.

---

## API Endpoints

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /api/auth/register | Public | Register a new user |
| POST | /api/auth/login | Public | Login, returns JWT |
| POST | /api/auth/register-admin | Public + secret | Register an admin user |

### Vehicles
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | /api/vehicles | User | List all vehicles |
| POST | /api/vehicles | User | Add a vehicle |
| GET | /api/vehicles/search | User | Search by make/model/category/price |
| PUT | /api/vehicles/:id | User | Update a vehicle |
| DELETE | /api/vehicles/:id | Admin | Delete a vehicle |
| POST | /api/vehicles/:id/purchase | User | Purchase (decrements stock) |
| POST | /api/vehicles/:id/restock | Admin | Restock (increments stock) |

---

## Running Tests

```bash
cd backend
.venv\Scripts\python.exe -m pytest tests/ -v
```

---

## Screenshots

> _Add screenshots of the application here._

---

## My AI Usage

> **Note:** This section must be filled in by the developer with their personal AI usage details.

### Tools Used
- [Describe which AI tools you used — e.g. GitHub Copilot, ChatGPT, Gemini, Kiro, etc.]

### How I Used Them
- [Describe specific use cases — e.g. "Used Kiro to generate the initial FastAPI boilerplate and test stubs, then manually added validation logic and refined the auth flow."]

### Reflection
- [Describe how AI impacted your workflow — what it helped with, what you had to fix or verify yourself, how it changed your development speed.]

---

## Test Report

See `test-report.txt` in the repository root for the full pytest output.
