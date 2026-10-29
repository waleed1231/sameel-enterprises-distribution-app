
import { useState } from "react";
import {
  UserPlus,
  ShieldCheck,
  UserRound,
  KeyRound,
  BadgeCheck,
  AlertCircle,
  CheckCircle2,
  Users,
  Eye,
  EyeOff,
} from "lucide-react";
import api from "../services/api";
import "./UsersPage.css";

const INITIAL_FORM = {
  full_name: "",
  username: "",
  password: "",
  role: "booker",
};

export default function UsersPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    setError("");
    setMessage("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const fullName = form.full_name.trim();
    const username = form.username.trim();

    if (!fullName || !username) {
      setError("Please enter the staff member's name and username.");
      return;
    }

    if (form.password.length < 12) {
      setError("The temporary password must contain at least 12 characters.");
      return;
    }

    setBusy(true);

    try {
      await api.post("/users", {
        full_name: fullName,
        username,
        password: form.password,
        role: form.role,
      });

      setMessage(
        `Account created for ${fullName}. Share the login details securely with this staff member.`
      );

      setForm(INITIAL_FORM);
      setShowPassword(false);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not create the account. Check your permissions and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="users-page">
      <header className="page-heading users-heading">
        <div>
          <span className="eyebrow">TEAM MANAGEMENT</span>
          <h1>Staff accounts</h1>
          <p>
            Create secure individual logins and control access to your
            distribution operations.
          </p>
        </div>

        <div className="users-heading-badge">
          <Users size={19} />
          <span>Access control</span>
        </div>
      </header>

      {error && (
        <div className="users-alert error" role="alert">
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="users-alert success" role="status">
          <CheckCircle2 size={19} />
          <span>{message}</span>
        </div>
      )}

      <div className="users-layout">
        <form className="panel user-form" onSubmit={submit}>
          <div className="user-form-heading">
            <div className="user-icon">
              <UserPlus size={23} />
            </div>

            <div>
              <span className="users-section-label">NEW TEAM MEMBER</span>
              <h2>Create staff account</h2>
              <p>Enter the details below to set up a new login.</p>
            </div>
          </div>

          <div className="users-form-divider" />

          <label className="users-field">
            <span>Full name</span>
            <div className="users-input-wrap">
              <UserRound size={18} />
              <input
                value={form.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                required
                maxLength={120}
                autoComplete="name"
                placeholder="Enter staff member's name"
              />
            </div>
          </label>

          <label className="users-field">
            <span>Username</span>
            <div className="users-input-wrap">
              <BadgeCheck size={18} />
              <input
                value={form.username}
                onChange={(e) => updateField("username", e.target.value)}
                required
                maxLength={60}
                autoComplete="off"
                spellCheck={false}
                placeholder="Choose a unique username"
              />
            </div>
            <small>Each team member must have a unique login.</small>
          </label>

          <label className="users-field">
            <span>Temporary password</span>
            <div className="users-input-wrap">
              <KeyRound size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                placeholder="At least 12 characters"
              />
              <button
                type="button"
                className="users-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <small>Use a strong, unique password and share it privately.</small>
          </label>

          <label className="users-field">
            <span>Account role</span>
            <select
              value={form.role}
              onChange={(e) => updateField("role", e.target.value)}
              required
            >
              <option value="booker">Order booker</option>
              <option value="manager">Manager</option>
            </select>
            <small>Choose permissions based on the employee's responsibilities.</small>
          </label>

          <button
            className="primary full users-submit"
            type="submit"
            disabled={busy}
          >
            {busy ? (
              <span className="users-spinner" />
            ) : (
              <UserPlus size={18} />
            )}
            {busy ? "Creating account..." : "Create staff account"}
          </button>

          <div className="users-security-note">
            <ShieldCheck size={17} />
            <span>
              Account creation is restricted by your backend permissions.
              Public registration should remain disabled.
            </span>
          </div>
        </form>

        <aside className="panel role-info">
          <div className="role-info-top">
            <div className="role-info-icon">
              <ShieldCheck size={25} />
            </div>
            <div>
              <span className="users-section-label">PERMISSIONS</span>
              <h2>Access levels</h2>
              <p>Assign the right level of access to each team member.</p>
            </div>
          </div>

          <div className="role-info-list">
            <article className="role-row">
              <div className="role-row-heading">
                <span className="role-badge admin">Admin</span>
                <span className="role-indicator">Full access</span>
              </div>
              <p>
                Manage staff, companies, catalogues, stock, pricing, and
                distribution orders.
              </p>
            </article>

            <article className="role-row">
              <div className="role-row-heading">
                <span className="role-badge manager">Manager</span>
                <span className="role-indicator">Operations</span>
              </div>
              <p>
                Manage permitted company and inventory operations, and approve
                or dispatch orders.
              </p>
            </article>

            <article className="role-row">
              <div className="role-row-heading">
                <span className="role-badge booker">Booker</span>
                <span className="role-indicator">Order entry</span>
              </div>
              <p>
                View available products, register customers, book orders, and
                access permitted order records.
              </p>
            </article>
          </div>

          <div className="role-info-footer">
            <ShieldCheck size={19} />
            <div>
              <strong>Security first</strong>
              <p>
                Enforce role permissions on the server for every protected
                endpoint, not only in the interface.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
