# Sameel Enterprises Distribution Order Booking App

A beginner-friendly starter project with:
- React + Vite frontend
- Node.js + Express API
- MySQL database
- Separate CSS file for each page/component
- Multiple order booker logins
- Separate medicine catalogue per pharmaceutical company
- Excel import for medicine lists
- Stock, pricing, customers, order booking and approval workflow

## Requirements
- Node.js 20+
- XAMPP / MySQL
- VS Code

## 1. Database setup
1. Start MySQL in XAMPP.
2. Open phpMyAdmin.
3. Import `database/schema.sql`.
4. This creates database `sameel_distribution`.

Create a MySQL user for the app (recommended). In phpMyAdmin SQL tab, replace the password:

```sql
CREATE USER 'sameel_app'@'localhost' IDENTIFIED BY 'ChangeThis_Strong_Password_123!';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX
ON sameel_distribution.* TO 'sameel_app'@'localhost';
FLUSH PRIVILEGES;
```

## 2. Backend setup
Open terminal in `backend`:

```powershell
npm install
```

Copy `.env.example` to `.env`, then edit DB credentials and set a long random JWT_SECRET.

```powershell
npm run seed:admin
npm run dev
```

Default local API: `http://localhost:5000`
Health check: `http://localhost:5000/api/health`

The seed command creates an admin from `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`.
Change the password after first login. Do not deploy using example secrets.

## 3. Frontend setup
Open a second terminal in `frontend`:

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## 4. Initial workflow
1. Sign in as admin.
2. Add pharmaceutical companies.
3. Add customers.
4. Add order booker users.
5. Upload medicines from the Excel import page. Download/use `templates/medicine-import-template.csv` as a starting template. Excel `.xlsx` is supported.
6. Set prices and opening stock on the Stock & Prices page.
7. Order bookers sign in, select a customer, choose a company and add products to an order.
8. Admin/manager approves orders. Stock is deducted only when an order is approved, inside a database transaction.

## Excel columns
Required: `company`, `medicine_name`, `pack_size`, `unit_price`, `opening_stock`
Optional: `generic_name`, `strength`, `dosage_form`, `barcode`, `batch_no`, `expiry_date`, `retail_price`

Every imported row must specify a company name. A product is unique by company + medicine name + strength + pack size. Imports update matching products for that company; they never silently move a medicine to another company.

## Security and production notes
- This is a starter app. Test it with non-production data before real use.
- Use HTTPS in production, strong unique secrets, a dedicated least-privilege DB account, database backups and restricted server access.
- Uploaded files are parsed in memory and not stored publicly. Restrict upload sizes.
- Stock is deducted at approval, not at initial order submission.
- No public self-registration is provided. Admin creates staff accounts.
