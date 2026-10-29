import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import XLSX from "xlsx";
import dotenv from "dotenv";
import pool from "./db.js";
import { requireAuth, allowRoles } from "./auth.js";

dotenv.config();
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 characters.");
}

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "Sameel Enterprises Distribution" }));

app.post("/api/auth/login", loginLimiter, asyncRoute(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: "Username and password are required." });
  const [rows] = await pool.execute("SELECT id, full_name, username, password_hash, role, is_active FROM users WHERE username = ?", [String(username).trim()]);
  const user = rows[0];
  if (!user || !user.is_active || !(await bcrypt.compare(String(password), user.password_hash))) {
    return res.status(401).json({ message: "Invalid login details." });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.full_name },
    process.env.JWT_SECRET, { expiresIn: "8h", issuer: "sameel-distribution" });
  res.json({ token, user: { id: user.id, fullName: user.full_name, username: user.username, role: user.role } });
}));

app.use("/api", requireAuth);

app.get("/api/me", (req, res) => res.json({ user: req.user }));

app.get("/api/dashboard", asyncRoute(async (req, res) => {
  const [[companies]] = await pool.query("SELECT COUNT(*) total FROM companies WHERE is_active=1");
  const [[medicines]] = await pool.query("SELECT COUNT(*) total FROM medicines WHERE is_active=1");
  const [[customers]] = await pool.query("SELECT COUNT(*) total FROM customers WHERE is_active=1");
  const [[orders]] = await pool.query("SELECT COUNT(*) total FROM orders WHERE status='pending'");
  const [[stock]] = await pool.query("SELECT COALESCE(SUM(quantity),0) total FROM inventory_batches");
  res.json({ companies: companies.total, medicines: medicines.total, customers: customers.total, pendingOrders: orders.total, stockUnits: stock.total });
}));

app.get("/api/companies", asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`SELECT c.*, COUNT(m.id) medicine_count
    FROM companies c LEFT JOIN medicines m ON m.company_id=c.id AND m.is_active=1
    WHERE c.is_active=1 GROUP BY c.id ORDER BY c.name`);
  res.json(rows);
}));
app.post("/api/companies", allowRoles("admin","manager"), asyncRoute(async (req, res) => {
  const { name, contact_person, phone, notes } = req.body || {};
  if (!String(name || "").trim()) return res.status(400).json({ message: "Company name is required." });
  const [result] = await pool.execute("INSERT INTO companies (name, contact_person, phone, notes) VALUES (?, ?, ?, ?)",
    [String(name).trim(), contact_person || null, phone || null, notes || null]);
  res.status(201).json({ id: result.insertId, message: "Company added." });
}));
app.put("/api/companies/:id", allowRoles("admin","manager"), asyncRoute(async (req, res) => {
  const { name, contact_person, phone, notes, is_active } = req.body || {};
  await pool.execute("UPDATE companies SET name=?, contact_person=?, phone=?, notes=?, is_active=? WHERE id=?",
    [String(name || "").trim(), contact_person || null, phone || null, notes || null, is_active === false ? 0 : 1, req.params.id]);
  res.json({ message: "Company updated." });
}));

app.get("/api/customers", asyncRoute(async (req, res) => {
  const search = String(req.query.q || "").trim().slice(0, 100);
  const q = `%${search}%`;

  const [rows] = await pool.execute(
    `SELECT id, name, store_name, phone, city, address
     FROM customers
     WHERE COALESCE(is_active, 1) = 1
       AND (
         ? = ''
         OR name LIKE ?
         OR store_name LIKE ?
         OR phone LIKE ?
         OR city LIKE ?
       )
     ORDER BY COALESCE(store_name, name)
     LIMIT 300`,
    [search, q, q, q, q]
  );

  res.json(rows);
}));

app.post("/api/customers", asyncRoute(async (req, res) => {
  const { name, store_name, phone, city, address } = req.body || {};
  if (!String(name || "").trim()) return res.status(400).json({ message: "Customer/contact name is required." });
  const [result] = await pool.execute("INSERT INTO customers (name,store_name,phone,city,address,created_by) VALUES (?,?,?,?,?,?)",
    [String(name).trim(),store_name||null,phone||null,city||null,address||null,req.user.id]);
  res.status(201).json({ id: result.insertId, message: "Customer added." });
}));

app.get("/api/medicines", asyncRoute(async (req, res) => {
  
  const params = [];
  let where = "m.is_active = 1 AND c.is_active = 1";

  if (req.query.company_id) {
    where += " AND m.company_id = ?";
    params.push(Number(req.query.company_id));
  }

  if (req.query.q) {
    where += ` AND (
      m.medicine_name LIKE ?
      OR m.generic_name LIKE ?
      OR m.barcode LIKE ?
    )`;

    const q = `%${String(req.query.q).slice(0, 100)}%`;
    params.push(q, q, q);
  }

  const [rows] = await pool.execute(
    `SELECT
       m.*,
       c.name AS company_name,
       COALESCE(SUM(ib.quantity), 0) AS stock_quantity
     FROM medicines m
     JOIN companies c ON c.id = m.company_id
     LEFT JOIN inventory_batches ib ON ib.medicine_id = m.id
     WHERE ${where}
     GROUP BY m.id
     ORDER BY m.medicine_name
     LIMIT 500`,
    params
  );

  res.json(rows);
}));



app.post("/api/medicines", allowRoles("admin", "manager"), asyncRoute(async (req, res) => {
  const {
    company_id,
    medicine_name,
    generic_name,
    strength,
    dosage_form,
    pack_size,
    barcode,
    unit_price,
    retail_price
  } = req.body || {};

  const companyId = Number(company_id);
  const name = String(medicine_name || "").trim();
  const pack = String(pack_size || "").trim();
  const price = Number(unit_price);

  const retail = retail_price === "" || retail_price == null
    ? null
    : Number(retail_price);

  if (!Number.isInteger(companyId) || companyId <= 0) {
    return res.status(400).json({ message: "Please select a valid company." });
  }

  if (!name) {
    return res.status(400).json({ message: "Medicine name is required." });
  }

  if (!pack) {
    return res.status(400).json({ message: "Pack size is required." });
  }

  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({ message: "Enter a valid unit price." });
  }

  if (retail !== null && (!Number.isFinite(retail) || retail < 0)) {
    return res.status(400).json({ message: "Enter a valid retail price." });
  }

  const [companies] = await pool.execute(
    "SELECT id FROM companies WHERE id = ? AND is_active = 1",
    [companyId]
  );

  if (!companies.length) {
    return res.status(400).json({ message: "Selected company was not found or is inactive." });
  }

  const [result] = await pool.execute(
    `INSERT INTO medicines
      (company_id, medicine_name, generic_name, strength, dosage_form,
       pack_size, barcode, unit_price, retail_price)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId,
      name,
      String(generic_name || "").trim() || null,
      String(strength || "").trim() || null,
      String(dosage_form || "").trim() || null,
      pack,
      String(barcode || "").trim() || null,
      price,
      retail
    ]
  );

  await pool.execute(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`,
    [
      req.user.id,
      "medicine_created",
      "medicine",
      result.insertId,
      JSON.stringify({ medicine_name: name, company_id: companyId })
    ]
  );

  res.status(201).json({
    id: result.insertId,
    message: "Medicine added successfully."
  });
}));


app.get("/api/stock", allowRoles("admin","manager"), asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`SELECT m.id,m.medicine_name,m.strength,m.pack_size,m.unit_price,m.retail_price,
    c.name company_name,COALESCE(SUM(ib.quantity),0) stock_quantity,
    MIN(ib.expiry_date) nearest_expiry
    FROM medicines m JOIN companies c ON c.id=m.company_id
    LEFT JOIN inventory_batches ib ON ib.medicine_id=m.id
    WHERE m.is_active=1 GROUP BY m.id ORDER BY c.name,m.medicine_name LIMIT 2000`);
  res.json(rows);
}));

app.put("/api/medicines/:id/pricing", allowRoles("admin","manager"), asyncRoute(async (req, res) => {
  const price = Number(req.body.unit_price);
  const retail = req.body.retail_price === "" || req.body.retail_price == null ? null : Number(req.body.retail_price);
  if (!Number.isFinite(price) || price < 0 || (retail !== null && (!Number.isFinite(retail) || retail < 0))) {
    return res.status(400).json({ message: "Enter valid non-negative prices." });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute("SELECT unit_price FROM medicines WHERE id=? FOR UPDATE", [req.params.id]);
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ message: "Medicine not found." }); }
    await conn.execute("UPDATE medicines SET unit_price=?,retail_price=? WHERE id=?", [price,retail,req.params.id]);
    if (Number(rows[0].unit_price) !== price) {
      await conn.execute("INSERT INTO price_history (medicine_id,old_unit_price,new_unit_price,changed_by,source) VALUES (?,?,?,?, 'manual')",
        [req.params.id,rows[0].unit_price,price,req.user.id]);
    }
    await conn.commit();
    res.json({ message: "Price updated." });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

app.post("/api/stock/adjust", allowRoles("admin","manager"), asyncRoute(async (req, res) => {
  const medicineId = Number(req.body.medicine_id);
  const qty = Number(req.body.quantity);
  const batchNo = String(req.body.batch_no || "").trim();
  const expiry = req.body.expiry_date || null;
  if (!Number.isInteger(medicineId) || !Number.isFinite(qty) || qty < 0) {
    return res.status(400).json({ message: "Medicine and non-negative stock quantity are required." });
  }
  await pool.execute(`INSERT INTO inventory_batches (medicine_id,batch_no,expiry_date,quantity)
    VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE expiry_date=VALUES(expiry_date),quantity=VALUES(quantity)`,
    [medicineId,batchNo,expiry,qty]);
  res.json({ message: "Stock batch saved. Quantity was set to the supplied balance." });
}));

app.post("/api/users", allowRoles("admin"), asyncRoute(async (req, res) => {
  const { full_name, username, password, role } = req.body || {};
  if (!String(full_name||"").trim() || !String(username||"").trim() || String(password||"").length < 12) {
    return res.status(400).json({ message: "Name, username and a password of at least 12 characters are required." });
  }
  if (!["manager","booker"].includes(role)) return res.status(400).json({ message: "Role must be manager or booker." });
  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute("INSERT INTO users (full_name,username,password_hash,role) VALUES (?,?,?,?)",
    [full_name.trim(),username.trim(),hash,role]);
  res.status(201).json({ id: result.insertId, message: "User created." });
}));

app.get("/api/orders", asyncRoute(async (req, res) => {
  const params = [];
  let where = "1=1";
  if (req.user.role === "booker") { where += " AND o.booked_by=?"; params.push(req.user.id); }
  if (req.query.status) { where += " AND o.status=?"; params.push(String(req.query.status)); }
  const [rows] = await pool.execute(`SELECT o.*,cu.name customer_name,cu.store_name,c.name company_name,u.full_name booker_name
    FROM orders o JOIN customers cu ON cu.id=o.customer_id JOIN companies c ON c.id=o.company_id
    JOIN users u ON u.id=o.booked_by WHERE ${where} ORDER BY o.created_at DESC LIMIT 500`, params);
  res.json(rows);
}));

app.get("/api/orders/:id", asyncRoute(async (req, res) => {
  const [orders] = await pool.execute(`SELECT o.*,cu.name customer_name,cu.store_name,c.name company_name
    FROM orders o JOIN customers cu ON cu.id=o.customer_id JOIN companies c ON c.id=o.company_id WHERE o.id=?`, [req.params.id]);
  if (!orders.length) return res.status(404).json({ message: "Order not found." });
  if (req.user.role === "booker" && Number(orders[0].booked_by) !== Number(req.user.id))
    return res.status(403).json({ message: "You cannot view this order." });
  const [items] = await pool.execute("SELECT * FROM order_items WHERE order_id=? ORDER BY id", [req.params.id]);
  res.json({ ...orders[0], items });
}));

app.post("/api/orders", asyncRoute(async (req, res) => {
  const { customer_id, company_id, items, notes } = req.body || {};
  if (!Number.isInteger(Number(customer_id)) || !Number.isInteger(Number(company_id)) || !Array.isArray(items) || items.length < 1 || items.length > 200) {
    return res.status(400).json({ message: "Select a customer, one company and at least one item (maximum 200)." });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [customer] = await conn.execute("SELECT id FROM customers WHERE id=? AND is_active=1", [customer_id]);
    const [company] = await conn.execute("SELECT id FROM companies WHERE id=? AND is_active=1", [company_id]);
    if (!customer.length || !company.length) throw Object.assign(new Error("Select a valid customer and company."), { status: 400 });
    const clean = [];
    let subtotal = 0;
    for (const item of items) {
      const id = Number(item.medicine_id), quantity = Number(item.quantity);
      if (!Number.isInteger(id) || !Number.isFinite(quantity) || quantity <= 0) throw Object.assign(new Error("Every order quantity must be greater than zero."), { status: 400 });
      const [meds] = await conn.execute("SELECT id,company_id,medicine_name,pack_size,unit_price FROM medicines WHERE id=? AND is_active=1", [id]);
      if (!meds.length || Number(meds[0].company_id) !== Number(company_id)) throw Object.assign(new Error("Every medicine must belong to the selected company."), { status: 400 });
      const m = meds[0], line = Number(m.unit_price) * quantity;
      clean.push({ ...m, quantity, line });
      subtotal += line;
    }
    const orderNo = `SE-${Date.now()}-${Math.floor(Math.random()*900+100)}`;
    const [result] = await conn.execute(`INSERT INTO orders
      (order_no,customer_id,company_id,booked_by,status,subtotal,discount,total,notes)
      VALUES (?,?,?,?,'pending',?,0,?,?)`,
      [orderNo,customer_id,company_id,req.user.id,subtotal,subtotal,notes||null]);
    for (const m of clean) {
      await conn.execute(`INSERT INTO order_items
        (order_id,medicine_id,medicine_name_snapshot,pack_size_snapshot,unit_price,quantity,line_total)
        VALUES (?,?,?,?,?,?,?)`,
        [result.insertId,m.id,m.medicine_name,m.pack_size,m.unit_price,m.quantity,m.line]);
    }
    await conn.execute("INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)",
      [req.user.id,"order_created","order",result.insertId,JSON.stringify({order_no:orderNo,company_id,subtotal})]);
    await conn.commit();
    res.status(201).json({ id: result.insertId, order_no: orderNo, total: subtotal, message: "Order booked and sent for approval." });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

app.put("/api/orders/:id/status", allowRoles("admin","manager"), asyncRoute(async (req, res) => {
  const { status } = req.body || {};
  const allowed = ["approved","rejected","dispatched","delivered","cancelled"];
  if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid order status." });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [orders] = await conn.execute("SELECT * FROM orders WHERE id=? FOR UPDATE", [req.params.id]);
    if (!orders.length) { await conn.rollback(); return res.status(404).json({ message: "Order not found." }); }
    const order = orders[0];
    if (order.status === status) { await conn.rollback(); return res.json({ message: "Order already has this status." }); }
    if (status === "approved") {
      if (order.status !== "pending") throw Object.assign(new Error("Only pending orders can be approved."), { status: 409 });
      const [items] = await conn.execute("SELECT medicine_id,quantity,medicine_name_snapshot FROM order_items WHERE order_id=?", [order.id]);
      for (const item of items) {
        const [batches] = await conn.execute("SELECT id,quantity,batch_no FROM inventory_batches WHERE medicine_id=? AND quantity>0 ORDER BY expiry_date IS NULL,expiry_date,id FOR UPDATE", [item.medicine_id]);
        const totalStock = batches.reduce((sum,b)=>sum+Number(b.quantity),0);
        if (totalStock < Number(item.quantity)) throw Object.assign(new Error(`Insufficient stock for ${item.medicine_name_snapshot}. Available: ${totalStock}`), { status: 409 });
        let remaining = Number(item.quantity);
        for (const batch of batches) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, Number(batch.quantity));
          await conn.execute("UPDATE inventory_batches SET quantity=quantity-? WHERE id=?", [take,batch.id]);
          remaining -= take;
        }
      }
      await conn.execute("UPDATE orders SET status='approved',approved_by=?,approved_at=NOW() WHERE id=?", [req.user.id,order.id]);
    } else {
      const transitions = {
        pending: ["rejected","cancelled"],
        approved: ["dispatched","cancelled"],
        dispatched: ["delivered"],
        delivered: [],
        rejected: [],
        cancelled: []
      };
      if (!(transitions[order.status] || []).includes(status)) throw Object.assign(new Error(`Cannot change ${order.status} to ${status}.`), { status: 409 });
      await conn.execute("UPDATE orders SET status=? WHERE id=?", [status,order.id]);
    }
    await conn.execute("INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details) VALUES (?,?,?,?,?)",
      [req.user.id,"order_status_changed","order",order.id,JSON.stringify({from:order.status,to:status})]);
    await conn.commit();
    res.json({ message: `Order marked ${status}.` });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

app.post(
  "/api/imports/medicines",
  
  allowRoles("admin", "manager"),
  upload.single("file"),
  asyncRoute(async (req, res) => {
    console.log("NEW IMPORT ROUTE RUNNING:", import.meta.url);
    if (!req.file) {
      return res.status(400).json({ message: "Choose an Excel file." });
    }

    if (!/\.(xlsx|xls|csv)$/i.test(req.file.originalname)) {
      return res.status(400).json({
        message: "Only .xlsx, .xls and .csv files are accepted."
      });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: true
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ message: "The workbook has no worksheets." });
    }

    const sheet = workbook.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false
    });

    if (!grid.length) {
      return res.status(400).json({ message: "The worksheet is empty." });
    }

    if (grid.length > 5000) {
      return res.status(400).json({
        message: "Maximum 5,000 rows per upload."
      });
    }

    const normalizeKey = value =>
      String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const normalizeText = value =>
      String(value ?? "").trim();

    const headerAliases = {
      product: ["product", "medicine_name", "product_name", "name", "item_name"],
      pack: ["pack", "pack_size", "packing", "package"],
      price: [
        "t_p", "tp", "t_p_", "trade_price", "unit_price",
        "price", "purchase_price", "cost_price"
      ],
      company: ["company", "company_name", "supplier", "supplier_name"],
      strength: ["strength"],
      form: ["dosage_form", "form"],
      generic: ["generic_name", "generic"],
      barcode: ["barcode", "bar_code"],
      retail: ["retail_price", "sale_price", "selling_price"],
      quantity: ["opening_stock", "stock_quantity", "quantity", "qty"],
      batch: ["batch_no", "batch", "lot_no"],
      expiry: ["expiry_date", "expiry"]
    };

    const findHeaderIndex = (headers, aliases) =>
      headers.findIndex(header => aliases.includes(normalizeKey(header)));

    // Find the actual column-heading row. Supplier files can have title rows first.
    let headerIndex = -1;
    let headerColumns = null;

    for (let i = 0; i < grid.length; i++) {
      const headers = grid[i].map(normalizeKey);

      const productColumn = findHeaderIndex(headers, headerAliases.product);
      const priceColumn = findHeaderIndex(headers, headerAliases.price);

      if (productColumn !== -1 && priceColumn !== -1) {
        headerIndex = i;
        headerColumns = headers;
        break;
      }
    }

    if (headerIndex === -1) {
      return res.status(400).json({
        message:
          "Could not find the required Product and T.P/Price columns. Please check the Excel headings."
      });
    }

    const column = key =>
      findHeaderIndex(headerColumns, headerAliases[key] || []);

    const productCol = column("product");
    const packCol = column("pack");
    const priceCol = column("price");
    const companyCol = column("company");
    const strengthCol = column("strength");
    const formCol = column("form");
    const genericCol = column("generic");
    const barcodeCol = column("barcode");
    const retailCol = column("retail");
    const quantityCol = column("quantity");
    const batchCol = column("batch");
    const expiryCol = column("expiry");

    // Try to get the supplier/company name from a title above the headings.
    let titleCompany = "";

    for (let i = headerIndex - 1; i >= 0 && !titleCompany; i--) {
      const title = grid[i].map(normalizeText).filter(Boolean).join(" ");
      const match = title.match(
        /\b(CCL(?:\s+CONSOLIDATED)?(?:\s+LAB(?:ORATORIES?)?\.?)?|[A-Z][A-Z0-9&.' -]*(?:PHARMA(?:CEUTICALS?)?|LAB(?:ORATORIES?)?))\b/i
      );

      if (match) titleCompany = match[0].trim();
    }

    const dataRows = grid
      .slice(headerIndex + 1)
      .map((cells, index) => ({
        cells,
        excelRow: headerIndex + index + 2
      }))
      .filter(({ cells }) => cells.some(value => normalizeText(value) !== ""));

    if (!dataRows.length) {
      return res.status(400).json({
        message: "No medicine rows were found below the column headings."
      });
    }

    const conn = await pool.getConnection();

    const errors = [];
    const summary = {
      created: 0,
      updated: 0,
      stockRows: 0,
      skipped: 0
    };

    try {
      await conn.beginTransaction();

      for (const { cells, excelRow } of dataRows) {
        const get = index => index === -1 ? "" : cells[index];

        const medicineName = normalizeText(get(productCol));
        const pack = normalizeText(get(packCol)) || "1 unit";
        const rawPrice = get(priceCol);
        const price =
          rawPrice === "" || rawPrice === null
            ? NaN
            : Number(String(rawPrice).replace(/,/g, "").trim());

        // Ignore blank/non-product rows.
        if (!medicineName) {
          summary.skipped++;
          continue;
        }

        if (!Number.isFinite(price) || price < 0) {
          errors.push({
            row: excelRow,
            message: `Invalid or missing price for "${medicineName}".`
          });
          continue;
        }

        let companyName = normalizeText(get(companyCol)) || titleCompany;

        if (!companyName) {
          errors.push({
            row: excelRow,
            message:
              `Company is missing for "${medicineName}". Add a Company column or include the company name in the rows above the headings.`
          });
          continue;
        }

        const strength = normalizeText(get(strengthCol)) || null;
        const form = normalizeText(get(formCol)) || null;
        const generic = normalizeText(get(genericCol)) || null;
        const barcode = normalizeText(get(barcodeCol)) || null;

        let retail = null;
        if (retailCol !== -1 && normalizeText(get(retailCol)) !== "") {
          retail = Number(String(get(retailCol)).replace(/,/g, "").trim());

          if (!Number.isFinite(retail) || retail < 0) {
            errors.push({
              row: excelRow,
              message: `Invalid retail price for "${medicineName}".`
            });
            continue;
          }
        }

        let expiry = null;
        if (expiryCol !== -1 && normalizeText(get(expiryCol)) !== "") {
          const rawExpiry = get(expiryCol);
          const date =
            rawExpiry instanceof Date
              ? rawExpiry
              : new Date(String(rawExpiry));

          if (Number.isNaN(date.getTime())) {
            errors.push({
              row: excelRow,
              message: `Invalid expiry date for "${medicineName}".`
            });
            continue;
          }

          expiry = date.toISOString().slice(0, 10);
        }

        const [companies] = await conn.execute(
          "SELECT id FROM companies WHERE name = ? AND is_active = 1 LIMIT 1",
          [companyName]
        );

        if (!companies.length) {
          errors.push({
            row: excelRow,
            message:
              `Company "${companyName}" was not found. Add this company in your app first, then import again.`
          });
          continue;
        }

        const companyId = companies[0].id;

        const [found] = await conn.execute(
          `SELECT id, unit_price
           FROM medicines
           WHERE company_id = ?
             AND medicine_name = ?
             AND strength <=> ?
             AND pack_size = ?
           LIMIT 1`,
          [companyId, medicineName, strength, pack]
        );

        let medicineId;

        if (found.length) {
          medicineId = found[0].id;

          await conn.execute(
            `UPDATE medicines
             SET generic_name = ?,
                 dosage_form = ?,
                 barcode = ?,
                 unit_price = ?,
                 retail_price = ?,
                 is_active = 1
             WHERE id = ?`,
            [generic, form, barcode, price, retail, medicineId]
          );

          if (Number(found[0].unit_price) !== price) {
            await conn.execute(
              `INSERT INTO price_history
               (medicine_id, old_unit_price, new_unit_price, changed_by, source)
               VALUES (?, ?, ?, ?, 'excel')`,
              [medicineId, found[0].unit_price, price, req.user.id]
            );
          }

          summary.updated++;
        } else {
          const [insert] = await conn.execute(
            `INSERT INTO medicines
             (company_id, medicine_name, generic_name, strength,
              dosage_form, pack_size, barcode, unit_price, retail_price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              companyId,
              medicineName,
              generic,
              strength,
              form,
              pack,
              barcode,
              price,
              retail
            ]
          );

          medicineId = insert.insertId;
          summary.created++;
        }

        // A supplier price list normally has no stock information.
        // Do not create or overwrite stock unless a quantity is explicitly supplied.
        if (
          quantityCol !== -1 &&
          normalizeText(get(quantityCol)) !== ""
        ) {
          const qty = Number(
            String(get(quantityCol)).replace(/,/g, "").trim()
          );

          if (!Number.isFinite(qty) || qty < 0) {
            errors.push({
              row: excelRow,
              message: `Invalid stock quantity for "${medicineName}". The medicine price was imported, but stock was not changed.`
            });
            continue;
          }

          const batchNo =
            normalizeText(get(batchCol)) || "OPENING";

          await conn.execute(
            `INSERT INTO inventory_batches
             (medicine_id, batch_no, expiry_date, quantity)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               expiry_date = COALESCE(VALUES(expiry_date), expiry_date),
               quantity = VALUES(quantity)`,
            [medicineId, batchNo, expiry, qty]
          );

          summary.stockRows++;
        }
      }

      await conn.execute(
        `INSERT INTO audit_logs
         (user_id, action, entity_type, details)
         VALUES (?, ?, ?, ?)`,
        [
          req.user.id,
          "medicine_excel_import",
          "import",
          JSON.stringify({
            filename: req.file.originalname,
            rows: dataRows.length,
            created: summary.created,
            updated: summary.updated,
            stockRows: summary.stockRows,
            skipped: summary.skipped,
            errors: errors.length
          })
        ]
      );

      await conn.commit();

      res.json({
        message: "Import processed. Review any row errors below.",
        totalRows: dataRows.length,
        created: summary.created,
        updated: summary.updated,
        stockRows: summary.stockRows,
        skipped: summary.skipped,
        errorCount: errors.length,
        errors
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  })
);

app.get("/api/reports/orders.csv", allowRoles("admin","manager"), asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`SELECT o.order_no,o.created_at,o.status,c.name company,cu.name customer,cu.store_name,u.full_name booker,
    o.subtotal,o.discount,o.total FROM orders o JOIN companies c ON c.id=o.company_id
    JOIN customers cu ON cu.id=o.customer_id JOIN users u ON u.id=o.booked_by ORDER BY o.created_at DESC`);
  const quote = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const csv = ["Order No,Date,Status,Company,Customer,Store,Order Booker,Subtotal,Discount,Total",
    ...rows.map(r=>[r.order_no,r.created_at,r.status,r.company,r.customer,r.store_name,r.booker,r.subtotal,r.discount,r.total].map(quote).join(","))].join("\r\n");
  res.setHeader("Content-Type","text/csv; charset=utf-8");
  res.setHeader("Content-Disposition",'attachment; filename="sameel-orders.csv"');
  res.send("\uFEFF"+csv);
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message:"This record already exists. Check duplicate names or company medicines." });
  if (err instanceof multer.MulterError) return res.status(400).json({ message:"Upload failed: file may be too large." });
  res.status(err.status || 500).json({ message: err.status ? err.message : "Server error. Check the backend terminal." });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`Sameel Distribution API running at http://localhost:${port}`));
