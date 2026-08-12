import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  Search,
  UserRoundPlus,
  UsersRound
} from "lucide-react";
import { api, clearSession, demoLogins, getUser, setSession, type Role, type User } from "./lib/api";
import "./styles.css";

type View = "dashboard" | "customers" | "products" | "challans";

type Customer = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessName: string;
  type: string;
  status: string;
  followUpDate?: string;
  notes?: string;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: string | number;
  currentStock: number;
  minStock: number;
  location: string;
};

type Challan = {
  id: string;
  challanNumber: string;
  status: string;
  totalQuantity: number;
  createdAt: string;
  customer: Customer;
  items: Array<{ productNameSnapshot: string; skuSnapshot: string; quantity: number }>;
};

function App() {
  const [user, setUser] = useState<User | null>(getUser());
  const [view, setView] = useState<View>("dashboard");

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const nav: Array<[View, string, typeof LayoutDashboard, Role[]]> = [
    ["dashboard", "Dashboard", LayoutDashboard, ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"]],
    ["customers", "Customers", UsersRound, ["ADMIN", "SALES", "ACCOUNTS"]],
    ["products", "Inventory", Boxes, ["ADMIN", "WAREHOUSE", "SALES", "ACCOUNTS"]],
    ["challans", "Challans", ClipboardList, ["ADMIN", "SALES", "ACCOUNTS"]]
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">ERP</div>
          <div>
            <strong>Ops Portal</strong>
            <span>Wholesale control desk</span>
          </div>
        </div>
        <nav>
          {nav
            .filter((item) => item[3].includes(user.role))
            .map(([id, label, Icon]) => (
              <button className={view === id ? "active" : ""} key={id} onClick={() => setView(id as View)}>
                <Icon size={18} />
                {label}
              </button>
            ))}
        </nav>
        <div className="userCard">
          <span>{user.role}</span>
          <strong>{user.name}</strong>
          <button
            onClick={() => {
              clearSession();
              setUser(null);
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
      <main className="content">
        {view === "dashboard" && <Dashboard />}
        {view === "customers" && <Customers role={user.role} />}
        {view === "products" && <Products role={user.role} />}
        {view === "challans" && <Challans role={user.role} />}
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("admin@mini-erp.test");
  const [password, setPassword] = useState("Password@123");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await api<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setSession(result.token, result.user);
      onLogin(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="loginPage">
      <section className="loginHero">
        <p>Mini ERP + CRM</p>
        <h1>Operations portal for sales, stock, challans, and customer follow-ups.</h1>
      </section>
      <form className="loginPanel" onSubmit={submit}>
        <h2>Sign in</h2>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary">Login</button>
        <div className="quickLogins">
          {demoLogins.map(([label, login]) => (
            <button type="button" key={login} onClick={() => setEmail(login)}>
              {label}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    void api<any>("/dashboard").then(setData);
  }, []);
  if (!data) return <Loading title="Dashboard" />;

  return (
    <section>
      <Header title="Operations Dashboard" subtitle="Live backend data for CRM, inventory, and challans." />
      <div className="metricGrid">
        {Object.entries(data.metrics).map(([label, value]) => (
          <div className="metric" key={label}>
            <span>{label.replace(/([A-Z])/g, " $1")}</span>
            <strong>{String(value)}</strong>
          </div>
        ))}
      </div>
      <div className="twoCol">
        <Panel title="Low Stock">
          {data.lowStockProducts.map((product: Product) => (
            <Row key={product.id} title={product.name} meta={`${product.currentStock} left | min ${product.minStock}`} status={product.location} />
          ))}
        </Panel>
        <Panel title="Recent Challans">
          {data.recentChallans.map((challan: Challan) => (
            <Row key={challan.id} title={challan.challanNumber} meta={challan.customer.businessName} status={challan.status} />
          ))}
        </Panel>
      </div>
    </section>
  );
}

function Customers({ role }: { role: Role }) {
  const canEdit = role === "ADMIN" || role === "SALES";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    businessName: "",
    gstNumber: "",
    type: "WHOLESALE",
    address: "",
    status: "LEAD",
    notes: ""
  });

  function load() {
    void api<{ items: Customer[] }>(`/customers?search=${encodeURIComponent(search)}`).then((res) => setCustomers(res.items));
  }
  useEffect(load, [search]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    await api("/customers", { method: "POST", body: JSON.stringify(form) });
    setForm({ ...form, name: "", mobile: "", email: "", businessName: "", gstNumber: "", address: "", notes: "" });
    load();
  }

  return (
    <section>
      <Header title="Customer CRM" subtitle="Leads, active customers, detail records, and follow-up notes." />
      <SearchBox value={search} onChange={setSearch} />
      {canEdit && (
        <form className="formGrid" onSubmit={create}>
          <input placeholder="Customer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Business name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="RETAIL">Retail</option><option value="WHOLESALE">Wholesale</option><option value="DISTRIBUTOR">Distributor</option></select>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="LEAD">Lead</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
          <input className="wide" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <button className="primary"><UserRoundPlus size={16} /> Add Customer</button>
        </form>
      )}
      <div className="table">
        {customers.map((customer) => (
          <Row key={customer.id} title={customer.businessName} meta={`${customer.name} | ${customer.mobile}`} status={customer.status} />
        ))}
      </div>
    </section>
  );
}

function Products({ role }: { role: Role }) {
  const canEdit = role === "ADMIN" || role === "WAREHOUSE";
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: "", sku: "", category: "", unitPrice: 0, currentStock: 0, minStock: 0, location: "" });
  function load() {
    void api<{ items: Product[] }>("/products?pageSize=50").then((res) => setProducts(res.items));
  }
  useEffect(load, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    await api("/products", { method: "POST", body: JSON.stringify(form) });
    setForm({ name: "", sku: "", category: "", unitPrice: 0, currentStock: 0, minStock: 0, location: "" });
    load();
  }

  return (
    <section>
      <Header title="Product Inventory" subtitle="Warehouse stock levels, alert quantities, and movement history." />
      {canEdit && (
        <form className="formGrid" onSubmit={create}>
          {(["name", "sku", "category", "location"] as const).map((key) => (
            <input key={key} placeholder={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          ))}
          {(["unitPrice", "currentStock", "minStock"] as const).map((key) => (
            <input key={key} type="number" placeholder={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} />
          ))}
          <button className="primary"><PackagePlus size={16} /> Add Product</button>
        </form>
      )}
      <div className="table">
        {products.map((product) => (
          <Row key={product.id} title={`${product.name} (${product.sku})`} meta={`${product.category} | ${product.location}`} status={`${product.currentStock} in stock`} />
        ))}
      </div>
    </section>
  );
}

function Challans({ role }: { role: Role }) {
  const canCreate = role === "ADMIN" || role === "SALES";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState("DRAFT");
  const [error, setError] = useState("");

  function load() {
    void api<{ items: Customer[] }>("/customers?pageSize=50").then((res) => setCustomers(res.items));
    void api<{ items: Product[] }>("/products?pageSize=50").then((res) => setProducts(res.items));
    void api<{ items: Challan[] }>("/challans?pageSize=50").then((res) => setChallans(res.items));
  }
  useEffect(load, []);

  const selectedProduct = useMemo(() => products.find((product) => product.id === productId), [products, productId]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/challans", {
        method: "POST",
        body: JSON.stringify({ customerId, status, items: [{ productId, quantity }] })
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create challan");
    }
  }

  async function confirm(id: string) {
    setError("");
    try {
      await api(`/challans/${id}/confirm`, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm challan");
    }
  }

  return (
    <section>
      <Header title="Sales Challans" subtitle="Draft, confirm, reject insufficient stock, and preserve item snapshots." />
      {canCreate && (
        <form className="formGrid" onSubmit={create}>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">Select customer</option>
            {customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.businessName}</option>)}
          </select>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
            <option value="">Select product</option>
            {products.map((product) => <option value={product.id} key={product.id}>{product.name} - {product.currentStock} available</option>)}
          </select>
          <input type="number" min="1" max={selectedProduct?.currentStock || undefined} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="DRAFT">Draft</option><option value="CONFIRMED">Confirmed</option></select>
          <button className="primary">Create Challan</button>
        </form>
      )}
      {error && <div className="error">{error}</div>}
      <div className="table">
        {challans.map((challan) => (
          <div className="row" key={challan.id}>
            <div><strong>{challan.challanNumber}</strong><span>{challan.customer.businessName} | Qty {challan.totalQuantity}</span></div>
            <span className={`pill ${challan.status.toLowerCase()}`}>{challan.status}</span>
            {canCreate && challan.status === "DRAFT" && <button onClick={() => confirm(challan.id)}>Confirm</button>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="pageHeader"><h1>{title}</h1><p>{subtitle}</p></header>;
}

function Loading({ title }: { title: string }) {
  return <Header title={title} subtitle="Loading current records..." />;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="panel"><h2>{title}</h2>{children}</div>;
}

function Row({ title, meta, status }: { title: string; meta: string; status: string }) {
  return <div className="row"><div><strong>{title}</strong><span>{meta}</span></div><span className="pill">{status}</span></div>;
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="search"><Search size={18} /><input placeholder="Search records" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

createRoot(document.getElementById("root")!).render(<App />);
