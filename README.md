Sameel Enterprises

Pharmaceutical Distribution & Order Management System

A full-stack pharmaceutical distribution management application designed to simplify medicine catalogue management, inventory tracking, pricing, customer management, and order booking.

Built to streamline pharmaceutical distribution operations through a centralized platform with role-based access and company-specific medicine catalogues.

---

Overview

Sameel Enterprises is a web-based distribution management system developed to digitize pharmaceutical business operations.

The application allows administrators and managers to manage pharmaceutical companies, medicines, customers, inventory, pricing, and orders, while order bookers can access company catalogues and submit customer orders through their individual accounts.

Key Features

Authentication & User Management

- Secure user authentication.
- Role-based access control.
- Individual accounts for multiple order bookers.
- Administrator, manager, and booker roles.

Pharmaceutical Company Management

- Manage multiple pharmaceutical companies.
- Maintain separate medicine catalogues for each company.
- Organize products by their respective companies.

Medicine Management

- Add, update, and manage medicine records.
- Company-specific medicine catalogues.
- Import medicine lists using Excel files.
- Manage medicine information and pricing.

Inventory Management

- Track available stock.
- Manage stock adjustments.
- Monitor inventory quantities.
- Maintain product availability information.

Customer Management

- Register and manage customers.
- Maintain customer information.
- Connect customer orders with their respective accounts.

Order Management

- Book customer orders.
- View and manage submitted orders.
- Approve or reject orders.
- Track order status.
- Support dispatch and delivery workflows.

Dashboard

- Overview of companies.
- Medicine catalogue statistics.
- Customer statistics.
- Pending order information.
- Stock overview.

---

Technology Stack

Frontend

- React.js
- Vite
- JavaScript
- CSS
- React Router
- Lucide React

Backend

- Node.js
- Express.js
- JavaScript (ES Modules)
- REST API
- JWT Authentication
- bcryptjs

Database

- MySQL

Additional Tools & Libraries

- Excel file processing with XLSX
- Multer for file uploads
- Helmet for HTTP security headers
- CORS
- Express Rate Limit
- Git & GitHub

---

Project Architecture

sameel-enterprises-distribution-app/
│
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── assets/
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── database/
│
├── templates/
│
├── .github/
│   └── workflows/
│
└── README.md

Note: The structure above is a simplified overview. Refer to the repository for the complete source code.

---

Installation & Setup

Follow these instructions to run the project locally.

1. Prerequisites

Install the following:

- Node.js
- npm
- MySQL Server
- Git

2. Clone the Repository

git clone https://github.com/waleed1231/sameel-enterprises-distribution-app.git

Navigate into the project:

cd sameel-enterprises-distribution-app

3. Database Setup

1. Start your MySQL server.
2. Create a database named:

CREATE DATABASE sameel_distribution;

3. Import the provided database SQL file, if available.
4. Configure the database connection in the backend environment file.

4. Backend Installation

Navigate to the backend directory:

cd backend

Install dependencies:

npm install

Create a ".env" file in the backend directory.

Configure the required environment variables according to your backend configuration.

Example:

PORT=5000
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=sameel_distribution

JWT_SECRET=your_long_random_secret_key

Important: The environment variable names must match those used by your actual backend and "db.js". Never upload your real ".env" file.

Start the backend:

npm run dev

Backend API:

http://localhost:5000

Health check:

http://localhost:5000/api/health

5. Frontend Installation

Open a second terminal.

Navigate to the frontend directory:

cd frontend

Install dependencies:

npm install

Start the development server:

npm run dev

Open the application in your browser:

http://localhost:5173

6. Running the Application

To use the complete application, both servers must be running:

Service| Local URL
React Frontend| http://localhost:5173
Node.js Backend| http://localhost:5000
API Health Check| http://localhost:5000/api/health

---

User Roles

The application supports three main user roles.

Role| Responsibilities
Admin| Manage users, companies, medicines, customers, inventory and orders
Manager| Manage business operations and order workflows
Booker| Access company catalogues and book customer orders

Access to application features is controlled through role-based authorization.

---

Security

Security-related implementation includes:

- JWT-based authentication.
- Password hashing with bcryptjs.
- Role-based authorization.
- HTTP security headers using Helmet.
- Configurable CORS.
- API rate limiting.
- Environment-based configuration for sensitive credentials.

---

Future Improvements

Planned opportunities for further development include:

- Production deployment.
- Advanced sales and inventory reports.
- Improved analytics dashboard.
- Automated low-stock notifications.
- Enhanced order tracking.
- Mobile-friendly experience.
- Advanced business reporting.

---

Project Purpose

The purpose of Sameel Enterprises is to provide a centralized digital solution for pharmaceutical distribution businesses.

The system aims to reduce manual work, improve inventory visibility, simplify medicine catalogue management, and make customer order booking more efficient.

---

Developer

Waleed Shahzad

Full-Stack Web Developer

Technologies: JavaScript | TypeScript | React.js | Node.js | Express.js | MySQL

- GitHub: https://github.com/waleed1231
- LinkedIn: https://www.linkedin.com/in/waleed-shahzad-575b36113/

---

License

This project is currently maintained as a private business application source project.

All rights reserved unless otherwise specified by the repository owner.

---

Built with React, Node.js and MySQL.