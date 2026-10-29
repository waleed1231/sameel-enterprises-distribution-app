
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Plus,
  Search,
  Phone,
  UserRound,
  Package,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Factory,
} from "lucide-react";

import api from "../services/api";
import "./CompaniesPage.css";

const INITIAL_FORM = {
  name: "",
  contact_person: "",
  phone: "",
};

export default function CompaniesPage({ user }) {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canEdit = ["admin", "manager"].includes(
    String(user?.role || "").toLowerCase()
  );

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/companies");
      const data = response.data;

      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load pharmaceutical companies. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return companies;

    return companies.filter((company) =>
      [
        company.name,
        company.contact_person,
        company.phone,
      ].some((value) =>
        String(value || "").toLowerCase().includes(term)
      )
    );
  }, [companies, search]);

  const totalMedicines = useMemo(
    () =>
      companies.reduce(
        (total, company) =>
          total + (Number(company.medicine_count) || 0),
        0
      ),
    [companies]
  );

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleAddCompany(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const companyName = form.name.trim();

    if (!companyName) {
      setError("Please enter a pharmaceutical company name.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/companies", {
        name: companyName,
        contact_person: form.contact_person.trim(),
        phone: form.phone.trim(),
      });

      setForm(INITIAL_FORM);
      setShowForm(false);
      setSuccess(`${companyName} was added successfully.`);

      await loadCompanies();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not add the company. Please check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function openForm() {
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setForm(INITIAL_FORM);
  }

  return (
    <main className="companies-page">
      {/* Page header */}
      <header className="companies-header">
        <div className="companies-heading-copy">
          <div className="companies-eyebrow">
            <Factory size={14} />
            DISTRIBUTION MANAGEMENT
          </div>

          <h1>Pharmaceutical Companies</h1>

          <p>
            Manage your suppliers and organize medicines by company.
          </p>
        </div>

        <div className="companies-header-actions">
          <button
            type="button"
            className="companies-button companies-button-secondary"
            onClick={loadCompanies}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "companies-spin" : ""}
            />
            Refresh
          </button>

          {canEdit && (
            <button
              type="button"
              className="companies-button companies-button-primary"
              onClick={openForm}
            >
              <Plus size={18} />
              Add Company
            </button>
          )}
        </div>
      </header>

      {/* Feedback messages */}
      {error && (
        <div className="companies-alert companies-alert-error" role="alert">
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

      {success && (
        <div
          className="companies-alert companies-alert-success"
          role="status"
        >
          <CheckCircle2 size={19} />
          <span>{success}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setSuccess("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <section className="companies-stats" aria-label="Company statistics">
        <article className="companies-stat-card">
          <div className="companies-stat-icon companies-icon-blue">
            <Building2 size={21} />
          </div>

          <div>
            <span className="companies-stat-label">Total Companies</span>
            <strong>{loading ? "—" : companies.length}</strong>
            <small>Registered suppliers</small>
          </div>
        </article>

        <article className="companies-stat-card">
          <div className="companies-stat-icon companies-icon-teal">
            <Package size={21} />
          </div>

          <div>
            <span className="companies-stat-label">Linked Medicines</span>
            <strong>{loading ? "—" : totalMedicines.toLocaleString()}</strong>
            <small>Across all companies</small>
          </div>
        </article>

        <article className="companies-stat-card">
          <div className="companies-stat-icon companies-icon-purple">
            <UserRound size={21} />
          </div>

          <div>
            <span className="companies-stat-label">With Contacts</span>
            <strong>
              {loading
                ? "—"
                : companies.filter((company) =>
                    String(company.contact_person || "").trim()
                  ).length}
            </strong>
            <small>Companies with contact details</small>
          </div>
        </article>
      </section>

      {/* Company directory */}
      <section className="companies-panel">
        <div className="companies-toolbar">
          <div>
            <h2>Company Directory</h2>
            <p>Search and review your registered pharmaceutical suppliers.</p>
          </div>

          <label className="companies-search">
            <Search size={18} />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company, contact or phone..."
              aria-label="Search companies"
            />

            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <X size={16} />
              </button>
            )}
          </label>
        </div>

        <div className="companies-results-bar">
          <span>
            {loading
              ? "Loading directory..."
              : `${filteredCompanies.length} ${
                  filteredCompanies.length === 1 ? "company" : "companies"
                } found`}
          </span>

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="companies-clear-search"
            >
              Clear search
            </button>
          )}
        </div>

        {loading ? (
          <div className="companies-loading">
            <span className="companies-loader" />
            <p>Loading company directory...</p>
          </div>
        ) : error && companies.length === 0 ? (
          <div className="companies-empty">
            <div className="companies-empty-icon">
              <AlertCircle size={27} />
            </div>
            <h3>Directory unavailable</h3>
            <p>Check your backend connection and try again.</p>
            <button
              type="button"
              className="companies-button companies-button-primary"
              onClick={loadCompanies}
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="companies-empty">
            <div className="companies-empty-icon">
              <Building2 size={27} />
            </div>

            <h3>
              {search ? "No matching companies" : "No companies registered"}
            </h3>

            <p>
              {search
                ? "Try another search term."
                : "Add your first pharmaceutical company to get started."}
            </p>

            {!search && canEdit && (
              <button
                type="button"
                className="companies-button companies-button-primary"
                onClick={openForm}
              >
                <Plus size={17} />
                Add First Company
              </button>
            )}
          </div>
        ) : (
          <div className="companies-grid">
            {filteredCompanies.map((company) => (
              <article className="company-card" key={company.id}>
                <div className="company-card-top">
                  <div className="company-logo">
                    <Building2 size={23} />
                  </div>

                  <span className="company-status">
                    <span />
                    Registered
                  </span>
                </div>

                <div className="company-card-body">
                  <h3 title={company.name}>{company.name}</h3>

                  <div className="company-information">
                    <div className="company-info-row">
                      <UserRound size={15} />
                      <span>
                        {company.contact_person || "Contact not provided"}
                      </span>
                    </div>

                    <div className="company-info-row">
                      <Phone size={15} />
                      <span>{company.phone || "Phone not provided"}</span>
                    </div>
                  </div>
                </div>

                <footer className="company-card-footer">
                  <div className="company-medicine-count">
                    <Package size={16} />
                    <span>
                      <strong>
                        {Number(company.medicine_count) || 0}
                      </strong>{" "}
                      medicines
                    </span>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Add company modal */}
      {showForm && (
        <div
          className="companies-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            className="companies-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-company-title"
          >
            <header className="companies-modal-header">
              <div className="companies-modal-title-icon">
                <Building2 size={22} />
              </div>

              <div>
                <h2 id="add-company-title">Add Pharmaceutical Company</h2>
                <p>Register a supplier in your company directory.</p>
              </div>

              <button
                type="button"
                className="companies-modal-close"
                aria-label="Close form"
                onClick={closeForm}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleAddCompany}>
              <div className="companies-modal-body">
                <label className="companies-field">
                  <span>
                    Company Name <b>*</b>
                  </span>

                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    placeholder="e.g. ABC Pharmaceuticals"
                    maxLength={150}
                    required
                    autoFocus
                  />
                </label>

                <label className="companies-field">
                  <span>Contact Person</span>

                  <input
                    name="contact_person"
                    value={form.contact_person}
                    onChange={updateField}
                    placeholder="Enter representative's name"
                    maxLength={150}
                  />
                </label>

                <label className="companies-field">
                  <span>Phone Number</span>

                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={updateField}
                    placeholder="Enter contact number"
                    maxLength={30}
                  />
                </label>

                <p className="companies-form-note">
                  <span>*</span> Required field. Contact information is optional.
                </p>
              </div>

              <footer className="companies-modal-footer">
                <button
                  type="button"
                  className="companies-button companies-button-secondary"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="companies-button companies-button-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="companies-button-loader" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Save Company
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
