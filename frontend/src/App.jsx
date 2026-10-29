
import { useEffect, useState } from "react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import {
  Activity,
  Boxes,
  Building2,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Package,
  Settings,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";

import api from "./services/api";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CompaniesPage from "./pages/CompaniesPage";
import MedicinesPage from "./pages/MedicinesPage";
import CustomersPage from "./pages/CustomersPage";
import OrderPage from "./pages/OrderPage";
import OrdersPage from "./pages/OrdersPage";
import StockPage from "./pages/StockPage";
import ImportPage from "./pages/ImportPage";
import UsersPage from "./pages/UsersPage";

import "./styles/app.css";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/companies", label: "Companies", icon: Building2 },
  {
    to: "/medicines",
    label: "Medicine catalogue",
    icon: Package,
  },
  { to: "/customers", label: "Customers", icon: Users },
  {
    to: "/new-order",
    label: "Book an Order",
    icon: ShoppingCart,
  },
  {
    to: "/orders",
    label: "My Orders",
    icon: ClipboardList,
  },
  {
    to: "/stock",
    label: "Stock & Prices",
    icon: Boxes,
    admin: true,
  },
  {
    to: "/imports",
    label: "Excel Imports",
    icon: FileSpreadsheet,
    admin: true,
  },
  {
    to: "/users",
    label: "Staff Accounts",
    icon: Settings,
    admin: true,
  },
];

function getRole(user) {
  return String(user?.role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

function isOrderBooker(user) {
  return ["order-booker", "orderbooker"].includes(getRole(user));
}

function isAdminOrManager(user) {
  return ["admin", "manager"].includes(getRole(user));
}

function getHomePath() {
  return "/";
}

/* Mobile bottom navigation */
function MobileNavigation({
  links,
  moreOpen,
  onMoreClick,
  onCloseMore,
}) {
  const primaryPaths = [
    "/",
    "/companies",
    "/new-order",
    "/orders",
  ];

  const primaryLinks = links.filter((link) =>
    primaryPaths.includes(link.to)
  );

  const extraLinks = links.filter(
    (link) => !primaryPaths.includes(link.to)
  );

  const mobileLabels = {
    "/": "Home",
    "/companies": "Companies",
    "/new-order": "Book Order",
    "/orders": "Orders",
  };

  return (
    <>
      {moreOpen && extraLinks.length > 0 && (
        <button
          type="button"
          className="mobile-more-backdrop"
          aria-label="Close More menu"
          onClick={onCloseMore}
        />
      )}

      {moreOpen && extraLinks.length > 0 && (
        <section
          className="mobile-more-menu"
          aria-label="Additional navigation"
        >
          <div className="mobile-more-heading">
            <div>
              <strong>More options</strong>
              <span>Additional workspace pages</span>
            </div>

            <button
              type="button"
              className="mobile-more-close"
              onClick={onCloseMore}
              aria-label="Close More menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mobile-more-grid">
            {extraLinks.map((link) => {
              const Icon = link.icon;

              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onCloseMore}
                  className={({ isActive }) =>
                    `mobile-more-item ${
                      isActive ? "active" : ""
                    }`
                  }
                >
                  <span className="mobile-more-icon">
                    <Icon size={21} />
                  </span>
                  <span className="mobile-more-label">
                    {link.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </section>
      )}

      <nav
        className="mobile-bottom-nav"
        aria-label="Mobile navigation"
        style={{
          gridTemplateColumns: `repeat(${
            primaryLinks.length + (extraLinks.length ? 1 : 0)
          }, minmax(0, 1fr))`,
        }}
      >
        {primaryLinks.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={onCloseMore}
              className={({ isActive }) =>
                `mobile-nav-item ${
                  isActive ? "active" : ""
                }`
              }
            >
              <Icon size={21} strokeWidth={2} />
              <span>{mobileLabels[link.to] || link.label}</span>
            </NavLink>
          );
        })}

        {extraLinks.length > 0 && (
          <button
            type="button"
            className={`mobile-nav-item mobile-more-button ${
              moreOpen ? "active" : ""
            }`}
            onClick={onMoreClick}
            aria-expanded={moreOpen}
          >
            <MoreHorizontal size={23} strokeWidth={2} />
            <span>More</span>
          </button>
        )}
      </nav>
    </>
  );
}

function ProtectedApp() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("sameel_user") || "null"
      );
    } catch {
      return null;
    }
  });

  const [checking, setChecking] = useState(
    Boolean(localStorage.getItem("sameel_token"))
  );

  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const logout = () => {
      localStorage.removeItem("sameel_token");
      localStorage.removeItem("sameel_user");
      setUser(null);
      setMoreOpen(false);
      navigate("/login");
    };

    window.addEventListener("sameel:logout", logout);

    const token = localStorage.getItem("sameel_token");

    if (token) {
      api
        .get("/me")
        .then(({ data }) => {
          setUser(data.user);
          localStorage.setItem(
            "sameel_user",
            JSON.stringify(data.user)
          );
        })
        .catch(() => {
          localStorage.removeItem("sameel_token");
          localStorage.removeItem("sameel_user");
          setUser(null);
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }

    return () => {
      window.removeEventListener("sameel:logout", logout);
    };
  }, [navigate]);

  const signOut = () => {
    localStorage.removeItem("sameel_token");
    localStorage.removeItem("sameel_user");
    setUser(null);
    setMoreOpen(false);
    navigate("/login", { replace: true });
  };

  if (checking) {
    return (
      <div className="loading-screen">
        Checking your secure session…
      </div>
    );
  }

  const booker = isOrderBooker(user);
  const adminOrManager = isAdminOrManager(user);

  const visibleLinks = links.filter((link) => {
    if (booker) {
      return [
        "/",
        "/companies",
        "/new-order",
        "/orders",
      ].includes(link.to);
    }

    return !link.admin || adminOrManager;
  });

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={getHomePath(user)} replace />
          ) : (
            <LoginPage
              onLogin={(loggedInUser) => {
                setUser(loggedInUser);
                navigate(getHomePath(loggedInUser), {
                  replace: true,
                });
              }}
            />
          )
        }
      />

      <Route
        path="/*"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : (
            <div className="app-shell">
              <aside className="sidebar">
                <div className="brand">
                  <div className="brand-mark">
                    <Activity size={23} />
                  </div>

                  <div>
                    <strong>Sameel</strong>
                    <span>ENTERPRISES</span>
                  </div>
                </div>

                <div className="side-caption">
                  {booker ? "ORDER BOOKING" : "WORKSPACE"}
                </div>

                <nav className="side-nav">
                  {visibleLinks.map((link) => {
                    const Icon = link.icon;

                    return (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.to === "/"}
                        className={({ isActive }) =>
                          `nav-link ${
                            isActive ? "active" : ""
                          }`
                        }
                      >
                        <Icon size={18} />
                        <span>{link.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>

                <div className="sidebar-bottom">
                  <span className="online-dot" />
                  Private staff workspace
                  <small>Pakistan distribution</small>
                </div>
              </aside>

              <main className="main-area">
                <header className="topbar">
                  <div>
                    <span className="eyebrow">
                      {booker
                        ? "ORDER BOOKER PORTAL"
                        : "DISTRIBUTION MANAGEMENT"}
                    </span>
                    <strong>Sameel Enterprises</strong>
                  </div>

                  <div className="profile">
                    <div className="avatar">
                      {(
                        user.name ||
                        user.full_name ||
                        "S"
                      )
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>

                    <div>
                      <strong>
                        {user.name || user.full_name}
                      </strong>
                      <span>{user.role}</span>
                    </div>

                    <button
                      type="button"
                      className="icon-button"
                      onClick={signOut}
                      title="Sign out"
                      aria-label="Sign out"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                </header>

                <div className="page-content">
                  <Routes>
                    <Route
                      path="/"
                      element={
                        booker ? (
                          <div className="booker-dashboard">
                            <h2>Welcome to Order Booking</h2>
                            <p>
                              Select a company, book customer
                              orders, and track your submissions.
                            </p>

                            <div
                              className="booker-actions"
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: "20px",
                                marginTop: "28px",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  navigate("/companies")
                                }
                                style={actionStyle}
                              >
                                <Building2 size={28} />
                                <strong>View Companies</strong>
                                <span>
                                  Browse available companies
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  navigate("/new-order")
                                }
                                style={actionStyle}
                              >
                                <ShoppingCart size={28} />
                                <strong>Book an Order</strong>
                                <span>
                                  Create a new customer order
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  navigate("/orders")
                                }
                                style={actionStyle}
                              >
                                <ClipboardList size={28} />
                                <strong>My Orders</strong>
                                <span>
                                  Review your booked orders
                                </span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <DashboardPage user={user} />
                        )
                      }
                    />

                    <Route
                      path="/companies"
                      element={<CompaniesPage user={user} />}
                    />

                    <Route
                      path="/new-order"
                      element={<OrderPage user={user} />}
                    />

                    <Route
                      path="/orders"
                      element={
                        <OrdersPage
                          user={user}
                          bookerOnly={booker}
                        />
                      }
                    />

                    {!booker && (
                      <>
                        <Route
                          path="/medicines"
                          element={<MedicinesPage />}
                        />

                        <Route
                          path="/customers"
                          element={<CustomersPage />}
                        />

                        {adminOrManager && (
                          <>
                            <Route
                              path="/stock"
                              element={<StockPage />}
                            />

                            <Route
                              path="/imports"
                              element={<ImportPage />}
                            />

                            <Route
                              path="/users"
                              element={<UsersPage />}
                            />
                          </>
                        )}
                      </>
                    )}

                    <Route
                      path="*"
                      element={
                        <Navigate
                          to="/"
                          replace
                        />
                      }
                    />
                  </Routes>
                </div>
              </main>

              <MobileNavigation
                links={visibleLinks}
                moreOpen={moreOpen}
                onMoreClick={() =>
                  setMoreOpen((open) => !open)
                }
                onCloseMore={() => setMoreOpen(false)}
              />
            </div>
          )
        }
      />
    </Routes>
  );
}

const actionStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "12px",
  padding: "24px",
  borderRadius: "14px",
  border: "1px solid #29496c",
  background: "#142b45",
  color: "#ffffff",
  cursor: "pointer",
  textAlign: "left",
  minHeight: "150px",
};

export default function App() {
  return <ProtectedApp />;
}
