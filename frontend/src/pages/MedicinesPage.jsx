
import { useEffect, useState } from "react";
import { Package, Search, Plus, X, Save } from "lucide-react";
import api from "../services/api";
import { money } from "../utils/format";
import "./MedicinesPage.css";

const emptyMedicine = {
  company_id: "",
  medicine_name: "",
  generic_name: "",
  strength: "",
  dosage_form: "",
  pack_size: "",
  unit_price: "",
  stock_quantity: "0",
  barcode: "",
};

export default function MedicinesPage() {
  const [companies, setCompanies] = useState([]);
  const [rows, setRows] = useState([]);
  const [company, setCompany] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyMedicine);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/companies")
      .then((r) => setCompanies(r.data))
      .catch(() => setError("Could not load companies."));
  }, []);

  useEffect(() => {
    let live = true;

    setLoading(true);

    api.get("/medicines", {
      params: {
        company_id: company || undefined,
        q: q || undefined,
      },
    })
      .then((r) => {
        if (live) {
          setRows(r.data);
          setError("");
        }
      })
      .catch((e) => {
        if (live) {
          setError(
            e.response?.data?.message ||
              "Could not load medicines."
          );
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, [company, q]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openForm = () => {
    setError("");
    setForm({
      ...emptyMedicine,
      company_id: company || "",
    });
    setShowForm(true);
  };

  const saveMedicine = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.company_id) {
      setError("Please select a pharmaceutical company.");
      return;
    }

    if (!form.medicine_name.trim()) {
      setError("Medicine name is required.");
      return;
    }

    if (
      form.unit_price === "" ||
      Number(form.unit_price) < 0 ||
      Number(form.stock_quantity) < 0
    ) {
      setError("Enter a valid price and stock quantity.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/medicines", {
        ...form,
        medicine_name: form.medicine_name.trim(),
        generic_name: form.generic_name.trim(),
        strength: form.strength.trim(),
        dosage_form: form.dosage_form.trim(),
        pack_size: form.pack_size.trim(),
        barcode: form.barcode.trim(),
        company_id: Number(form.company_id),
        unit_price: Number(form.unit_price),
        stock_quantity: Number(form.stock_quantity),
      });

      setShowForm(false);
      setForm(emptyMedicine);

      // Refresh the catalogue after saving.
      const response = await api.get("/medicines", {
        params: {
          company_id: company || undefined,
          q: q || undefined,
        },
      });

      setRows(response.data);
      setError("");
    } catch (e) {
      setError(
        e.response?.data?.message ||
          e.response?.data?.error ||
          "Could not save medicine. Check your backend API."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="medicines-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">PRODUCT DIRECTORY</span>
          <h1>Medicine catalogue</h1>
          <p>
            Manage medicines by pharmaceutical company.
          </p>
        </div>

        <div className="medicine-heading-actions">
          <span className="count-pill">
            {rows.length} shown
          </span>

          <button
            type="button"
            className="add-medicine-btn"
            onClick={openForm}
          >
            <Plus size={17} />
            Add Medicine
          </button>
        </div>
      </div>

      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <div className="medicine-form-overlay">
          <form
            className="medicine-form panel"
            onSubmit={saveMedicine}
          >
            <div className="medicine-form-heading">
              <div>
                <span className="eyebrow">
                  PRODUCT DIRECTORY
                </span>
                <h2>Add New Medicine</h2>
                <p>
                  Enter the product details and assign its company.
                </p>
              </div>

              <button
                type="button"
                className="close-medicine-form"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <div className="medicine-form-grid">
              <label>
                Pharmaceutical Company *
                <select
                  required
                  value={form.company_id}
                  onChange={(e) =>
                    updateField("company_id", e.target.value)
                  }
                >
                  <option value="">Select company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Medicine Name *
                <input
                  required
                  maxLength={150}
                  value={form.medicine_name}
                  onChange={(e) =>
                    updateField("medicine_name", e.target.value)
                  }
                  placeholder="e.g. Panadol"
                />
              </label>

              <label>
                Generic Name
                <input
                  value={form.generic_name}
                  onChange={(e) =>
                    updateField("generic_name", e.target.value)
                  }
                  placeholder="e.g. Paracetamol"
                />
              </label>

              <label>
                Strength
                <input
                  value={form.strength}
                  onChange={(e) =>
                    updateField("strength", e.target.value)
                  }
                  placeholder="e.g. 500 mg"
                />
              </label>

              <label>
                Dosage Form
                <select
                  value={form.dosage_form}
                  onChange={(e) =>
                    updateField("dosage_form", e.target.value)
                  }
                >
                  <option value="">Select form</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Suspension">Suspension</option>
                  <option value="Injection">Injection</option>
                  <option value="Drops">Drops</option>
                  <option value="Cream">Cream</option>
                  <option value="Ointment">Ointment</option>
                  <option value="Sachet">Sachet</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label>
                Pack Size
                <input
                  value={form.pack_size}
                  onChange={(e) =>
                    updateField("pack_size", e.target.value)
                  }
                  placeholder="e.g. 10 tablets / box"
                />
              </label>

              <label>
                Unit Price *
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.unit_price}
                  onChange={(e) =>
                    updateField("unit_price", e.target.value)
                  }
                  placeholder="0.00"
                />
              </label>

              <label>
                Opening Stock *
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={form.stock_quantity}
                  onChange={(e) =>
                    updateField("stock_quantity", e.target.value)
                  }
                />
              </label>

              <label className="medicine-barcode-field">
                Barcode / Product Code
                <input
                  value={form.barcode}
                  onChange={(e) =>
                    updateField("barcode", e.target.value)
                  }
                  placeholder="Enter or scan barcode"
                />
              </label>
            </div>

            <div className="medicine-form-actions">
              <button
                type="button"
                className="cancel-medicine-btn"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="add-medicine-btn"
                disabled={saving || !companies.length}
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Medicine"}
              </button>
            </div>
          </form>
        </div>
      )}

      <section className="panel medicine-filters">
        <label className="search-box">
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Medicine, generic name or barcode"
          />
        </label>

        <label className="company-select">
          <span>Pharmaceutical company</span>
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          >
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Company</th>
                <th>Pack</th>
                <th>Unit Price</th>
                <th>Stock</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="medicine-cell">
                      <span className="medicine-mini">
                        <Package size={17} />
                      </span>
                      <span>
                        <strong>{m.medicine_name}</strong>
                        <small>
                          {[
                            m.generic_name,
                            m.strength,
                            m.dosage_form,
                          ]
                            .filter(Boolean)
                            .join(" · ") ||
                            "Product details not added"}
                        </small>
                      </span>
                    </div>
                  </td>

                  <td>
                    <span className="company-tag">
                      {m.company_name}
                    </span>
                  </td>

                  <td>{m.pack_size || "—"}</td>
                  <td className="price-cell">
                    {money(m.unit_price)}
                  </td>

                  <td>
                    <span
                      className={`stock-chip ${
                        Number(m.stock_quantity) > 0
                          ? "in-stock"
                          : "out-stock"
                      }`}
                    >
                      {Number(m.stock_quantity).toLocaleString()} units
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="empty-state">
              Loading medicines…
            </div>
          )}

          {!loading && !rows.length && (
            <div className="empty-state">
              No medicines found. Click Add Medicine to enter
              a product manually.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
