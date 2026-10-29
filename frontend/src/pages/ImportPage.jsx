
import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

import api from "../services/api";
import "./ImportPage.css";

const TEMPLATE = `company,medicine_name,generic_name,strength,dosage_form,pack_size,barcode,unit_price,retail_price,opening_stock,batch_no,expiry_date
Example Pharma,Example Tablet,Example ingredient,500 mg,Tablet,10 tablets,EX123,180,220,100,B24001,2028-06-30`;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : "—";
}

function getFileExtension(name = "") {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

export default function ImportPage() {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);

  function downloadTemplate() {
    const blob = new Blob(["\uFEFF", TEMPLATE], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "sameel-medicine-import-template.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function validateFile(selectedFile) {
    if (!selectedFile) return "Please choose a file.";

    const extension = getFileExtension(selectedFile.name);

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return "Unsupported file type. Choose an .xlsx, .xls or .csv file.";
    }

    if (selectedFile.size === 0) {
      return "The selected file is empty.";
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      return "File exceeds 5 MB. Please choose a smaller file.";
    }

    return "";
  }

  function chooseFile(selectedFile) {
    if (!selectedFile) return;

    const validationError = validateFile(selectedFile);

    setError(validationError);
    setResult(null);

    if (validationError) {
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setFile(selectedFile);
  }

  function handleFileChange(event) {
    chooseFile(event.target.files?.[0] || null);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);

    if (busy) return;

    chooseFile(event.dataTransfer.files?.[0] || null);
  }

  function removeFile() {
    if (busy) return;

    setFile(null);
    setError("");
    setResult(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function uploadFile(event) {
    event.preventDefault();

    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);

    try {
      const body = new FormData();
      body.append("file", file);

      // Let Axios/browser set the multipart boundary automatically.
      const { data } = await api.post("/imports/medicines", body);

      setResult(data || {});
      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Import failed. Check your file and backend logs, then try again."
      );
    } finally {
      setBusy(false);
    }
  }

  const errors = Array.isArray(result?.errors) ? result.errors : [];
  const errorCount = Number(result?.errorCount ?? errors.length);
  const hasImportErrors = errorCount > 0;

  return (
    <main className="import-page">
      <header className="import-header">
        <div className="import-heading-copy">
          <div className="import-eyebrow">
            <span className="import-eyebrow-dot" />
            BULK DATA MANAGEMENT
          </div>

          <h1>Medicine Imports</h1>

          <p>
            Import pharmaceutical products, company catalogues, prices,
            batches, expiry dates and opening stock.
          </p>
        </div>

        <button
          type="button"
          className="import-btn import-btn-secondary"
          onClick={downloadTemplate}
          disabled={busy}
        >
          <Download size={17} />
          Download Template
        </button>
      </header>

      {error && (
        <div className="import-alert import-alert-error" role="alert">
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

      <section className="import-summary-strip">
        <div className="import-summary-icon">
          <ShieldCheck size={22} />
        </div>

        <div>
          <strong>Import with confidence</strong>
          <p>
            Use the sample template to keep your column names consistent.
            Always back up important stock data before a bulk import.
          </p>
        </div>

        <div className="import-file-limits">
          <span>MAX SIZE</span>
          <strong>5 MB</strong>
          <span>UP TO 5,000 ROWS*</span>
        </div>
      </section>

      <div className="import-main-grid">
        <form className="import-panel import-upload-panel" onSubmit={uploadFile}>
          <div className="import-panel-heading">
            <div className="import-heading-icon blue">
              <FileSpreadsheet size={22} />
            </div>

            <div>
              <h2>Upload medicine list</h2>
              <p>Select an Excel workbook or CSV file.</p>
            </div>
          </div>

          <div
            className={`import-drop-zone ${dragging ? "is-dragging" : ""} ${
              file ? "has-file" : ""
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setDragging(false);
              }
            }}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              className="import-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={busy}
              aria-label="Choose medicine import file"
            />

            {file ? (
              <>
                <div className="import-drop-icon selected">
                  <FileSpreadsheet size={27} />
                </div>

                <strong className="import-selected-name">{file.name}</strong>

                <span className="import-drop-hint">
                  {(file.size / 1024).toFixed(1)} KB · Ready to import
                </span>

                <button
                  type="button"
                  className="import-change-file"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                >
                  Choose a different file
                </button>
              </>
            ) : (
              <>
                <div className="import-drop-icon">
                  <Upload size={27} />
                </div>

                <strong>Drag and drop your file here</strong>

                <span className="import-drop-hint">
                  or browse your computer to select a file
                </span>

                <button
                  type="button"
                  className="import-browse-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                >
                  <FileText size={15} />
                  Browse Files
                </button>
              </>
            )}

            <span className="import-supported-formats">
              Supported: XLSX, XLS and CSV
            </span>
          </div>

          <div className="import-upload-details">
            <div>
              <span className="import-detail-dot green" />
              First worksheet processed for Excel files
            </div>
            <div>
              <span className="import-detail-dot blue" />
              Maximum file size: 5 MB
            </div>
          </div>

          <button
            type="submit"
            className="import-btn import-btn-primary import-submit"
            disabled={busy || !file}
          >
            {busy ? (
              <>
                <RefreshCw size={17} className="import-spin" />
                Processing Import...
              </>
            ) : (
              <>
                <Upload size={17} />
                Upload and Import
              </>
            )}
          </button>

          <p className="import-security-note">
            <ShieldCheck size={15} />
            Import access and data validation should also be enforced by your
            backend.
          </p>
        </form>

        <section className="import-panel import-guide-panel">
          <div className="import-panel-heading">
            <div className="import-heading-icon teal">
              <CheckCircle2 size={22} />
            </div>

            <div>
              <h2>Prepare your file</h2>
              <p>Follow these steps before importing.</p>
            </div>
          </div>

          <div className="import-guide-list">
            <div className="import-guide-item">
              <span className="import-guide-number">01</span>
              <div>
                <strong>Match the company name</strong>
                <p>
                  Create each pharmaceutical company in the Companies page
                  first. Use its exact name in every relevant row.
                </p>
              </div>
            </div>

            <div className="import-guide-item">
              <span className="import-guide-number">02</span>
              <div>
                <strong>Include required columns</strong>
                <p>
                  Provide company, medicine_name, unit_price and opening_stock.
                  Include pack_size whenever possible.
                </p>
              </div>
            </div>

            <div className="import-guide-item">
              <span className="import-guide-number">03</span>
              <div>
                <strong>Review batches and expiry</strong>
                <p>
                  Use a separate row for each batch when needed. Enter expiry
                  dates as YYYY-MM-DD.
                </p>
              </div>
            </div>

            <div className="import-guide-item">
              <span className="import-guide-number">04</span>
              <div>
                <strong>Check prices and stock</strong>
                <p>
                  Enter valid, non-negative prices and quantities. Review
                  duplicate products before importing.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="import-btn import-btn-secondary import-template-btn"
            onClick={downloadTemplate}
            disabled={busy}
          >
            <Download size={16} />
            Download Sample CSV
          </button>
        </section>
      </div>

      {result && (
        <section className="import-panel import-results-panel">
          <div className="import-result-heading">
            <div
              className={`import-result-status ${
                hasImportErrors ? "warning" : "success"
              }`}
            >
              {hasImportErrors ? (
                <AlertCircle size={23} />
              ) : (
                <CheckCircle2 size={23} />
              )}
            </div>

            <div className="import-result-copy">
              <h2>
                {hasImportErrors
                  ? "Import finished with issues"
                  : "Import processing finished"}
              </h2>
              <p>
                {result.message ||
                  "The server returned an import result. Review the totals below."}
              </p>
            </div>
          </div>

          <div className="import-result-stats">
            <div className="import-result-stat">
              <span>Total Rows</span>
              <strong>{formatNumber(result.totalRows)}</strong>
            </div>

            <div className="import-result-stat">
              <span>Created</span>
              <strong className="created">{formatNumber(result.created)}</strong>
            </div>

            <div className="import-result-stat">
              <span>Updated</span>
              <strong className="updated">{formatNumber(result.updated)}</strong>
            </div>

            <div className="import-result-stat">
              <span>Errors</span>
              <strong className={hasImportErrors ? "error-number" : ""}>
                {formatNumber(result.errorCount ?? errors.length)}
              </strong>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="import-errors-section">
              <div className="import-errors-heading">
                <div>
                  <h3>Rows requiring attention</h3>
                  <p>Correct the reported problems and import again.</p>
                </div>

                <span className="import-error-count">
                  {errors.length} {errors.length === 1 ? "issue" : "issues"}
                </span>
              </div>

              <div className="import-table-wrap">
                <table className="import-errors-table">
                  <thead>
                    <tr>
                      <th>Excel Row</th>
                      <th>Problem Details</th>
                    </tr>
                  </thead>

                  <tbody>
                    {errors.map((item, index) => (
                      <tr key={`${item.row ?? "row"}-${index}`}>
                        <td>{item.row ?? "—"}</td>
                        <td>{item.message || "Unspecified import error"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="import-footer">
        <span>
          <ShieldCheck size={15} />
          Sameel Enterprises · Medicine Data Management
        </span>
        <span>* The backend must enforce the row limit and file size limit.</span>
      </footer>
    </main>
  );
}
