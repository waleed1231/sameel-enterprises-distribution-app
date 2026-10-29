
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Save,
  Search,
  Package,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  CalendarDays,
  IndianRupee,
  X,
  SlidersHorizontal,
} from "lucide-react";

import api from "../services/api";
import { money } from "../utils/format";
import "./StockPage.css";

function formatQuantity(value) {
  return (Number(value) || 0).toLocaleString(undefined, {
    maximumFractionDigits: 3,
  });
}

function getDateValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export default function StockPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [busyAction, setBusyAction] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const { data } = await api.get("/stock");

      setRows(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not load stock. Check your access permissions and backend."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalProducts = rows.length;

  const totalStock = useMemo(
    () =>
      rows.reduce(
        (sum, row) =>
          sum + Math.max(0, Number(row.stock_quantity) || 0),
        0
      ),
    [rows]
  );

  const lowStockCount = useMemo(
    () =>
      rows.filter((row) => {
        const quantity = Number(row.stock_quantity) || 0;
        const threshold = Number(row.low_stock_threshold ?? 10);

        return quantity > 0 && quantity <= threshold;
      }).length,
    [rows]
  );

  const outOfStockCount = useMemo(
    () =>
      rows.filter(
        (row) => (Number(row.stock_quantity) || 0) <= 0
      ).length,
    [rows]
  );

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    return rows.filter((row) => {
      const searchableText = [
        row.medicine_name,
        row.company_name,
        row.generic_name,
        row.strength,
        row.pack_size,
        row.batch_no,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search || searchableText.includes(search);

      const quantity = Number(row.stock_quantity) || 0;
      const threshold = Number(row.low_stock_threshold ?? 10);

      const matchesFilter =
        stockFilter === "all" ||
        (stockFilter === "low" &&
          quantity > 0 &&
          quantity <= threshold) ||
        (stockFilter === "out" && quantity <= 0) ||
        (stockFilter === "available" && quantity > threshold);

      return matchesSearch && matchesFilter;
    });
  }, [rows, q, stockFilter]);

  function getDraft(row) {
    return drafts[row.id] || {};
  }

  function change(id, key, value) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [key]: value,
      },
    }));

    setError("");
    setMessage("");
  }

  function clearDraft(row) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[row.id];
      return next;
    });
  }

  function validatePrices(row) {
    const draft = getDraft(row);

    const purchaseValue =
      draft.unit_price ?? String(row.unit_price ?? "");

    const retailValue =
      draft.retail_price ?? String(row.retail_price ?? "");

    const purchasePrice = Number(purchaseValue);
    const retailPrice =
      retailValue === "" ? null : Number(retailValue);

    if (
      purchaseValue === "" ||
      !Number.isFinite(purchasePrice) ||
      purchasePrice < 0
    ) {
      setError(
        `Enter a valid purchase price for ${row.medicine_name}.`
      );
      return false;
    }

    if (
      retailPrice !== null &&
      (!Number.isFinite(retailPrice) || retailPrice < 0)
    ) {
      setError(
        `Enter a valid retail price for ${row.medicine_name}.`
      );
      return false;
    }

    if (
      retailPrice !== null &&
      retailPrice < purchasePrice
    ) {
      setError(
        `Retail price for ${row.medicine_name} is below its purchase price. Please confirm before saving.`
      );
      return false;
    }

    return true;
  }

  async function savePrice(row) {
    setError("");
    setMessage("");

    if (!validatePrices(row)) return;

    const draft = getDraft(row);

    const purchaseValue =
      draft.unit_price ?? String(row.unit_price ?? "");

    const retailValue =
      draft.retail_price ?? String(row.retail_price ?? "");

    setBusyId(row.id);
    setBusyAction("price");

    try {
      await api.put(`/medicines/${row.id}/pricing`, {
        unit_price: Number(purchaseValue),
        retail_price:
          retailValue === "" ? null : Number(retailValue),
      });

      clearDraft(row);

      setMessage(
        `Prices updated successfully for ${row.medicine_name}.`
      );

      await load(false);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Price update failed. Check your permissions and try again."
        )
      );
    } finally {
      setBusyId(null);
      setBusyAction("");
    }
  }

  async function saveStock(row) {
    setError("");
    setMessage("");

    const draft = getDraft(row);

    const quantityValue =
      draft.quantity ?? String(row.stock_quantity ?? 0);

    const quantity = Number(quantityValue);
    const batchNo = String(
      draft.batch_no ?? row.batch_no ?? ""
    ).trim();

    const expiryDate =
      draft.expiry_date ?? getDateValue(row.expiry_date);

    if (
      quantityValue === "" ||
      !Number.isFinite(quantity) ||
      quantity < 0
    ) {
      setError(
        `Enter a valid non-negative stock quantity for ${row.medicine_name}.`
      );
      return;
    }

    if (
      expiryDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)
    ) {
      setError(
        `Enter a valid expiry date for ${row.medicine_name}.`
      );
      return;
    }

    setBusyId(row.id);
    setBusyAction("stock");

    try {
      await api.post("/stock/adjust", {
        medicine_id: row.id,
        quantity,
        batch_no: batchNo,
        expiry_date: expiryDate || null,
      });

      clearDraft(row);

      setMessage(
        `Stock adjustment submitted for ${row.medicine_name}.`
      );

      await load(false);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Stock update failed. Check your permissions and try again."
        )
      );
    } finally {
      setBusyId(null);
      setBusyAction("");
    }
  }

  function getStockStatus(row) {
    const quantity = Number(row.stock_quantity) || 0;
    const threshold = Number(row.low_stock_threshold ?? 10);

    if (quantity <= 0) {
      return { label: "Out of stock", className: "out-stock" };
    }

    if (quantity <= threshold) {
      return { label: "Low stock", className: "low-stock" };
    }

    return { label: "In stock", className: "in-stock" };
  }

  const clearSearch = () => {
    setQ("");
    setStockFilter("all");
  };

  return (
    <div className="stock-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">
            SAMEEL ENTERPRISES · INVENTORY MANAGEMENT
          </span>

          <h1>Stock &amp; Prices</h1>

          <p>
            Monitor medicine inventory, maintain pricing, and manage
            batch and expiry information from one workspace.
          </p>
        </div>

        <button
          type="button"
          className="stock-refresh-button"
          onClick={() => load()}
          disabled={loading || busyId !== null}
        >
          <RefreshCw
            size={16}
            className={loading ? "refresh-spinning" : ""}
          />
          Refresh inventory
        </button>
      </header>

      {error && (
        <div className="alert error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>

          <button
            type="button"
            className="stock-dismiss"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {message && (
        <div className="alert success" role="status">
          <CheckCircle2 size={18} />
          <span>{message}</span>

          <button
            type="button"
            className="stock-dismiss"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="stock-stats" aria-label="Inventory summary">
        <div className="stock-stat-card">
          <div className="stock-stat-icon blue">
            <Package size={21} />
          </div>
          <div>
            <span>Total products</span>
            <strong>{totalProducts.toLocaleString()}</strong>
            <small>Products in catalogue</small>
          </div>
        </div>

        <div className="stock-stat-card">
          <div className="stock-stat-icon teal">
            <Boxes size={21} />
          </div>
          <div>
            <span>Total stock units</span>
            <strong>{formatQuantity(totalStock)}</strong>
            <small>Combined available quantity</small>
          </div>
        </div>

        <div className="stock-stat-card">
          <div className="stock-stat-icon amber">
            <AlertCircle size={21} />
          </div>
          <div>
            <span>Low stock</span>
            <strong>{lowStockCount.toLocaleString()}</strong>
            <small>Replenishment may be needed</small>
          </div>
        </div>

        <div className="stock-stat-card">
          <div className="stock-stat-icon red">
            <Package size={21} />
          </div>
          <div>
            <span>Out of stock</span>
            <strong>{outOfStockCount.toLocaleString()}</strong>
            <small>Products with no available units</small>
          </div>
        </div>
      </section>

      <section className="panel stock-catalogue">
        <div className="list-toolbar">
          <div className="stock-toolbar-title">
            <h2>Inventory catalogue</h2>
            <p>
              Showing {filtered.length.toLocaleString()} of{" "}
              {totalProducts.toLocaleString()} products
            </p>
          </div>

          <label className="search-box stock-search">
            <Search size={17} />

            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search medicine, company, strength or batch..."
              aria-label="Search inventory"
            />

            {q && (
              <button
                type="button"
                className="stock-search-clear"
                onClick={() => setQ("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </label>
        </div>

        <div className="stock-filters">
          <div className="stock-filter-label">
            <SlidersHorizontal size={15} />
            Filter stock
          </div>

          <div className="stock-filter-buttons">
            {[
              { value: "all", label: "All products" },
              { value: "available", label: "In stock" },
              { value: "low", label: "Low stock" },
              { value: "out", label: "Out of stock" },
            ].map((filter) => (
              <button
                type="button"
                key={filter.value}
                className={`stock-filter-button ${
                  stockFilter === filter.value ? "active" : ""
                }`}
                onClick={() => setStockFilter(filter.value)}
                aria-pressed={stockFilter === filter.value}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {(q || stockFilter !== "all") && (
            <button
              type="button"
              className="stock-reset-button"
              onClick={clearSearch}
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="stock-loading" role="status">
            <RefreshCw size={23} className="refresh-spinning" />
            <span>Loading inventory...</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Medicine details</th>
                  <th>Stock status</th>
                  <th>Purchase price</th>
                  <th>Retail price</th>
                  <th>Stock &amp; batch details</th>
                  <th>Save changes</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((row) => {
                  const draft = getDraft(row);
                  const stock = Number(row.stock_quantity) || 0;
                  const status = getStockStatus(row);
                  const isBusy = busyId === row.id;

                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="stock-product">
                          <div className="stock-product-icon">
                            <Package size={18} />
                          </div>

                          <div>
                            <strong>
                              {row.medicine_name || "Unnamed medicine"}
                            </strong>

                            <small>
                              {row.company_name || "No company assigned"}
                            </small>

                            {(row.strength || row.pack_size) && (
                              <small>
                                {[row.strength, row.pack_size]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </small>
                            )}

                            {row.generic_name && (
                              <small>
                                Generic: {row.generic_name}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="stock-status-cell">
                          <span
                            className={`stock-chip ${status.className}`}
                          >
                            {formatQuantity(stock)}
                          </span>

                          <small className={`stock-status-text ${status.className}`}>
                            {status.label}
                          </small>
                        </div>
                      </td>

                      <td>
                        <label className="stock-price-field">
                          <span>
                            <IndianRupee size={12} />
                            Purchase price
                          </span>

                          <input
                            className="table-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              draft.unit_price ??
                              row.unit_price ??
                              ""
                            }
                            onChange={(event) =>
                              change(
                                row.id,
                                "unit_price",
                                event.target.value
                              )
                            }
                            aria-label={`Purchase price for ${row.medicine_name}`}
                          />
                        </label>
                      </td>

                      <td>
                        <label className="stock-price-field">
                          <span>
                            <IndianRupee size={12} />
                            Retail price
                          </span>

                          <input
                            className="table-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              draft.retail_price ??
                              row.retail_price ??
                              ""
                            }
                            onChange={(event) =>
                              change(
                                row.id,
                                "retail_price",
                                event.target.value
                              )
                            }
                            aria-label={`Retail price for ${row.medicine_name}`}
                          />
                        </label>
                      </td>

                      <td>
                        <div className="stock-edit">
                          <label>
                            <span>Quantity</span>

                            <input
                              className="table-input"
                              type="number"
                              min="0"
                              step="0.001"
                              value={
                                draft.quantity ??
                                row.stock_quantity ??
                                0
                              }
                              onChange={(event) =>
                                change(
                                  row.id,
                                  "quantity",
                                  event.target.value
                                )
                              }
                              aria-label={`Quantity for ${row.medicine_name}`}
                            />
                          </label>

                          <label>
                            <span>Batch number</span>

                            <input
                              className="table-input batch-input"
                              value={
                                draft.batch_no ??
                                row.batch_no ??
                                ""
                              }
                              onChange={(event) =>
                                change(
                                  row.id,
                                  "batch_no",
                                  event.target.value
                                )
                              }
                              placeholder="Enter batch number"
                              aria-label={`Batch number for ${row.medicine_name}`}
                            />
                          </label>

                          <label>
                            <span>Expiry date</span>

                            <div className="stock-date-field">
                              <CalendarDays size={14} />

                              <input
                                className="table-input date-input"
                                type="date"
                                value={
                                  draft.expiry_date ??
                                  getDateValue(row.expiry_date)
                                }
                                onChange={(event) =>
                                  change(
                                    row.id,
                                    "expiry_date",
                                    event.target.value
                                  )
                                }
                                aria-label={`Expiry date for ${row.medicine_name}`}
                              />
                            </div>
                          </label>
                        </div>
                      </td>

                      <td>
                        <div className="save-actions">
                          <button
                            type="button"
                            className="small-action approve"
                            disabled={busyId !== null}
                            onClick={() => savePrice(row)}
                            title="Save purchase and retail prices"
                            aria-label={`Save prices for ${row.medicine_name}`}
                          >
                            {isBusy && busyAction === "price" ? (
                              <RefreshCw
                                size={15}
                                className="refresh-spinning"
                              />
                            ) : (
                              <Save size={15} />
                            )}
                            <span>Prices</span>
                          </button>

                          <button
                            type="button"
                            className="small-action"
                            disabled={busyId !== null}
                            onClick={() => saveStock(row)}
                            title="Save stock, batch and expiry details"
                            aria-label={`Save stock for ${row.medicine_name}`}
                          >
                            {isBusy && busyAction === "stock" ? (
                              <RefreshCw
                                size={15}
                                className="refresh-spinning"
                              />
                            ) : (
                              <Boxes size={15} />
                            )}
                            <span>Stock</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="empty-state">
                <Package size={27} />

                <strong>
                  {rows.length === 0
                    ? "Your inventory is empty"
                    : "No matching products"}
                </strong>

                <p>
                  {rows.length === 0
                    ? "Products will appear here when stock records are available."
                    : "Try a different search term or clear your filters."}
                </p>

                {(q || stockFilter !== "all") && (
                  <button
                    type="button"
                    className="stock-refresh-button"
                    onClick={clearSearch}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="table-note">
          <AlertCircle size={16} />

          <p>
            <strong>Inventory reminder:</strong> For medicines managed by
            batch, track quantities and expiry dates separately for each
            batch. Confirm that your stock adjustment endpoint handles
            quantities as intended before making adjustments.
          </p>
        </div>
      </section>
    </div>
  );
}
