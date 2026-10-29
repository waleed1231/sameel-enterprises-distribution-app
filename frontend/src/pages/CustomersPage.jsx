
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  Store,
  UserRound,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
} from "lucide-react";

import api from "../services/api";
import "./CustomersPage.css";

const EMPTY_FORM = {
  name: "",
  store_name: "",
  phone: "",
  city: "",
  address: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/customers", {
        params: { q: query.trim() || undefined },
      });

      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load customers. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadCustomers();
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadCustomers]);

  const totalStores = useMemo(
    () =>
      customers.filter((customer) =>
        String(customer.store_name || "").trim()
      ).length,
    [customers]
  );

  const citiesCount = useMemo(
    () =>
      new Set(
        customers
          .map((customer) => String(customer.city || "").trim().toLowerCase())
          .filter(Boolean)
      ).size,
    [customers]
  );

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function openForm() {
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setForm(EMPTY_FORM);
  }

  async function saveCustomer(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("Please enter the customer's contact name.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/customers", {
        name: form.name.trim(),
        store_name: form.store_name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
      });

      setForm(EMPTY_FORM);
      setShowForm(false);
      setMessage("Customer added successfully.");

      await loadCustomers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not save the customer. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="customers-page">
      {/* Header */}
      <header className="customers-header">
        <div className="customers-heading-copy">
          <div className="customers-eyebrow">
            <Users size={14} />
            CUSTOMER RELATIONSHIP MANAGEMENT
          </div>

          <h1>Customers & Medical Stores</h1>

          <p>
            Manage pharmacy contacts, store details, and customer locations.
          </p>
        </div>

        <div className="customers-header-actions">
          <button
            type="button"
            className="customers-btn customers-btn-secondary"
            onClick={loadCustomers}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "customers-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            className="customers-btn customers-btn-primary"
            onClick={openForm}
          >
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </header>

      {/* Notifications */}
      {error && (
        <div className="customers-alert customers-alert-error" role="alert">
          <AlertCircle size={19} />
          <span>{error}</span>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {message && (
        <div className="customers-alert customers-alert-success" role="status">
          <CheckCircle2 size={19} />
          <span>{message}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setMessage("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <section className="customers-stats">
        <article className="customers-stat-card">
          <div className="customers-stat-icon customers-stat-blue">
            <Users size={22} />
          </div>

          <div>
            <span>Total Customers</span>
            <strong>{loading ? "—" : customers.length}</strong>
            <small>Matching directory records</small>
          </div>
        </article>

        <article className="customers-stat-card">
          <div className="customers-stat-icon customers-stat-teal">
            <Store size={22} />
          </div>

          <div>
            <span>Medical Stores</span>
            <strong>{loading ? "—" : totalStores}</strong>
            <small>Customers with store names</small>
          </div>
        </article>

        <article className="customers-stat-card">
          <div className="customers-stat-icon customers-stat-purple">
            <MapPin size={22} />
          </div>

          <div>
            <span>Cities Covered</span>
            <strong>{loading ? "—" : citiesCount}</strong>
            <small>Distinct cities in results</small>
          </div>
        </article>
      </section>

      {/* Directory */}
      <section className="customers-panel">
        <div className="customers-toolbar">
          <div>
            <h2>Customer Directory</h2>
            <p>Find customers and medical stores in your distribution network.</p>
          </div>

          <label className="customers-search">
            <Search size={18} />

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, store, phone or city..."
              aria-label="Search customers"
            />

            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <X size={16} />
              </button>
            )}
          </label>
        </div>

        <div className="customers-results-bar">
          <span>
            {loading
              ? "Loading customer directory..."
              : `${customers.length} ${
                  customers.length === 1 ? "customer" : "customers"
                } found`}
          </span>

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="customers-clear-search"
            >
              Clear search
            </button>
          )}
        </div>

        {loading && customers.length === 0 ? (
          <div className="customers-loading">
            <span className="customers-loader" />
            <p>Loading customer records...</p>
          </div>
        ) : error && customers.length === 0 ? (
          <div className="customers-empty">
            <div className="customers-empty-icon">
              <AlertCircle size={27} />
            </div>

            <h3>Unable to load customers</h3>
            <p>Check the backend connection, then try again.</p>

            <button
              type="button"
              className="customers-btn customers-btn-primary"
              onClick={loadCustomers}
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        ) : customers.length === 0 ? (
          <div className="customers-empty">
            <div className="customers-empty-icon">
              <Users size={27} />
            </div>

            <h3>{query ? "No matching customers" : "No customers yet"}</h3>

            <p>
              {query
                ? "Try a different name, store, phone number, or city."
                : "Add your first customer to start building your distribution directory."}
            </p>

            {!query && (
              <button
                type="button"
                className="customers-btn customers-btn-primary"
                onClick={openForm}
              >
                <Plus size={17} />
                Add First Customer
              </button>
            )}
          </div>
        ) : (
          <div className="customers-table-wrap">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Customer / Contact</th>
                  <th>Medical Store</th>
                  <th>Phone Number</th>
                  <th>City</th>
                  <th>Address</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="customers-person-cell">
                        <span className="customers-person-avatar">
                          <UserRound size={18} />
                        </span>

                        <span className="customers-person-info">
                          <strong>{customer.name}</strong>
                          <small>Customer ID: {customer.id}</small>
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="customers-store-cell">
                        <Store size={16} />
                        <span>{customer.store_name || "Not provided"}</span>
                      </div>
                    </td>

                    <td>
                      {customer.phone ? (
                        <a
                          className="customers-phone-link"
                          href={`tel:${customer.phone}`}
                        >
                          <Phone size={14} />
                          {customer.phone}
                        </a>
                      ) : (
                        <span className="customers-muted">Not provided</span>
                      )}
                    </td>

                    <td>
                      <span className="customers-city">
                        {customer.city || "—"}
                      </span>
                    </td>

                    <td>
                      <span
                        className="customers-address"
                        title={customer.address || ""}
                      >
                        {customer.address || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && customers.length > 0 && (
          <footer className="customers-panel-footer">
            <span>
              Showing {customers.length} matching{" "}
              {customers.length === 1 ? "record" : "records"}
            </span>
            <span>Customer Directory</span>
          </footer>
        )}
      </section>

      {/* Add customer modal */}
      {showForm && (
        <div
          className="customers-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            className="customers-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customers-modal-title"
          >
            <header className="customers-modal-header">
              <div className="customers-modal-icon">
                <Building2 size={22} />
              </div>

              <div className="customers-modal-heading">
                <h2 id="customers-modal-title">Add New Customer</h2>
                <p>Enter the customer and medical store details.</p>
              </div>

              <button
                type="button"
                className="customers-modal-close"
                aria-label="Close form"
                onClick={closeForm}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={saveCustomer}>
              <div className="customers-modal-body">
                <label className="customers-field">
                  <span>
                    Contact / Person Name <b>*</b>
                  </span>

                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    placeholder="Enter contact person's name"
                    maxLength={150}
                    autoFocus
                    required
                  />
                </label>

                <label className="customers-field">
                  <span>Medical Store / Pharmacy</span>

                  <input
                    name="store_name"
                    value={form.store_name}
                    onChange={updateField}
                    placeholder="Enter pharmacy or store name"
                    maxLength={200}
                  />
                </label>

                <div className="customers-form-row">
                  <label className="customers-field">
                    <span>Phone Number</span>

                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={updateField}
                      placeholder="03XX XXXXXXX"
                      maxLength={30}
                    />
                  </label>

                  <label className="customers-field">
                    <span>City</span>

                    <input
                      name="city"
                      value={form.city}
                      onChange={updateField}
                      placeholder="Enter city"
                      maxLength={100}
                    />
                  </label>
                </div>

                <label className="customers-field">
                  <span>Full Address</span>

                  <textarea
                    name="address"
                    value={form.address}
                    onChange={updateField}
                    placeholder="Shop number, street, area..."
                    rows={3}
                    maxLength={500}
                  />
                </label>

                <p className="customers-form-note">
                  <span>*</span> Contact / person name is required.
                </p>
              </div>

              <footer className="customers-modal-footer">
                <button
                  type="button"
                  className="customers-btn customers-btn-secondary"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="customers-btn customers-btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="customers-button-loader" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Save Customer
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
