
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2
} from "lucide-react";
import api from "../services/api";
import { money } from "../utils/format";
import "./OrderPage.css";

/**
 * Normalize common API response formats.
 */
function getList(data, keys = []) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) {
      return data.data[key];
    }
  }

  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.rows)) return data.rows;

  return [];
}

function firstValue(...values) {
  return values.find(
    value =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  );
}

function normalizeCustomer(customer) {
  const id = firstValue(
    customer.id,
    customer.customer_id,
    customer.customerId,
    customer.store_id,
    customer.storeId,
    customer.medical_store_id,
    customer.medicalStoreId
  );

  return {
    ...customer,
    id,
    name:
      firstValue(
        customer.name,
        customer.customer_name,
        customer.contact_person,
        customer.contact_name
      ) || "",
    store_name:
      firstValue(
        customer.store_name,
        customer.medical_store_name,
        customer.medicalStoreName,
        customer.shop_name,
        customer.customer_name,
        customer.name
      ) || "",
    city: customer.city || ""
  };
}

function normalizeCompany(company) {
  return {
    ...company,
    id: firstValue(
      company.id,
      company.company_id,
      company.companyId
    ),
    name:
      firstValue(
        company.name,
        company.company_name,
        company.company
      ) || ""
  };
}

function normalizeMedicine(medicine) {
  return {
    ...medicine,
    id: firstValue(
      medicine.id,
      medicine.medicine_id,
      medicine.medicineId,
      medicine.product_id
    ),
    medicine_name:
      firstValue(
        medicine.medicine_name,
        medicine.name,
        medicine.product_name
      ) || "",
    unit_price: Number(
      firstValue(
        medicine.unit_price,
        medicine.price,
        medicine.trade_price
      ) ?? 0
    ),
    stock_quantity: Number(
      firstValue(
        medicine.stock_quantity,
        medicine.stock,
        medicine.quantity
      ) ?? 0
    )
  };
}

function validId(value) {
  return (
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
  );
}

export default function OrderPage() {
  const [companies, setCompanies] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [customer, setCustomer] = useState("");
  const [company, setCompany] = useState("");

  const [medicines, setMedicines] = useState([]);
  const [cart, setCart] = useState([]);

  const [q, setQ] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [busy, setBusy] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [medicinesLoading, setMedicinesLoading] = useState(false);

  // Load customers and pharmaceutical companies.
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setCustomersLoading(true);
      setCompaniesLoading(true);

      const [customerResult, companyResult] =
        await Promise.allSettled([
          api.get("/customers"),
          api.get("/companies")
        ]);

      if (cancelled) return;

      if (customerResult.status === "fulfilled") {
        const rawData = customerResult.value.data;

        const normalized = getList(rawData, [
          "customers",
          "results",
          "rows"
        ])
          .filter(item => item && typeof item === "object")
          .map(normalizeCustomer)
          .filter(item => validId(item.id));

        setCustomers(normalized);

        console.log(
          "Customers API:",
          normalized.length,
          "usable customer records",
          normalized
        );

        if (normalized.length === 0) {
          console.warn(
            "No usable customer IDs found. Actual API response:",
            rawData
          );
        }
      } else {
        const reason = customerResult.reason;

        console.error(
          "Customers API error:",
          reason?.response?.data || reason
        );

        setCustomers([]);
        setError(
          reason?.response?.data?.message ||
          "Could not load customers. Check the /customers API."
        );
      }

      if (companyResult.status === "fulfilled") {
        const rawData = companyResult.value.data;

        const normalized = getList(rawData, [
          "companies",
          "results",
          "rows"
        ])
          .filter(item => item && typeof item === "object")
          .map(normalizeCompany)
          .filter(item => validId(item.id));

        setCompanies(normalized);

        console.log(
          "Companies API:",
          normalized.length,
          "usable company records",
          normalized
        );

        if (normalized.length === 0) {
          console.warn(
            "No usable company IDs found. Actual API response:",
            rawData
          );
        }
      } else {
        const reason = companyResult.reason;

        console.error(
          "Companies API error:",
          reason?.response?.data || reason
        );

        setCompanies([]);
        setError(
          reason?.response?.data?.message ||
          "Could not load companies. Check the /companies API."
        );
      }

      setCustomersLoading(false);
      setCompaniesLoading(false);
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load medicines belonging to the selected company.
  useEffect(() => {
    let cancelled = false;

    setCart([]);
    setQ("");
    setMedicines([]);
    setError("");
    setSuccess("");

    if (!company) {
      setMedicinesLoading(false);
      return undefined;
    }

    async function loadMedicines() {
      setMedicinesLoading(true);

      try {
        const response = await api.get("/medicines", {
          params: {
            company_id: company
          }
        });

        if (cancelled) return;

        const list = getList(response.data, [
          "medicines",
          "results",
          "rows"
        ]);

        const normalized = list
          .filter(item => item && typeof item === "object")
          .map(normalizeMedicine)
          .filter(item => validId(item.id));

        setMedicines(normalized);

        console.log(
          "Medicines loaded for company:",
          company,
          normalized
        );
      } catch (e) {
        if (!cancelled) {
          console.error(
            "Medicines API error:",
            e.response?.data || e
          );

          setMedicines([]);
          setError(
            e.response?.data?.message ||
            "Could not load medicines for this company."
          );
        }
      } finally {
        if (!cancelled) {
          setMedicinesLoading(false);
        }
      }
    }

    loadMedicines();

    return () => {
      cancelled = true;
    };
  }, [company]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return medicines.filter(m =>
      [
        m.medicine_name,
        m.generic_name,
        m.strength,
        m.pack_size
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [medicines, q]);

  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum +
          Number(item.unit_price) * Number(item.quantity),
        0
      ),
    [cart]
  );

  function add(medicine) {
    setError("");
    setSuccess("");

    setCart(old => {
      const existing = old.find(
        item => String(item.id) === String(medicine.id)
      );

      if (existing) {
        return old.map(item =>
          String(item.id) === String(medicine.id)
            ? {
                ...item,
                quantity: Number(item.quantity) + 1
              }
            : item
        );
      }

      return [...old, { ...medicine, quantity: 1 }];
    });
  }

  function quantity(id, delta) {
    setCart(old =>
      old.map(item =>
        String(item.id) === String(id)
          ? {
              ...item,
              quantity: Math.max(
                1,
                Number(item.quantity) + delta
              )
            }
          : item
      )
    );
  }

  function removeItem(id) {
    setCart(old =>
      old.filter(item => String(item.id) !== String(id))
    );
  }

  async function submit() {
    setError("");
    setSuccess("");

    if (customersLoading || companiesLoading) {
      setError(
        "Please wait while customer and company data loads."
      );
      return;
    }

    // Resolve the selected customer against the loaded list.
    const selectedCustomer = customers.find(
      item => String(item.id) === String(customer)
    );

    console.log("Selected customer value:", customer);
    console.log(
      "Available customer IDs:",
      customers.map(item => ({
        id: item.id,
        store_name: item.store_name,
        name: item.name
      }))
    );

    if (!selectedCustomer || !validId(selectedCustomer.id)) {
      setError(
        customers.length === 0
          ? "No valid customers were loaded. Check the /customers API response."
          : "Please select a valid customer / medical store."
      );
      return;
    }

    const selectedCompany = companies.find(
      item => String(item.id) === String(company)
    );

    if (!selectedCompany || !validId(selectedCompany.id)) {
      setError("Please select a valid pharmaceutical company.");
      return;
    }

    if (cart.length === 0) {
      setError("Please add at least one medicine to the order.");
      return;
    }

    const invalidItem = cart.find(
      item =>
        !Number.isFinite(Number(item.id)) ||
        !Number.isFinite(Number(item.quantity)) ||
        Number(item.quantity) < 1 ||
        !Number.isFinite(Number(item.unit_price)) ||
        Number(item.unit_price) < 0
    );

    if (invalidItem) {
      setError("A medicine has an invalid ID, price, or quantity.");
      return;
    }

    if (
      !Number.isFinite(Number(selectedCustomer.id)) ||
      !Number.isFinite(Number(selectedCompany.id))
    ) {
      setError(
        "The customer or company ID is not numeric. Check the IDs returned by your database API."
      );
      return;
    }

    setBusy(true);

    try {
      const payload = {
        customer_id: Number(selectedCustomer.id),
        company_id: Number(selectedCompany.id),
        items: cart.map(item => ({
          medicine_id: Number(item.id),
          quantity: Number(item.quantity)
        })),
        notes: notes.trim()
      };

      console.log("Submitting order payload:", payload);

      const response = await api.post("/orders", payload);
      const data = response.data || {};

      setSuccess(
        `Order ${
          data.order_no || data.id
            ? `#${data.order_no || data.id} `
            : ""
        }booked successfully. Total: ${money(
          data.total ?? total
        )}. It is pending approval.`
      );

      setCart([]);
      setNotes("");
    } catch (e) {
      console.error(
        "Order booking failed:",
        e.response?.data || e
      );

      setError(
        e.response?.data?.message ||
        e.response?.data?.error ||
        "Could not book order. Check the backend response."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="order-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SALES WORKSPACE</span>
          <h1>Book a new order</h1>
          <p>
            Select one company per order. Create another
            order for another company.
          </p>
        </div>

        <div className="order-badge">
          <ShoppingCart size={17} />
          {cart.length} items
        </div>
      </div>

      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert success" role="status">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      <div className="order-layout">
        <section className="panel order-products">
          <div className="order-step">
            <span>01</span>
            <div>
              <h2>Customer &amp; company</h2>
              <p>
                Each order is linked to one customer and one
                company.
              </p>
            </div>
          </div>

          <div className="order-select-grid">
            <label htmlFor="order-customer">
              Customer / medical store *
              <select
                id="order-customer"
                name="customer"
                value={customer}
                onChange={e => {
                  setCustomer(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                disabled={customersLoading}
                required
              >
                <option value="">
                  {customersLoading
                    ? "Loading customers..."
                    : customers.length === 0
                      ? "No customers available"
                      : "Choose customer / medical store"}
                </option>

                {customers.map(c => (
                  <option
                    key={String(c.id)}
                    value={String(c.id)}
                  >
                    {[
                      c.store_name,
                      c.name
                    ]
                      .filter(Boolean)
                      .filter(
                        (value, index, array) =>
                          array.indexOf(value) === index
                      )
                      .join(" · ") || `Customer ${c.id}`}
                    {c.city ? ` (${c.city})` : ""}
                  </option>
                ))}
              </select>

              {!customersLoading &&
                customers.length === 0 && (
                  <small>
                    No usable customer records were returned.
                    Check the console for the API response and
                    confirm the actual database ID field.
                  </small>
                )}
            </label>

            <label htmlFor="order-company">
              Pharmaceutical company *
              <select
                id="order-company"
                name="company"
                value={company}
                onChange={e => {
                  setCompany(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                disabled={companiesLoading}
                required
              >
                <option value="">
                  {companiesLoading
                    ? "Loading companies..."
                    : companies.length === 0
                      ? "No companies available"
                      : "Choose company"}
                </option>

                {companies.map(c => (
                  <option
                    key={String(c.id)}
                    value={String(c.id)}
                  >
                    {c.name || `Company ${c.id}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="order-step products-step">
            <span>02</span>
            <div>
              <h2>Select medicines</h2>
              <p>
                {company
                  ? "Only medicines from the selected company are shown."
                  : "Choose a company to load its catalogue."}
              </p>
            </div>
          </div>

          {company && (
            <label className="search-box medicine-search">
              <Search size={16} />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search medicine or strength"
              />
            </label>
          )}

          <div className="order-medicine-list">
            {medicinesLoading && (
              <div className="empty-state">
                Loading medicines...
              </div>
            )}

            {!medicinesLoading &&
              filtered.map(m => (
                <div className="order-medicine" key={m.id}>
                  <div className="medicine-mini">
                    <ShoppingCart size={17} />
                  </div>

                  <div className="order-med-info">
                    <strong>
                      {m.medicine_name || `Medicine ${m.id}`}
                    </strong>

                    <span>
                      {[m.strength, m.pack_size]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>

                    <small>
                      {money(m.unit_price)} per pack · Stock{" "}
                      {Number(
                        m.stock_quantity || 0
                      ).toLocaleString()}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="add-button"
                    onClick={() => add(m)}
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              ))}

            {!medicinesLoading &&
              company &&
              filtered.length === 0 && (
                <div className="empty-state">
                  No medicines found for this company.
                  Import its catalogue first.
                </div>
              )}

            {!company && (
              <div className="empty-state">
                Choose a pharmaceutical company above to view
                its medicines.
              </div>
            )}
          </div>
        </section>

        <aside className="panel cart-panel">
          <div className="cart-heading">
            <div>
              <h2>Order summary</h2>
              <p>Review quantities before booking.</p>
            </div>
            <span>{cart.length}</span>
          </div>

          <div className="cart-items">
            {cart.map(item => (
              <div className="cart-item" key={item.id}>
                <div className="cart-item-top">
                  <strong>
                    {item.medicine_name ||
                      `Medicine ${item.id}`}
                  </strong>

                  <button
                    type="button"
                    className="tiny-icon danger-text"
                    onClick={() => removeItem(item.id)}
                    title="Remove"
                    aria-label={`Remove ${
                      item.medicine_name || "medicine"
                    }`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <small>
                  {money(item.unit_price)} × {item.quantity}
                </small>

                <div className="cart-item-bottom">
                  <div className="qty-control">
                    <button
                      type="button"
                      onClick={() => quantity(item.id, -1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={13} />
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      type="button"
                      onClick={() => quantity(item.id, 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <strong>
                    {money(
                      Number(item.unit_price) *
                      Number(item.quantity)
                    )}
                  </strong>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="cart-empty">
                <ShoppingCart size={25} />
                <span>Your order is empty</span>
                <small>
                  Add medicines from the catalogue.
                </small>
              </div>
            )}
          </div>

          <label className="notes-label">
            Order notes
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional delivery instructions..."
              rows={3}
            />
          </label>

          <div className="cart-total">
            <span>Subtotal</span>
            <strong>{money(total)}</strong>
          </div>

          <button
            type="button"
            className="primary full book-button"
            onClick={submit}
            disabled={
              busy ||
              cart.length === 0 ||
              customersLoading ||
              companiesLoading
            }
          >
            {busy ? "Booking order..." : "Book order"}
            <CheckCircle2 size={17} />
          </button>

          <p className="cart-footnote">
            Stock is checked and deducted when a manager
            approves the order.
          </p>
        </aside>
      </div>
    </div>
  );
}
