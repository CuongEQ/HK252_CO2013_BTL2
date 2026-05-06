# Web Application - Shipping System

Ung dung web full-stack duoc to chuc thanh 2 phan:

- `backend`: Node.js + Express + MySQL (goi Stored Procedure/Function)
- `frontend`: React + Vite + TailwindCSS

## 1) Cai dat Backend

```bash
cd web/backend
npm install
cp .env.example .env
# Chinh sua thong tin DB trong .env
npm run dev
```

Backend mac dinh chay tai `http://localhost:4000`.

## 2) Cai dat Frontend

```bash
cd web/frontend
npm install
cp .env.example .env
npm run dev
```

Frontend mac dinh chay tai `http://localhost:5173`.

## 3) API noi bat

- `GET /api/customer/orders`
- `POST /api/customer/orders`
- `PUT /api/customer/orders/:id`
- `DELETE /api/customer/orders/:id`
- `GET /api/customer/finance-dashboard`
- `GET /api/driver/assigned-orders`
- `POST /api/driver/pickup/create`
- `POST /api/driver/pickup/complete`
- `POST /api/driver/delivery/create`
- `POST /api/driver/delivery/complete`
- `POST /api/staff/checkin`
- `POST /api/staff/checkout`
- `GET /api/staff/hub-revenue-statistics`
- `GET /api/orders/:id/lifecycle`

## 4) Bat loi SQLSTATE 45000

Backend da bat loi business tu MySQL (`SIGNAL SQLSTATE '45000'`) va tra ve HTTP 400 kem `message` de frontend hien thi Toast Notification.
