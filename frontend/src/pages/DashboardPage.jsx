
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  ClipboardList,
  Package,
  ShoppingBag,
  RefreshCw,
  Users,
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";

import api from "../services/api";
import "./DashboardPage.css";

export default function DashboardPage({ user = {} }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const role = String(user?.role || "").toLowerCase();
  const canManage = ["admin", "manager"].includes(role);

  const firstName =
    user?.name?.trim()?.split(/\s+/)[0] ||
    user?.full_name?.trim()?.split(/\s+/)[0] ||
    "Team";

  const loadDashboard = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const { data } = await api.get("/dashboard");

      setStats(data || {});
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load dashboard information. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const cards = [
    {
      label: "Pharmaceutical Companies",
      value: stats?.companies,
      icon: Building2,
      color: "blue",
      description: "Registered suppliers",
      to: "/companies",
    },
    {
      label: "Medicines in Catalogue",
      value: stats?.medicines,
      icon: Package,
      color: "teal",
      description: "Catalogue products",
      to: "/medicines",
    },
    {
      label: "Registered Customers",
      value: stats?.customers,
      icon: Users,
      color: "purple",
      description: "Customer directory",
      to: "/customers",
    },
    {
      label: "Orders Awaiting Approval",
      value: stats?.pendingOrders,
      icon: ClipboardList,
      color: "orange",
      description: "Pending order bookings",
      to: "/orders",
    },
  ];

  const quickActions = [
    {
      title: "Book a New Order",
      description: "Create a customer order",
      icon: ShoppingBag,
      color: "teal",
      to: "/new-order",
    },
    {
      title: "Find a Medicine",
      description: "Search medicine catalogues",
      icon: Search,
      color: "blue",
      to: "/medicines",
    },
    {
      title: "View Customers",
      description: "Find a store or contact",
      icon: Users,
      color: "purple",
      to: "/customers",
    },
    {
      title: "Manage Companies",
      description: "Review pharmaceutical suppliers",
      icon: Building2,
      color: "indigo",
      to: "/companies",
    },
    ...(canManage
      ? [
          {
            title: "Import Medicines",
            description: "Upload a company Excel file",
            icon: Package,
            color: "purple",
            to: "/imports",
          },
          {
            title: "Review Orders",
            description: "Check and approve bookings",
            icon: ClipboardList,
            color: "orange",
            to: "/orders",
          },
        ]
      : []),
  ];

  return (
    <main className="dashboard-page">
      {/* Welcome header */}
      <header className="dashboard-header">
        <div className="dashboard-heading-copy">
          <div className="dashboard-eyebrow">
            <span className="dashboard-live-dot" />
            DISTRIBUTION MANAGEMENT
          </div>

          <h1>Welcome back, {firstName}</h1>

          <p>
            Here's your distribution overview. Manage suppliers, medicines,
            customers, and orders from one place.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-btn dashboard-btn-secondary"
          onClick={() => loadDashboard(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "dashboard-spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {/* Error feedback */}
      {error && (
        <div className="dashboard-alert" role="alert">
          <AlertCircle size={19} />
          <span>{error}</span>

          <button
            type="button"
            className="dashboard-alert-retry"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary cards */}
      <section className="dashboard-stats-grid" aria-label="Distribution summary">
        {cards.map((card) => {
          const Icon = card.icon;
          const value = card.value;

          return (
            <Link
              to={card.to}
              className="dashboard-stat-card"
              key={card.label}
            >
              <div className="dashboard-stat-top">
                <span className={`dashboard-stat-icon ${card.color}`}>
                  <Icon size={21} />
                </span>

                <span className="dashboard-stat-arrow">
                  <ArrowUpRight size={17} />
                </span>
              </div>

              <span className="dashboard-stat-label">{card.label}</span>

              <strong className="dashboard-stat-value">
                {loading && stats === null
                  ? "—"
                  : Number.isFinite(Number(value)) && value !== null &&
                      value !== undefined
                    ? Number(value).toLocaleString()
                    : "—"}
              </strong>

              <span className="dashboard-stat-description">
                {card.description}
              </span>
            </Link>
          );
        })}
      </section>

      {/* Main dashboard content */}
      <div className="dashboard-content-grid">
        <section className="dashboard-panel dashboard-actions-panel">
          <div className="dashboard-panel-heading">
            <div>
              <span className="dashboard-section-kicker">WORKSPACE</span>
              <h2>Quick Actions</h2>
              <p>Jump directly to your next task.</p>
            </div>

            <span className="dashboard-heading-icon">
              <ArrowUpRight size={19} />
            </span>
          </div>

          <div className="dashboard-quick-grid">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  to={action.to}
                  className="dashboard-quick-action"
                  key={action.title}
                >
                  <span className={`dashboard-quick-icon ${action.color}`}>
                    <Icon size={20} />
                  </span>

                  <span className="dashboard-quick-copy">
                    <strong>{action.title}</strong>
                    <small>{action.description}</small>
                  </span>

                  <ArrowUpRight
                    size={17}
                    className="dashboard-quick-arrow"
                  />
                </Link>
              );
            })}
          </div>
        </section>

        {/* Workflow guide */}
        <aside className="dashboard-panel dashboard-workflow-panel">
          <div className="dashboard-workflow-art">
            <Truck size={29} />
          </div>

          <span className="dashboard-section-kicker">
            YOUR DISTRIBUTION WORKFLOW
          </span>

          <h2>From supplier to customer.</h2>

          <p>
            Keep your pharmaceutical catalogue organized, maintain customer
            records, and process orders through a consistent workflow.
          </p>

          <div className="dashboard-workflow-steps">
            <div className="dashboard-workflow-step">
              <span className="dashboard-step-number">01</span>
              <span>
                <strong>Manage suppliers</strong>
                <small>Maintain company records.</small>
              </span>
              <CheckCircle2 size={17} />
            </div>

            <div className="dashboard-workflow-step">
              <span className="dashboard-step-number">02</span>
              <span>
                <strong>Organize medicines</strong>
                <small>Keep products linked to companies.</small>
              </span>
              <CheckCircle2 size={17} />
            </div>

            <div className="dashboard-workflow-step">
              <span className="dashboard-step-number">03</span>
              <span>
                <strong>Process orders</strong>
                <small>Book and review customer orders.</small>
              </span>
              <CheckCircle2 size={17} />
            </div>
          </div>

          <Link to="/new-order" className="dashboard-workflow-link">
            <Plus size={17} />
            Start a new order
            <ArrowUpRight size={16} />
          </Link>
        </aside>
      </div>

      {/* Footer information */}
      <footer className="dashboard-footer">
        <div className="dashboard-footer-status">
          <span className={error ? "dashboard-status-dot error" : "dashboard-status-dot"} />
          {error
            ? "Dashboard connection needs attention"
            : loading
              ? "Loading dashboard data..."
              : "Dashboard ready"}
        </div>

        <span>
          {lastUpdated
            ? `Last updated ${lastUpdated.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "Waiting for dashboard data"}
        </span>
      </footer>
    </main>
  );
}
