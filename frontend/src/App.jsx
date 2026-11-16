

import { useEffect, useMemo, useState } from "react";

import {

  LayoutDashboard,

  Activity,

  TrendingUp,

  Lightbulb,

  Zap,

  RefreshCw,

  AlertCircle,

  CheckCircle,

  Menu,

  X,

  Gauge,

  CalendarDays,

  IndianRupee,

  Target,

  Users,

  LogOut,

  UserPlus,

} from "lucide-react";



import {

  ResponsiveContainer,

  AreaChart,

  Area,

  XAxis,

  YAxis,

  CartesianGrid,

  Tooltip,

  Legend,

  BarChart,

  Bar,

} from "recharts";



import axios from "axios";

import "./App.css";



const API = "http://127.0.0.1:8000";



const api = axios.create({

  baseURL: API,

  timeout: 15000,

});



// Automatically attach JWT to protected API requests.

api.interceptors.request.use((config) => {

  const token = localStorage.getItem("energyiq_token");



  if (token) {

    config.headers.Authorization = `Bearer ${token}`;

  }



  return config;

});



const navigation = [

  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },

  { id: "consumption", label: "Consumption", icon: Activity },

  { id: "forecast", label: "Forecast Analytics", icon: TrendingUp },

  { id: "insights", label: "Energy Insights", icon: Lightbulb },

];



const number = (value, digits = 2) =>

  Number(value || 0).toFixed(digits);



const formatDate = (date) => {

  if (!date) return "-";



  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return date;



  return parsed.toLocaleDateString("en-IN", {

    day: "2-digit",

    month: "short",

    year: "numeric",

  });

};



const formatShortDate = (date) => {

  if (!date) return "";



  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return date;



  return parsed.toLocaleDateString("en-IN", {

    day: "2-digit",

    month: "short",

  });

};



function Loading({ message = "Loading energy data..." }) {

  return (

    <div className="loading-state">

      <RefreshCw className="spin" size={24} />

      <p>{message}</p>

    </div>

  );

}



function EmptyState({ message }) {

  return (

    <div className="empty-state">

      <AlertCircle size={24} />

      <p>{message}</p>

    </div>

  );

}



function StatCard({ title, value, unit, icon: Icon, description }) {

  return (

    <div className="stat-card">

      <div className="stat-card-top">

        <span>{title}</span>

        <div className="stat-icon">

          <Icon size={19} />

        </div>

      </div>



      <div className="stat-value">

        {value}

        <small>{unit}</small>

      </div>



      <p className="stat-description">{description}</p>

    </div>

  );

}





function LoginScreen({

  email,

  setEmail,

  password,

  setPassword,

  onLogin,

  onRegister,

  loading,

  error,

}) {

  const [mode, setMode] = useState("login");
  const [selectedRole, setSelectedRole] = useState("owner");

  const [name, setName] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [registerError, setRegisterError] = useState("");



  const handleSubmit = (e) => {

    e.preventDefault();



    if (mode === "register") {

      if (password !== confirmPassword) {

        setRegisterError("Passwords do not match.");

        return;

      }



      setRegisterError("");

      onRegister({ name, email, password });

    } else {

      onLogin(e, selectedRole);

    }

  };



  return (

    <div className="login-screen">

      <form className="login-card" onSubmit={handleSubmit}>

        <div className="login-brand">

          <div className="brand-icon">

            <Zap size={30} />

          </div>

          <h1>EnergyIQ</h1>

          <p>SMART ENERGY MONITORING SYSTEM</p>

        </div>



        <h2>{mode === "login" ? "Welcome back" : "Create Owner Account"}</h2>

        <p className="login-description">
          {mode === "login"
            ? "Choose your account type and sign in to EnergyIQ."
            : "Register as an owner to get started with EnergyIQ."}
        </p>

        {mode === "login" && (
          <div className="login-role-picker" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "18px 0 22px" }}>
            <button
              type="button"
              onClick={() => setSelectedRole("owner")}
              aria-pressed={selectedRole === "owner"}
              style={{
                padding: "14px 10px",
                borderRadius: 12,
                border: selectedRole === "owner" ? "2px solid #38bdf8" : "1px solid rgba(148,163,184,.35)",
                background: selectedRole === "owner" ? "rgba(56,189,248,.12)" : "transparent",
                color: "inherit",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              <span style={{ display: "block", fontSize: 22, marginBottom: 5 }}>🏢</span>
              Owner Login
              <span style={{ display: "block", fontSize: 11, fontWeight: 400, opacity: .7, marginTop: 4 }}>Manage properties</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole("tenant")}
              aria-pressed={selectedRole === "tenant"}
              style={{
                padding: "14px 10px",
                borderRadius: 12,
                border: selectedRole === "tenant" ? "2px solid #38bdf8" : "1px solid rgba(148,163,184,.35)",
                background: selectedRole === "tenant" ? "rgba(56,189,248,.12)" : "transparent",
                color: "inherit",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              <span style={{ display: "block", fontSize: 22, marginBottom: 5 }}>🏠</span>
              Tenant Login
              <span style={{ display: "block", fontSize: 11, fontWeight: 400, opacity: .7, marginTop: 4 }}>View assigned usage</span>
            </button>
          </div>
        )}



        {mode === "register" && (

          <>

            <label>Full name</label>

            <input

              value={name}

              onChange={(e) => setName(e.target.value)}

              placeholder="Enter your name"

              minLength={2}

              required

            />

          </>

        )}



        <label>Email address</label>

        <input

          type="email"

          value={email}

          onChange={(e) => setEmail(e.target.value)}

          placeholder="Enter your email"

          required

        />



        <label>Password</label>

        <input

          type="password"

          value={password}

          onChange={(e) => setPassword(e.target.value)}

          placeholder="Enter your password"

          minLength={mode === "register" ? 8 : undefined}

          required

        />



        {mode === "register" && (

          <>

            <label>Confirm password</label>

            <input

              type="password"

              value={confirmPassword}

              onChange={(e) => setConfirmPassword(e.target.value)}

              placeholder="Confirm your password"

              required

            />

          </>

        )}



        {(error || registerError) && (

          <div className="login-error">{registerError || error}</div>

        )}



        <button className="login-button" type="submit" disabled={loading}>

          {loading

            ? "Please wait..."

            : mode === "login"

            ? "Sign In"

            : "Register as Owner"}

        </button>



        <p style={{ textAlign: "center", marginTop: 20 }}>

          {mode === "login" ? "New to EnergyIQ? " : "Already registered? "}

          <button

            type="button"

            onClick={() => {

              setMode(mode === "login" ? "register" : "login");

              setRegisterError("");
              setSelectedRole("owner");

            }}

            style={{

              background: "none",

              border: "none",

              color: "#38bdf8",

              cursor: "pointer",

              fontWeight: 600,

            }}

          >

            {mode === "login" ? "Register as Owner" : "Sign In"}

          </button>

        </p>

      </form>

    </div>

  );

}





export default function App() {

  // Authentication

  const [user, setUser] = useState(null);

  const [authChecking, setAuthChecking] = useState(true);

  const [loginEmail, setLoginEmail] = useState("");

  const [loginPassword, setLoginPassword] = useState("");

  const [loginLoading, setLoginLoading] = useState(false);

  const [loginError, setLoginError] = useState("");



  // Navigation and dashboard

  const [page, setPage] = useState("dashboard");

  const [region, setRegion] = useState("");

  const [meter, setMeter] = useState("");

  const [regions, setRegions] = useState([]);

  const [meters, setMeters] = useState([]);

  const [dashboard, setDashboard] = useState(null);



  const [loadingRegions, setLoadingRegions] = useState(false);

  const [loadingMeters, setLoadingMeters] = useState(false);

  const [loadingDashboard, setLoadingDashboard] = useState(false);



  const [backendOnline, setBackendOnline] = useState(false);

  const [error, setError] = useState("");

  const [mobileMenu, setMobileMenu] = useState(false);

  const [historyFilter, setHistoryFilter] = useState("all");



  // Energy target

  const [target, setTarget] = useState(

    () => localStorage.getItem("energyiq_target") || "150"

  );



  // Owner tenant management

  const [tenants, setTenants] = useState([]);

  const [tenantName, setTenantName] = useState("");

  const [tenantEmail, setTenantEmail] = useState("");

  const [tenantPassword, setTenantPassword] = useState("");

  const [selectedTenant, setSelectedTenant] = useState("");



  const [managementMessage, setManagementMessage] = useState("");

  const [managementError, setManagementError] = useState("");

  const [managementLoading, setManagementLoading] = useState(false);

  // Owner properties and tenant property access.
  const [properties, setProperties] = useState([]);
  const [propertiesLoaded, setPropertiesLoaded] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [propertyRegion, setPropertyRegion] = useState("");
  const [propertyMeter, setPropertyMeter] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [propertyMeters, setPropertyMeters] = useState([]);
  const [assignmentPropertyId, setAssignmentPropertyId] = useState("");

  const role = user?.role || "";

  const isOwner = role === "owner";



  // Verify an existing session when the app opens.

  useEffect(() => {

    const verifySession = async () => {

      const token = localStorage.getItem("energyiq_token");



      if (!token) {

        setAuthChecking(false);

        return;

      }



      try {

        const response = await api.get("/api/auth/me");

        setUser(response.data);

      } catch {

        localStorage.removeItem("energyiq_token");

        localStorage.removeItem("energyiq_user");

        setUser(null);

      } finally {

        setAuthChecking(false);

      }

    };



    verifySession();

  }, []);



  // Login

  const handleLogin = async (e, expectedRole = "owner") => {

    e.preventDefault();



    setLoginLoading(true);

    setLoginError("");



    try {

      const response = await api.post("/api/auth/login", {

        email: loginEmail,

        password: loginPassword,

      });



      const data = response.data;

      // The selected tab is only a sign-in preference. The backend role is
      // authoritative, so never create a session for the wrong account type.
      if (data.user?.role !== expectedRole) {
        setLoginError(
          expectedRole === "owner"
            ? "This account is not an owner account. Choose Tenant Login instead."
            : "This account is not a tenant account. Choose Owner Login instead."
        );
        return;
      }

      localStorage.setItem("energyiq_token", data.access_token);

      localStorage.setItem("energyiq_user", JSON.stringify(data.user));



      setUser(data.user);

      setLoginPassword("");

      setPage("dashboard");

    } catch (err) {

      setLoginError(

        err.response?.data?.detail ||

          "Login failed. Please check your email and password."

      );

    } finally {

      setLoginLoading(false);

    }

  };



const handleRegister = async (details) => {

  setLoginLoading(true);

  setLoginError("");



  try {

    await api.post("/api/auth/register", details);



    const response = await api.post("/api/auth/login", {

      email: details.email,

      password: details.password,

    });



    localStorage.setItem("energyiq_token", response.data.access_token);

    localStorage.setItem("energyiq_user", JSON.stringify(response.data.user));



    setUser(response.data.user);

    setLoginPassword("");

  } catch (err) {

    setLoginError(

      err.response?.data?.detail || "Registration failed. Please try again."

    );

  } finally {

    setLoginLoading(false);

  }

};



  // Logout

  const handleLogout = () => {

    localStorage.removeItem("energyiq_token");

    localStorage.removeItem("energyiq_user");



    setUser(null);

    setDashboard(null);

    setRegions([]);

    setMeters([]);

    setRegion("");

    setMeter("");
    setProperties([]);
    setPropertiesLoaded(false);
    setSelectedPropertyId("");
    setPropertyName("");
    setPropertyRegion("");
    setPropertyMeter("");
    setPropertyAddress("");
    setPropertyMeters([]);
    setAssignmentPropertyId("");
    setError("");
    setLoginEmail("");

    setLoginPassword("");

    setPage("dashboard");

  };



  // Load available regions after authentication.

  useEffect(() => {

    if (!user) return;



    let active = true;



    const loadRegions = async () => {

      setLoadingRegions(true);

      setError("");



      try {

        const response = await api.get("/api/regions");



        if (!active) return;



        const availableRegions = response.data?.regions || [];



        setRegions(availableRegions);

        setBackendOnline(true);



        if (availableRegions.length > 0) {

          setRegion((current) =>

            current && availableRegions.includes(current)

              ? current

              : availableRegions[0]

          );

        }

      } catch (err) {

        if (!active) return;



        setBackendOnline(false);

        setError(

          err.response?.data?.detail ||

            "Unable to connect to the EnergyIQ backend."

        );

      } finally {

        if (active) setLoadingRegions(false);

      }

    };



    loadRegions();



    return () => {

      active = false;

    };

  }, [user]);



  // Load the available meter list for the selected region. The dashboard
  // only selects meters attached to an owner's property or tenant assignment.
  useEffect(() => {
    if (!user || !region || !propertiesLoaded) return;

    let active = true;

    const loadMeters = async () => {
      setLoadingMeters(true);
      setError("");

      try {
        const response = await api.get(
          `/api/meters/${encodeURIComponent(region)}`
        );

        if (!active) return;

        const availableMeters = response.data?.meters || [];
        setMeters(availableMeters);
        setBackendOnline(true);

        const selected = properties.find(
          (item) => String(item.id) === String(selectedPropertyId)
        );

        if (selected && selected.region === region) {
          setMeter(selected.meter_id);
        } else {
          setMeter("");
        }
      } catch (err) {
        if (!active) return;
        setMeters([]);
        setBackendOnline(false);
        setError(err.response?.data?.detail || "Unable to load meters.");
      } finally {
        if (active) setLoadingMeters(false);
      }
    };

    loadMeters();

    return () => {
      active = false;
    };
  }, [user, region, propertiesLoaded, properties, selectedPropertyId]);

  // Load authenticated dashboard data.

  useEffect(() => {

    if (!user || !region || !meter) {

      setDashboard(null);

      return;

    }



    let active = true;



    const loadDashboard = async () => {

      setLoadingDashboard(true);

      setError("");



      try {

        const response = await api.get(

          `/api/dashboard/${encodeURIComponent(region)}/${encodeURIComponent(meter)}`

        );



        if (!active) return;



        if (response.data?.status !== "success") {

          throw new Error("Dashboard data unavailable.");

        }



        setDashboard(response.data);

        setBackendOnline(true);

      } catch (err) {

        if (!active) return;



        setDashboard(null);

        setBackendOnline(true);



        if (err.response?.status === 401) {

          setError("Your session has expired. Please sign in again.");

          handleLogout();

          return;

        }



        setError(

          err.response?.data?.detail ||

            err.message ||

            "Unable to load dashboard data."

        );

      } finally {

        if (active) setLoadingDashboard(false);

      }

    };



    loadDashboard();



    return () => {

      active = false;

    };

  }, [user, region, meter]);



  // Load owner tenants.

  const loadTenants = async () => {

    try {

      const response = await api.get("/api/auth/tenants");

      const list = Array.isArray(response.data)

        ? response.data

        : response.data?.tenants || [];



      setTenants(list);



      if (list.length > 0) {

        setSelectedTenant((current) =>

          current || String(list[0].id)

        );

      }

    } catch (err) {

      setManagementError(

        err.response?.data?.detail || "Unable to load tenants."

      );

    }

  };



  const loadProperties = async () => {
    if (!user) return;
    setManagementError("");
    try {
      const endpoint = isOwner ? "/api/owner/dashboard-properties" : "/api/auth/tenant-properties";
      const response = await api.get(endpoint);
      const rawList = response.data?.properties || [];
      const list = rawList
        .filter((item) => item.region && item.meter_id)
        .map((item, index) => ({
          ...item,
          id: item.id ?? item.property_id ?? item.assignment_id ?? `legacy-${index}`,
          property_name: item.property_name || "Assigned property",
        }));
      setProperties(list);
      setPropertiesLoaded(true);
      const current = list.find((item) => String(item.id) === String(selectedPropertyId));
      const selected = current || list[0];
      if (selected) {
        setSelectedPropertyId(String(selected.id));
        setRegion(selected.region);
        setMeter(selected.meter_id);
        if (isOwner && page === "properties") setPage("dashboard");
      } else if (isOwner) {
        setSelectedPropertyId("");
        setMeter("");
        setPage("properties");
      } else {
        setSelectedPropertyId("");
        setMeter("");
        setError("No property has been assigned to your account yet. Please contact the owner.");
      }
    } catch (err) {
      setPropertiesLoaded(true);
      setManagementError(err.response?.data?.detail || "Unable to load properties.");
    }
  };

  useEffect(() => {
    if (user) loadProperties();
  }, [user]);

  useEffect(() => {

    if (user && user.role === "owner") {

      loadTenants();

    }

  }, [user]);



  // Create tenant.

  const handleCreateTenant = async (e) => {

    e.preventDefault();



    setManagementLoading(true);

    setManagementMessage("");

    setManagementError("");



    try {

      await api.post("/api/auth/tenants", {

        name: tenantName,

        email: tenantEmail,

        password: tenantPassword,

      });



      setManagementMessage("Tenant account created successfully.");

      setTenantName("");

      setTenantEmail("");

      setTenantPassword("");



      await loadTenants();

    } catch (err) {

      setManagementError(

        err.response?.data?.detail || "Unable to create tenant."

      );

    } finally {

      setManagementLoading(false);

    }

  };



  // Assign a real dataset meter to a tenant.

  // Add a property using a meter that exists in the selected dataset.
  const handleAddProperty = async (e) => {
    e.preventDefault();
    setManagementLoading(true);
    setManagementMessage("");
    setManagementError("");

    try {
      const response = await api.post("/api/auth/properties", {
        property_name: propertyName.trim(),
        region: propertyRegion,
        meter_id: propertyMeter,
        address: propertyAddress.trim(),
      });

      const created = response.data?.property;
      setPropertyName("");
      setPropertyAddress("");
      setPropertyMeter("");
      setManagementMessage("Property added successfully.");

      await loadProperties();

      if (created) {
        setSelectedPropertyId(String(created.id));
        setRegion(created.region);
        setMeter(created.meter_id);
        setPage("dashboard");
      }
    } catch (err) {
      setManagementError(
        err.response?.data?.detail || "Unable to add property."
      );
    } finally {
      setManagementLoading(false);
    }
  };

  // Assign a saved property to a tenant.
  const handleAssignProperty = async (e) => {
    e.preventDefault();
    setManagementLoading(true);
    setManagementMessage("");
    setManagementError("");

    try {
      await api.post("/api/auth/assign-property", {
        tenant_id: Number(selectedTenant),
        property_id: Number(assignmentPropertyId),
      });
      setManagementMessage("Property assigned to tenant successfully.");
      setAssignmentPropertyId("");
    } catch (err) {
      setManagementError(
        err.response?.data?.detail || "Unable to assign property."
      );
    } finally {
      setManagementLoading(false);
    }
  };

  // Dashboard calculations.

  const summary = dashboard?.summary || {};



  const history = useMemo(

    () =>

      (dashboard?.history || []).map((item) => ({

        ...item,

        consumption_kwh: Number(item.consumption_kwh || 0),

      })),

    [dashboard]

  );



  const forecast = useMemo(

    () =>

      (dashboard?.forecast || []).map((item) => ({

        ...item,

        predicted_kwh: Number(item.predicted_kwh || 0),

      })),

    [dashboard]

  );



  const filteredHistory = useMemo(() => {

    if (historyFilter === "7") return history.slice(-7);

    if (historyFilter === "15") return history.slice(-15);

    return history;

  }, [history, historyFilter]);



  const chartData = useMemo(() => {

    const actual = history.map((item) => ({

      date: item.date,

      actual: item.consumption_kwh,

      forecast: null,

    }));



    const predicted = forecast.map((item) => ({

      date: item.date,

      actual: null,

      forecast: item.predicted_kwh,

    }));



    return [...actual, ...predicted].map((item) => ({

      ...item,

      displayDate: formatShortDate(item.date),

    }));

  }, [history, forecast]);



  const averageForecast = forecast.length

    ? forecast.reduce((sum, item) => sum + item.predicted_kwh, 0) /

      forecast.length

    : 0;



  const averageHistory = history.length

    ? history.reduce((sum, item) => sum + item.consumption_kwh, 0) /

      history.length

    : 0;



  const targetValue = Number(target) || 0;

  const projectedMonthlyUsage = averageForecast * 30;



  const targetStatus =

    targetValue > 0 && projectedMonthlyUsage > targetValue

      ? "above"

      : "within";



  const saveTarget = (value) => {

    setTarget(value);

    localStorage.setItem("energyiq_target", value);

  };



  const currentPage = navigation.find((item) => item.id === page);



  // Main dashboard.

  const renderDashboard = () => (

    <>

      <div className="page-heading">

        <div>

          <h1>Energy Dashboard</h1>

          <p>Monitor your electricity consumption and estimated costs.</p>

        </div>



        <div className="selection-controls">
          <select
            value={selectedPropertyId}
            onChange={(e) => {
              const selected = properties.find(
                (item) => String(item.id) === e.target.value
              );
              if (selected) {
                setSelectedPropertyId(String(selected.id));
                setRegion(selected.region);
                setMeter(selected.meter_id);
              }
            }}
            disabled={properties.length === 0}
          >
            <option value="">Select property</option>
            {properties.map((item) => (
              <option key={item.id} value={item.id}>
                {item.property_name} — {item.meter_id}
              </option>
            ))}
          </select>
          {isOwner && (
            <button type="button" onClick={() => setPage("properties")}>
              + Add Property
            </button>
          )}
        </div>

      </div>



      <div className="welcome-panel">

        <div>

          <span className="eyebrow">ENERGYIQ MONITORING</span>

          <h2>Understand your energy usage.</h2>

          <p>

            Track consumption, estimate electricity costs and explore

            model-generated forecasts.

          </p>

        </div>



        <div className="welcome-icon">

          <Zap size={48} />

        </div>

      </div>



      {loadingDashboard ? (

        <Loading message="Fetching meter readings and predictions..." />

      ) : dashboard ? (

        <>

          <div className="stats-grid">

            <StatCard

              title="30-Day Consumption"

              value={number(summary.total_usage_30_days)}

              unit="kWh"

              icon={Activity}

              description="Based on available historical readings"

            />



            <StatCard

              title="Daily Average"

              value={number(summary.average_daily_usage)}

              unit="kWh"

              icon={Gauge}

              description="Average daily consumption"

            />



            <StatCard

              title="7-Day Forecast"

              value={number(summary.predicted_usage_7_days)}

              unit="kWh"

              icon={TrendingUp}

              description="Machine learning prediction"

            />



            <StatCard

              title="Estimated Bill"

              value={`₹${number(summary.estimated_monthly_bill)}`}

              unit=""

              icon={IndianRupee}

              description={`Tariff: ₹${number(summary.tariff_per_unit)} per unit`}

            />

          </div>



          <div className="content-card chart-card">

            <div className="section-heading">

              <div>

                <h3>Consumption Overview</h3>

                <p>Historical readings and upcoming predictions</p>

              </div>



              <span className="chart-legend-label">

                <span className="legend-dot actual-dot" /> Actual

                <span className="legend-dot forecast-dot" /> Forecast

              </span>

            </div>



            {chartData.length > 0 ? (

              <div className="chart-container">

                <ResponsiveContainer width="100%" height={320}>

                  <AreaChart data={chartData}>

                    <defs>

                      <linearGradient

                        id="actualGradient"

                        x1="0"

                        y1="0"

                        x2="0"

                        y2="1"

                      >

                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />

                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />

                      </linearGradient>



                      <linearGradient

                        id="forecastGradient"

                        x1="0"

                        y1="0"

                        x2="0"

                        y2="1"

                      >

                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />

                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />

                      </linearGradient>

                    </defs>



                    <CartesianGrid strokeDasharray="3 3" stroke="#263449" />

                    <XAxis

                      dataKey="displayDate"

                      stroke="#8b9bb4"

                      tick={{ fontSize: 11 }}

                    />

                    <YAxis stroke="#8b9bb4" tick={{ fontSize: 11 }} />



                    <Tooltip

                      contentStyle={{

                        background: "#111c2e",

                        border: "1px solid #334155",

                        borderRadius: 10,

                        color: "#fff",

                      }}

                    />



                    <Area

                      type="monotone"

                      dataKey="actual"

                      name="Actual consumption"

                      stroke="#38bdf8"

                      fill="url(#actualGradient)"

                      strokeWidth={2}

                      connectNulls={false}

                    />



                    <Area

                      type="monotone"

                      dataKey="forecast"

                      name="Predicted consumption"

                      stroke="#a78bfa"

                      fill="url(#forecastGradient)"

                      strokeWidth={2}

                      strokeDasharray="5 5"

                      connectNulls={false}

                    />



                    <Legend />

                  </AreaChart>

                </ResponsiveContainer>

              </div>

            ) : (

              <EmptyState message="No chart data available." />

            )}

          </div>



          <div className="bottom-grid">

            <div className="content-card">

              <h3>Selected Meter</h3>



              <div className="meter-details">

                <div>

                  <span>Region</span>

                  <strong>{region}</strong>

                </div>



                <div>

                  <span>Meter ID</span>

                  <strong>{meter}</strong>

                </div>



                <div>

                  <span>Dashboard Role</span>

                  <strong>{role === "owner" ? "Owner" : "Tenant"}</strong>

                </div>



                <div>

                  <span>Available History</span>

                  <strong>{history.length} readings</strong>

                </div>

              </div>

            </div>



            <div className="content-card">

              <h3>Forecast Summary</h3>



              <div className="insight-highlight">

                <TrendingUp size={24} />

                <div>

                  <strong>{number(summary.predicted_usage_7_days)} kWh</strong>

                  <p>Predicted consumption over the next 7 days</p>

                </div>

              </div>

            </div>

          </div>

        </>

      ) : (

        <EmptyState

          message={

            error ||

            "Select a region and an assigned meter to view dashboard data."

          }

        />

      )}

    </>

  );



  // Consumption analytics.

  const renderConsumption = () => (

    <>

      <div className="page-heading">

        <div>

          <h1>Consumption Analytics</h1>

          <p>Explore actual electricity readings for the selected meter.</p>

        </div>



        <select

          value={historyFilter}

          onChange={(e) => setHistoryFilter(e.target.value)}

        >

          <option value="all">All available readings</option>

          <option value="15">Last 15 readings</option>

          <option value="7">Last 7 readings</option>

        </select>

      </div>



      {loadingDashboard ? (

        <Loading />

      ) : dashboard ? (

        <>

          <div className="stats-grid">

            <StatCard

              title="Total Consumption"

              value={number(

                filteredHistory.reduce(

                  (sum, item) => sum + item.consumption_kwh,

                  0

                )

              )}

              unit="kWh"

              icon={Zap}

              description="Consumption in selected period"

            />



            <StatCard

              title="Average Consumption"

              value={number(

                filteredHistory.length

                  ? filteredHistory.reduce(

                      (sum, item) => sum + item.consumption_kwh,

                      0

                    ) / filteredHistory.length

                  : 0

              )}

              unit="kWh"

              icon={Activity}

              description="Average per available reading"

            />



            <StatCard

              title="Readings"

              value={filteredHistory.length}

              unit=""

              icon={CalendarDays}

              description="Available historical records"

            />

          </div>



          <div className="content-card">

            <h3>Daily Consumption</h3>

            <p className="muted-text">Historical meter readings in kWh</p>



            <div className="chart-container">

              <ResponsiveContainer width="100%" height={320}>

                <BarChart data={filteredHistory}>

                  <CartesianGrid strokeDasharray="3 3" stroke="#263449" />

                  <XAxis

                    dataKey="date"

                    tickFormatter={formatShortDate}

                    stroke="#8b9bb4"

                    tick={{ fontSize: 11 }}

                  />

                  <YAxis stroke="#8b9bb4" />

                  <Tooltip

                    labelFormatter={formatDate}

                    contentStyle={{

                      background: "#111c2e",

                      border: "1px solid #334155",

                      borderRadius: 10,

                      color: "#fff",

                    }}

                  />

                  <Bar

                    dataKey="consumption_kwh"

                    name="Consumption (kWh)"

                    fill="#38bdf8"

                    radius={[5, 5, 0, 0]}

                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>



          <div className="content-card">

            <h3>Consumption History</h3>



            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>

                    <th>Date</th>

                    <th>Meter</th>

                    <th>Consumption</th>

                  </tr>

                </thead>



                <tbody>

                  {filteredHistory.map((item, index) => (

                    <tr key={`${item.date}-${index}`}>

                      <td>{formatDate(item.date)}</td>

                      <td>{meter}</td>

                      <td>{number(item.consumption_kwh)} kWh</td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        </>

      ) : (

        <EmptyState message={error || "No consumption data available."} />

      )}

    </>

  );



  // Forecast analytics.

  const renderForecast = () => (

    <>

      <div className="page-heading">

        <div>

          <h1>Forecast Analytics</h1>

          <p>Machine learning-based electricity consumption predictions.</p>

        </div>

      </div>



      {loadingDashboard ? (

        <Loading message="Generating forecast analytics..." />

      ) : dashboard ? (

        <>

          <div className="stats-grid">

            <StatCard

              title="Next 7 Days"

              value={number(summary.predicted_usage_7_days)}

              unit="kWh"

              icon={TrendingUp}

              description="Total predicted consumption"

            />



            <StatCard

              title="Daily Forecast Average"

              value={number(averageForecast)}

              unit="kWh"

              icon={Activity}

              description="Average predicted daily usage"

            />



            <StatCard

              title="Estimated Monthly Bill"

              value={`₹${number(summary.estimated_monthly_bill)}`}

              unit=""

              icon={IndianRupee}

              description="Based on configured tariff"

            />

          </div>



          <div className="content-card">

            <h3>7-Day Consumption Forecast</h3>

            <p className="muted-text">

              Predictions generated using the trained Random Forest model.

            </p>



            {forecast.length ? (

              <div className="chart-container">

                <ResponsiveContainer width="100%" height={320}>

                  <AreaChart data={forecast}>

                    <CartesianGrid strokeDasharray="3 3" stroke="#263449" />

                    <XAxis

                      dataKey="date"

                      tickFormatter={formatShortDate}

                      stroke="#8b9bb4"

                    />

                    <YAxis stroke="#8b9bb4" />

                    <Tooltip

                      labelFormatter={formatDate}

                      contentStyle={{

                        background: "#111c2e",

                        border: "1px solid #334155",

                        borderRadius: 10,

                        color: "#fff",

                      }}

                    />

                    <Area

                      type="monotone"

                      dataKey="predicted_kwh"

                      name="Predicted consumption"

                      stroke="#a78bfa"

                      fill="#a78bfa"

                      fillOpacity={0.18}

                      strokeWidth={3}

                    />

                  </AreaChart>

                </ResponsiveContainer>

              </div>

            ) : (

              <EmptyState message="No forecast data available." />

            )}

          </div>



          <div className="content-card">

            <h3>Forecast Details</h3>



            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>

                    <th>Forecast Date</th>

                    <th>Predicted Consumption</th>

                  </tr>

                </thead>



                <tbody>

                  {forecast.map((item, index) => (

                    <tr key={`${item.date}-${index}`}>

                      <td>{formatDate(item.date)}</td>

                      <td>{number(item.predicted_kwh)} kWh</td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        </>

      ) : (

        <EmptyState message={error || "Forecast data unavailable."} />

      )}

    </>

  );



  // Energy insights.

  const renderInsights = () => (

    <>

      <div className="page-heading">

        <div>

          <h1>Energy Insights</h1>

          <p>Understand consumption patterns and monitor your energy target.</p>

        </div>

      </div>



      {loadingDashboard ? (

        <Loading />

      ) : dashboard ? (

        <>

          <div className="stats-grid">

            <StatCard

              title="Historical Daily Average"

              value={number(averageHistory)}

              unit="kWh"

              icon={Activity}

              description="Average from available historical data"

            />



            <StatCard

              title="Forecast Daily Average"

              value={number(averageForecast)}

              unit="kWh"

              icon={TrendingUp}

              description="Average from the next 7 predictions"

            />



            <StatCard

              title="Monthly Usage Target"

              value={number(targetValue)}

              unit="kWh"

              icon={Target}

              description="Your locally saved target"

            />

          </div>



          <div className="content-card target-card">

            <div>

              <h3>Monthly Energy Target</h3>

              <p className="muted-text">

                Set a consumption target to compare against the forecast.

              </p>

            </div>



            <div className="target-input">

              <label htmlFor="energy-target">Target in kWh</label>

              <input

                id="energy-target"

                type="number"

                min="1"

                value={target}

                onChange={(e) => saveTarget(e.target.value)}

              />

            </div>



            {targetValue > 0 && (

              <div className="target-result">

                {targetStatus === "above" ? (

                  <>

                    <AlertCircle size={22} />

                    <div>

                      <strong>Forecast is above your target</strong>

                      <p>

                        Projected monthly usage is approximately{" "}

                        {number(projectedMonthlyUsage)} kWh.

                      </p>

                    </div>

                  </>

                ) : (

                  <>

                    <CheckCircle size={22} />

                    <div>

                      <strong>Forecast is within your target</strong>

                      <p>

                        Projected monthly usage is approximately{" "}

                        {number(projectedMonthlyUsage)} kWh.

                      </p>

                    </div>

                  </>

                )}

              </div>

            )}

          </div>



          <div className="content-card">

            <h3>Consumption Comparison</h3>



            <div className="comparison-grid">

              <div className="comparison-item">

                <span>Historical average</span>

                <strong>{number(averageHistory)} kWh/day</strong>

              </div>



              <div className="comparison-item">

                <span>Forecast average</span>

                <strong>{number(averageForecast)} kWh/day</strong>

              </div>



              <div className="comparison-item">

                <span>Difference</span>

                <strong>

                  {number(averageForecast - averageHistory)} kWh/day

                </strong>

              </div>

            </div>

          </div>



          <div className="content-card">

            <h3>Energy Saving Recommendations</h3>



            <div className="recommendation-list">

              <div className="recommendation">

                <Zap size={21} />

                <div>

                  <strong>Monitor daily consumption</strong>

                  <p>

                    Review meter readings regularly to identify unexpected

                    changes.

                  </p>

                </div>

              </div>



              <div className="recommendation">

                <Activity size={21} />

                <div>

                  <strong>Compare predicted and actual usage</strong>

                  <p>

                    Check whether actual consumption follows the predicted

                    trend.

                  </p>

                </div>

              </div>



              <div className="recommendation">

                <Target size={21} />

                <div>

                  <strong>Track your monthly target</strong>

                  <p>

                    Use your consumption target to monitor projected

                    electricity usage.

                  </p>

                </div>

              </div>

            </div>

          </div>

        </>

      ) : (

        <EmptyState message={error || "No insights available."} />

      )}

    </>

  );



  // Owner tenant management.

  // Owner property management screen.
  const renderProperties = () => (
    <>
      <div className="page-heading">
        <div>
          <h1>My Properties</h1>
          <p>Add and manage the electricity meters for your homes and rental properties.</p>
        </div>
      </div>

      <div className="content-card">
        <h3><Zap size={20} /> Add a Property</h3>
        <form className="management-form" onSubmit={handleAddProperty}>
          <label>Property name</label>
          <input
            value={propertyName}
            onChange={(e) => setPropertyName(e.target.value)}
            placeholder="e.g. My Home, Rental House"
            minLength={2}
            maxLength={100}
            required
          />

          <label>Region</label>
          <select
            value={propertyRegion}
            onChange={(e) => {
              setPropertyRegion(e.target.value);
              setPropertyMeter("");
            }}
            required
          >
            <option value="">Choose a region</option>
            {regions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <label>Meter number</label>
          <select
            value={propertyMeter}
            onChange={(e) => setPropertyMeter(e.target.value)}
            required
            disabled={!propertyRegion || propertyMeters.length === 0}
          >
            <option value="">Choose an available meter</option>
            {propertyMeters.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <label>Address / location label (optional)</label>
          <input
            value={propertyAddress}
            onChange={(e) => setPropertyAddress(e.target.value)}
            placeholder="e.g. Kukatpally, Hyderabad"
          />

          <button type="submit" disabled={managementLoading || !propertyMeter}>
            {managementLoading ? "Adding property..." : "Add Property"}
          </button>
        </form>

        {managementMessage && <p className="success-message">{managementMessage}</p>}
        {managementError && <p className="error-message">{managementError}</p>}
      </div>

      <div className="content-card">
        <h3>Your Properties ({properties.length})</h3>
        {properties.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Property</th><th>Region</th><th>Meter</th><th>Address</th><th>Action</th></tr>
              </thead>
              <tbody>
                {properties.map((item) => (
                  <tr key={item.id}>
                    <td>{item.property_name}</td>
                    <td>{item.region}</td>
                    <td>{item.meter_id}</td>
                    <td>{item.address || "—"}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPropertyId(String(item.id));
                          setRegion(item.region);
                          setMeter(item.meter_id);
                          setPage("dashboard");
                        }}
                      >View Dashboard</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No properties added yet. Add your first property above." />
        )}
      </div>
    </>
  );

  // Load property meter options for the add-property form.
  useEffect(() => {
    if (!propertyRegion || !user || user.role !== "owner") {
      setPropertyMeters([]);
      return;
    }

    let active = true;
    api.get(`/api/meters/${encodeURIComponent(propertyRegion)}`)
      .then((response) => {
        if (active) setPropertyMeters(response.data?.meters || []);
      })
      .catch(() => {
        if (active) setPropertyMeters([]);
      });

    return () => { active = false; };
  }, [propertyRegion, user]);

  // Owner tenant management screen.
    const renderTenantManagement = () => (

    <>

      <div className="page-heading">

        <div>

          <h1>Tenant Management</h1>

          <p>Create tenant accounts and assign available electricity meters.</p>

        </div>

      </div>



      <div className="content-card">

        <h3>

          <UserPlus size={20} /> Create Tenant Account

        </h3>



        <form className="management-form" onSubmit={handleCreateTenant}>

          <label>Tenant name</label>

          <input

            value={tenantName}

            onChange={(e) => setTenantName(e.target.value)}

            placeholder="Enter tenant name"

            minLength={2}

            required

          />



          <label>Tenant email</label>

          <input

            type="email"

            value={tenantEmail}

            onChange={(e) => setTenantEmail(e.target.value)}

            placeholder="Enter tenant email"

            required

          />



          <label>Temporary password</label>

          <input

            type="password"

            value={tenantPassword}

            onChange={(e) => setTenantPassword(e.target.value)}

            placeholder="Minimum 8 characters"

            minLength={8}

            required

          />



          <button type="submit" disabled={managementLoading}>

            {managementLoading ? "Creating..." : "Create Tenant"}

          </button>

        </form>

      </div>



      <div className="content-card">

        <h3>

          <Users size={20} /> Existing Tenants

        </h3>



        {tenants.length ? (

          <div className="table-wrapper">

            <table>

              <thead>

                <tr>

                  <th>ID</th>

                  <th>Name</th>

                  <th>Email</th>

                </tr>

              </thead>

              <tbody>

                {tenants.map((tenant) => (

                  <tr key={tenant.id}>

                    <td>{tenant.id}</td>

                    <td>{tenant.name}</td>

                    <td>{tenant.email}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        ) : (

          <EmptyState message="No tenant accounts found." />

        )}

      </div>



      <div className="content-card">
        <h3>Assign Property to Tenant</h3>
        <form className="management-form" onSubmit={handleAssignProperty}>
          <label>Select tenant</label>
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            required
          >
            <option value="">Choose a tenant</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name} — {tenant.email}
              </option>
            ))}
          </select>

          <label>Select property</label>
          <select
            value={assignmentPropertyId}
            onChange={(e) => setAssignmentPropertyId(e.target.value)}
            required
          >
            <option value="">Choose a property</option>
            {properties.filter((item) => item.id && !String(item.id).startsWith("legacy-")).map((item) => (
              <option key={item.id} value={item.id}>
                {item.property_name} — {item.region} / {item.meter_id}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={managementLoading || !selectedTenant || !assignmentPropertyId}
          >
            {managementLoading ? "Assigning..." : "Assign Property"}
          </button>
        </form>

        {managementMessage && <p className="success-message">{managementMessage}</p>}
        {managementError && <p className="error-message">{managementError}</p>}
      </div>

    </>

  );



  // Authentication screens.

  if (authChecking) {

    return <Loading message="Verifying your EnergyIQ session..." />;

  }



if (!user) {

  return (

    <LoginScreen

      email={loginEmail}

      setEmail={setLoginEmail}

      password={loginPassword}

      setPassword={setLoginPassword}

      onLogin={handleLogin}

      onRegister={handleRegister}

      loading={loginLoading}

      error={loginError}

    />

  );

}

  const visibleNavigation = isOwner
    ? [
        ...navigation,
        { id: "properties", label: "My Properties", icon: Zap },
        { id: "tenants", label: "Tenant Management", icon: Users },
      ]
    : navigation;



  return (

    <div className="app-layout">

      {mobileMenu && (

        <div

          className="mobile-overlay"

          onClick={() => setMobileMenu(false)}

        />

      )}



      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>

        <div className="brand">

          <div className="brand-icon">

            <Zap size={25} />

          </div>



          <div>

            <h2>EnergyIQ</h2>

            <span>SMART ENERGY SYSTEM</span>

          </div>



          <button

            className="mobile-close"

            onClick={() => setMobileMenu(false)}

          >

            <X size={20} />

          </button>

        </div>



        <div className="sidebar-label">WORKSPACE</div>



        <nav className="sidebar-nav">

          {visibleNavigation.map((item) => {

            const Icon = item.icon;



            return (

              <button

                key={item.id}

                className={`nav-item ${page === item.id ? "active" : ""}`}

                onClick={() => {

                  setPage(item.id);

                  setMobileMenu(false);

                  setError("");

                  setManagementError("");

                  setManagementMessage("");

                }}

              >

                <Icon size={19} />

                <span>{item.label}</span>

              </button>

            );

          })}

        </nav>



        <div className="sidebar-bottom">

          <div className="connection-status">

            <span

              className={`status-dot ${

                backendOnline ? "online" : "offline"

              }`}

            />

            <span>

              {backendOnline ? "Backend connected" : "Backend offline"}

            </span>

          </div>



          <div className="sidebar-footer">

            <Zap size={15} />

            <span>EnergyIQ v1.0</span>

          </div>

        </div>

      </aside>



      <main className="main-area">

        <header className="topbar">

          <button

            className="menu-button"

            onClick={() => setMobileMenu(true)}

          >

            <Menu size={22} />

          </button>



          <div className="breadcrumb">

            <span>EnergyIQ</span>

            <span>/</span>

            <strong>

              {page === "tenants"

                ? "Tenant Management"

                : currentPage?.label || "Dashboard"}

            </strong>

          </div>



          <div className="topbar-right">

            <div className="profile-avatar">

              {(user.name || "U").charAt(0).toUpperCase()}

            </div>



            <div className="profile-details">

              <strong>{user.name}</strong>

              <span>{role}</span>

            </div>



            <button className="logout-button" onClick={handleLogout}>

              <LogOut size={17} />

              <span>Logout</span>

            </button>

          </div>

        </header>



        <div className="page-content">

          {error && page !== "dashboard" && (

            <div className="error-banner">

              <AlertCircle size={18} />

              <span>{error}</span>

            </div>

          )}



          {loadingRegions ? (

            <Loading message="Connecting to EnergyIQ backend..." />

          ) : page === "properties" && isOwner ? (
            renderProperties()
          ) : page === "tenants" && isOwner ? (
            renderTenantManagement()
          ) : regions.length === 0 ? (

            <EmptyState

              message={error || "No regions available from the backend."}

            />

          ) : loadingMeters && !meter ? (

            <Loading message="Loading available meters..." />

          ) : (

            <>

              {page === "dashboard" && renderDashboard()}

              {page === "consumption" && renderConsumption()}

              {page === "forecast" && renderForecast()}

              {page === "insights" && renderInsights()}

            </>

          )}



          <footer className="page-footer">

            <span>EnergyIQ — Smart Energy Consumption Monitoring</span>

            <span>Data-driven energy insights</span>

          </footer>

        </div>

      </main>

    </div>

  );

}
