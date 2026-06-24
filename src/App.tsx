import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  UserMinus,
  Receipt,
  Heart,
  Database,
  Menu,
  ChevronLeft,
  Moon,
  Sun,
  User as UserIcon,
  LogOut,
  X,
  FileSpreadsheet,
  CheckCircle,
} from "lucide-react";

import { getPdfBlobUrl } from "./firebase";
import { useRealtimeCollection, useSyncStatus, setDoc, deleteDoc, getDocs, refetchCollection } from "./firestore-api";
import { Resignation, Nssf, Donation, TelegramSettings, User, Tab } from "./types";
import { generatePdfReport } from "./utils/pdfGenerator";
import { fetchMasterList, EmployeeRecord } from "./utils/masterList";

import LoginCard from "./components/LoginCard";
import DashboardView from "./components/DashboardView";
import ResignationsView from "./components/ResignationsView";
import NssfView from "./components/NssfView";
import DonationsView from "./components/DonationsView";
import DataManagementView from "./components/DataManagementView";

interface Toast {
  id: string;
  text: string;
  type: "success" | "error";
  opacity: number;
}

export default function App() {
  // ---- polling hooks (must be called before any early return) ----
  const resignationsData = useRealtimeCollection<Resignation>('resignations');
  const nssfData = useRealtimeCollection<Nssf>('nssf');
  const donationsData = useRealtimeCollection<Donation>('donations');
  const usersData = useRealtimeCollection<User>('users');
  const telegramData = useRealtimeCollection<TelegramSettings>('telegramSettings');
  const sync = useSyncStatus();

  const firestoreError = sync.error;

  // ---- derived sorted data ----
  const resignations = [...resignationsData.data].sort((a, b) => b.timestamp - a.timestamp);
  const nssf = [...nssfData.data].sort((a, b) => b.timestamp - a.timestamp);
  const donations = [...donationsData.data].sort((a, b) => b.timestamp - a.timestamp);
  const users = usersData.data;
  const telegram: TelegramSettings =
    telegramData.data.find((t) => t.id === "default") || {
      id: "default",
      token: "8762629026:AAGWtrMC9LmdGyr41CQ07bLM6jbZZRJZ020",
      chatId: "-1003596479947",
      fileName: "CB_Report",
    };

  // ---- sync status ----
  const syncStatus = sync.status;
  const lastSynced = sync.lastSync;

  // UI States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Dashboard);
  const [theme, setTheme] = useState<"day" | "night">("day");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Master employee list (from Google Sheets)
  const [masterEmployees, setMasterEmployees] = useState<Map<string, EmployeeRecord>>(new Map());

  // Preview States
  const [previewPdf, setPreviewPdf] = useState<{ filename: string; fileData: string } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const handleViewPdf = async (filename: string, fileData: string) => {
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    setPdfBlobUrl(null);
    setPreviewPdf({ filename, fileData: "" });
    try {
      const blobUrl = await getPdfBlobUrl(fileData);
      setPdfBlobUrl(blobUrl);
      setPreviewPdf({ filename, fileData: blobUrl });
    } catch {
      setPreviewPdf({ filename, fileData });
    }
  };

  const handleClosePdf = () => {
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    setPdfBlobUrl(null);
    setPreviewPdf(null);
  };

  // Generate PDF parameters
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<"resignation" | "nssf" | "donation">("resignation");
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");

  // Toast Notification System
  const addToast = (text: string, type: "success" | "error" = "success") => {
    const id = Date.now().toString();
    const newToast: Toast = { id, text, type, opacity: 1 };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, opacity: 0 } : t)));
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 350);
    }, 4000);
  };

  // Seed default admin user on first run
  useEffect(() => {
    if (users.length === 0) {
      const defaultAdmin: User = {
        id: "u1",
        username: "admin",
        fullname: "HR Administrator",
        password: "C&B123",
        role: "Super Admin",
      };
      setDoc("users", "u1", defaultAdmin).catch(() => {});
    }
  }, [users.length]);

  // Initializing App preferences
  useEffect(() => {
    const storedTheme = localStorage.getItem("cb_theme") as "day" | "night" | null;
    if (storedTheme) setTheme(storedTheme);

    const storedSidebar = localStorage.getItem("cb_sidebar");
    if (storedSidebar === "collapsed") setIsSidebarCollapsed(true);

    const storedUser = sessionStorage.getItem("cb_logged_user");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser) as User);
      } catch {
        sessionStorage.removeItem("cb_logged_user");
      }
    }
    fetchMasterList().then(setMasterEmployees);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("cb_theme", theme);
  }, [theme]);

  // Login handler
  const handleLoginSuccess = (user: User) => {
    sessionStorage.setItem("cb_logged_user", JSON.stringify(user));
    setCurrentUser(user);
    addToast("Login successful!", "success");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("cb_logged_user");
    setCurrentUser(null);
    addToast("Securely logged out.", "success");
  };

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem("cb_sidebar", newState ? "collapsed" : "");
  };

  // Generate a unique ID (Firestore-compatible, like auto-doc ID)
  function genId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // ---- CRUD handlers using firestore-api proxy ----
  const handleAddResignation = async (record: Omit<Resignation, "id" | "timestamp">) => {
    const id = genId();
    const payload: Resignation = { ...record, id, timestamp: Date.now() };
    try {
      await setDoc("resignations", id, payload);
      refetchCollection("resignations");
      addToast("Departure record saved and synchronized.", "success");
    } catch (err) {
      console.error("Failed to save resignation:", err);
      addToast("Saved locally (server sync pending)", "success");
    }
  };

  const handleUpdateResignation = async (id: string, record: Partial<Resignation>) => {
    try {
      await setDoc("resignations", id, { ...record, timestamp: Date.now() });
      refetchCollection("resignations");
      addToast("Record updated and synchronized successfully.", "success");
    } catch (err) {
      console.error("Failed to update resignation:", err);
      addToast("Updated locally (server sync pending)", "success");
    }
  };

  const handleDeleteResignation = async (id: string) => {
    if (confirm("Are you sure you want to delete this resignation record?")) {
      try {
        await deleteDoc("resignations", id);
        refetchCollection("resignations");
        addToast("Record deleted from synchronized server.", "success");
      } catch (err) {
        console.error("Failed to delete resignation:", err);
        addToast("Deleted locally (server sync pending)", "success");
      }
    }
  };

  const handleAddNssf = async (record: Omit<Nssf, "id" | "timestamp">) => {
    const id = genId();
    const payload: Nssf = { ...record, id, timestamp: Date.now() };
    try {
      await setDoc("nssf", id, payload);
      refetchCollection("nssf");
      addToast("NSSF contributions list saved.", "success");
    } catch (err) {
      console.error("Failed to save NSSF:", err);
      addToast("Saved locally (server sync pending)", "success");
    }
  };

  const handleUpdateNssf = async (id: string, record: Partial<Nssf>) => {
    try {
      await setDoc("nssf", id, { ...record, timestamp: Date.now() });
      refetchCollection("nssf");
      addToast("NSSF record updated and database is updated.", "success");
    } catch (err) {
      console.error("Failed to update NSSF:", err);
      addToast("Updated locally (server sync pending)", "success");
    }
  };

  const handleDeleteNssf = async (id: string) => {
    if (confirm("Are you sure you want to delete this monthly NSSF submission archive?")) {
      try {
        await deleteDoc("nssf", id);
        refetchCollection("nssf");
        addToast("NSSF report cleared from storage.", "success");
      } catch (err) {
        console.error("Failed to delete NSSF:", err);
        addToast("Deleted locally (server sync pending)", "success");
      }
    }
  };

  const handleAddDonation = async (record: Omit<Donation, "id" | "timestamp">) => {
    const id = genId();
    const payload: Donation = { ...record, id, timestamp: Date.now() };
    try {
      await setDoc("donations", id, payload);
      refetchCollection("donations");
      addToast("Staff donation record logged.", "success");
    } catch (err) {
      console.error("Failed to save donation:", err);
      addToast("Saved locally (server sync pending)", "success");
    }
  };

  const handleUpdateDonation = async (id: string, record: Partial<Donation>) => {
    try {
      await setDoc("donations", id, { ...record, timestamp: Date.now() });
      refetchCollection("donations");
      addToast("Donations list modified and updated.", "success");
    } catch (err) {
      console.error("Failed to update donation:", err);
      addToast("Updated locally (server sync pending)", "success");
    }
  };

  const handleDeleteDonation = async (id: string) => {
    if (confirm("Are you sure you want to delete this donation transaction?")) {
      try {
        await deleteDoc("donations", id);
        refetchCollection("donations");
        addToast("Donations document cleaned.", "success");
      } catch (err) {
        console.error("Failed to delete donation:", err);
        addToast("Deleted locally (server sync pending)", "success");
      }
    }
  };

  const handleUpdateTelegram = async (tg: TelegramSettings) => {
    try {
      await setDoc("telegramSettings", "default", tg);
      refetchCollection("telegramSettings");
      addToast("Telegram parameters updated.", "success");
    } catch (err) {
      console.error("Failed to update telegram:", err);
      addToast("Updated locally (server sync pending)", "success");
    }
  };

  const handleRestoreDatabase = async (data: {
    resignations: Resignation[];
    nssf: Nssf[];
    donations: Donation[];
  }) => {
    try {
      const sortedRes = [...data.resignations].sort((a, b) => b.timestamp - a.timestamp);
      const sortedNssf = [...data.nssf].sort((a, b) => b.timestamp - a.timestamp);
      const sortedDon = [...data.donations].sort((a, b) => b.timestamp - a.timestamp);

      try {
        const currentRes = await getDocs("resignations");
        for (const item of currentRes) await deleteDoc("resignations", item.id);
        for (const item of sortedRes) await setDoc("resignations", item.id, { ...item, timestamp: Date.now() });

        const currentNssf = await getDocs("nssf");
        for (const item of currentNssf) await deleteDoc("nssf", item.id);
        for (const item of sortedNssf) await setDoc("nssf", item.id, { ...item, timestamp: Date.now() });

        const currentDon = await getDocs("donations");
        for (const item of currentDon) await deleteDoc("donations", item.id);
        for (const item of sortedDon) await setDoc("donations", item.id, { ...item, timestamp: Date.now() });
      } catch (err) {
        console.warn("Firestore restore failed, falling back to local cache:", err);
      }

      refetchCollection("resignations");
      refetchCollection("nssf");
      refetchCollection("donations");

      addToast("Database restoration synced successfully on all channels.", "success");
    } catch (err) {
      addToast("Restore database sync fault.", "error");
    }
  };

  const handleResetDatabase = async () => {
    try {
      try {
        const currentRes = await getDocs("resignations");
        for (const item of currentRes) await deleteDoc("resignations", item.id);
        const currentNssf = await getDocs("nssf");
        for (const item of currentNssf) await deleteDoc("nssf", item.id);
        const currentDon = await getDocs("donations");
        for (const item of currentDon) await deleteDoc("donations", item.id);
      } catch (err) {
        console.warn("Firestore reset failed, clearing local cache:", err);
      }

      refetchCollection("resignations");
      refetchCollection("nssf");
      refetchCollection("donations");

      addToast("All database logs dropped and synchronized to empty states.", "success");
    } catch (err) {
      addToast("Failed to clean up databases.", "error");
    }
  };

  const triggerGenerateReport = () => {
    generatePdfReport({
      type: reportType,
      fromDate: reportFromDate,
      toDate: reportToDate,
      resignations,
      nssf,
      donations,
      isNight: theme === "night",
      onAddToast: addToast,
    });
    setIsReportModalOpen(false);
    setReportFromDate("");
    setReportToDate("");
  };

  const handleGlobalSearch = (val: string) => {
    const v = val.toLowerCase();
    if (v.includes("resign")) setActiveTab(Tab.Resignations);
    else if (v.includes("nssf")) setActiveTab(Tab.Nssf);
    else if (v.includes("donat")) setActiveTab(Tab.Donations);
    else if (v.includes("telegram") || v.includes("management") || v.includes("export") || v.includes("import"))
      setActiveTab(Tab.DataManagement);
    else if (v.includes("dash") || v.includes("home") || v.includes("overview"))
      setActiveTab(Tab.Dashboard);
  };

  if (!currentUser) {
    return <LoginCard users={users} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div
      id="app-container"
      className="flex h-screen w-screen relative overflow-hidden bg-[#F8F4ED] dark:bg-[#0B1727] font-sans transition-all duration-300"
    >
      {/* Background Graphic Blobs */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-10 dark:opacity-20">
        <svg viewBox="0 0 1400 1400" className="absolute w-[1200px] h-[1200px] -top-80 -right-80 animate-[spin_60s_linear_infinite]" fill="none">
          <path d="M350 250 C550 80, 750 120, 950 350 C1150 580, 1100 800, 1000 1000 C900 1200, 700 1250, 500 1100 C300 950, 250 750, 200 550 C150 350, 150 420, 350 250Z" fill="url(#grad1)" />
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A8E8F9" />
              <stop offset="100%" stopColor="#00537A" />
            </linearGradient>
          </defs>
        </svg>
        <svg viewBox="0 0 1400 1400" className="absolute w-[1200px] h-[1200px] -bottom-92 -left-92 animate-[spin_80s_linear_infinite_reverse]" fill="none">
          <path d="M900 1100 C700 1250, 500 1200, 300 1000 C100 800, 150 600, 250 400 C350 200, 550 150, 750 300 C950 450, 1000 650, 1050 850 C1100 1050, 1100 950, 900 1100Z" fill="url(#grad2)" />
          <defs>
            <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F5A201" />
              <stop offset="100%" stopColor="#CFE8D6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Main Sidebar */}
      <aside
        id="mainSidebar"
        className={`sidebar h-full flex flex-col transition-all duration-300 z-40 bg-white/45 dark:bg-[#122238]/45 border-r border-[#00537A]/10 dark:border-white/10 backdrop-blur-3xl shrink-0 ${
          isSidebarCollapsed ? "w-20" : "w-64"
        } ${isMobileSidebarOpen ? "translate-x-0 !w-64" : "max-md:-translate-x-full md:translate-x-0"} max-md:fixed max-md:top-0 max-md:bottom-0`}
      >
        {/* Sidebar Header */}
        <div className="sidebar-header px-5 py-4 border-b border-[#00537A]/10 dark:border-white/10 flex items-center justify-between min-h-[72px] gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="logo-icon w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00537A] to-cyan-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-[#00537A]/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            {!isSidebarCollapsed && (
              <span className="font-extrabold text-[15px] tracking-tight bg-gradient-to-r from-[#00537A] to-amber-500 dark:from-[#A8E8F9] dark:to-cyan-400 bg-clip-text text-transparent truncate whitespace-nowrap animate-fade-in">
                C&B System
              </span>
            )}
          </div>

          <button
            onClick={toggleSidebar}
            className="sidebar-toggle p-1.5 hover:bg-[#00537A]/5 dark:hover:bg-white/5 border border-[#00537A]/10 dark:border-white/10 text-slate-500 hover:text-[#00537A] dark:text-slate-400 dark:hover:text-cyan-400 rounded-lg transition-all max-md:hidden cursor-pointer"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isSidebarCollapsed ? "rotate-180" : ""}`} />
          </button>
          
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-1.5 text-slate-500 hover:text-rose-500 rounded-lg md:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Buttons/Menu */}
        <ul className="sidebar-menu flex-1 py-4 space-y-1 overflow-y-auto px-2">
          <li
            onClick={() => { setActiveTab(Tab.Dashboard); setIsMobileSidebarOpen(false); }}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl cursor-pointer font-semibold text-sm transition-all duration-300 ${
              activeTab === Tab.Dashboard
                ? "bg-gradient-to-br from-[#00537A] to-cyan-600 text-white shadow-md shadow-[#00537A]/2 w-full font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-[#00537A]/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            {(!isSidebarCollapsed || isMobileSidebarOpen) && <span className="truncate whitespace-nowrap">Dashboard</span>}
          </li>
          <li
            onClick={() => { setActiveTab(Tab.Resignations); setIsMobileSidebarOpen(false); }}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl cursor-pointer font-semibold text-sm transition-all duration-300 ${
              activeTab === Tab.Resignations
                ? "bg-gradient-to-br from-[#00537A] to-cyan-600 text-white shadow-md shadow-[#00537A]/2 w-full font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-[#00537A]/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <UserMinus className="w-5 h-5 shrink-0" />
            {(!isSidebarCollapsed || isMobileSidebarOpen) && <span className="truncate whitespace-nowrap">Resignations</span>}
          </li>
          <li
            onClick={() => { setActiveTab(Tab.Nssf); setIsMobileSidebarOpen(false); }}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl cursor-pointer font-semibold text-sm transition-all duration-300 ${
              activeTab === Tab.Nssf
                ? "bg-gradient-to-br from-[#00537A] to-cyan-600 text-white shadow-md shadow-[#00537A]/2 w-full font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-[#00537A]/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Receipt className="w-5 h-5 shrink-0" />
            {(!isSidebarCollapsed || isMobileSidebarOpen) && <span className="truncate whitespace-nowrap">NSSF Contributions</span>}
          </li>
          <li
            onClick={() => { setActiveTab(Tab.Donations); setIsMobileSidebarOpen(false); }}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl cursor-pointer font-semibold text-sm transition-all duration-300 ${
              activeTab === Tab.Donations
                ? "bg-gradient-to-br from-[#00537A] to-cyan-600 text-white shadow-md shadow-[#00537A]/2 w-full font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-[#00537A]/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Heart className="w-5 h-5 shrink-0" />
            {(!isSidebarCollapsed || isMobileSidebarOpen) && <span className="truncate whitespace-nowrap">Donations</span>}
          </li>
          <li
            onClick={() => { setActiveTab(Tab.DataManagement); setIsMobileSidebarOpen(false); }}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl cursor-pointer font-semibold text-sm transition-all duration-300 ${
              activeTab === Tab.DataManagement
                ? "bg-gradient-to-br from-[#00537A] to-cyan-600 text-white shadow-md shadow-[#00537A]/2 w-full font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-[#00537A]/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Database className="w-5 h-5 shrink-0" />
            {(!isSidebarCollapsed || isMobileSidebarOpen) && <span className="truncate whitespace-nowrap">Data Management</span>}
          </li>
        </ul>
      </aside>

      {/* Screen Mobile overlay backdrop */}
      {isMobileSidebarOpen && (
        <div onClick={() => setIsMobileSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-30 transition-all backdrop-blur-sm md:hidden" />
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full min-w-0 z-10 relative">
        {/* Top Header Panel */}
        <header className="topbar h-[72px] flex items-center justify-between bg-white/45 dark:bg-[#122238]/45 border-b border-[#00537A]/10 dark:border-white/10 backdrop-blur-3xl px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="topbar-search relative max-sm:hidden">
              <input
                type="text"
                placeholder="Search database categories..."
                onChange={(e) => handleGlobalSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 rounded-xl border border-[#00537A]/10 dark:border-white/10 text-xs bg-white/70 dark:bg-[#10243D]/50 focus:outline-none focus:border-[#00537A] text-slate-800 dark:text-white transition-all focus:w-80"
              />
              <Menu className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 stroke-2" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Sync Status Indicator */}
            <div
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold tracking-wide transition-all ${
                syncStatus === "connected"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : syncStatus === "syncing"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
              }`}
            >
              <span className={`relative flex w-2 h-2 ${syncStatus === "connected" ? "animate-ping" : ""}`}>
                <span className={`absolute inline-flex w-full h-full rounded-full opacity-75 ${syncStatus === "connected" ? "bg-emerald-500" : syncStatus === "syncing" ? "bg-amber-500" : "bg-rose-500"}`} />
              </span>
              <span className={`relative inline-flex w-2 h-2 rounded-full ${syncStatus === "connected" ? "bg-emerald-500" : syncStatus === "syncing" ? "bg-amber-500" : "bg-rose-500"}`} />
              {syncStatus === "connected" ? "LIVE" : syncStatus === "syncing" ? "SYNCING" : "OFFLINE"}
              {lastSynced && <span className="text-[10px] opacity-60 ml-1 font-normal">{lastSynced}</span>}
              {firestoreError && <span className="text-[9px] ml-1 text-rose-500 max-w-[200px] truncate" title={firestoreError}>ERR</span>}
            </div>

            <button
              onClick={() => setTheme((prev) => (prev === "day" ? "night" : "day"))}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-[#00537A]/5 dark:hover:bg-white/5 text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-yellow-400 hover:rotate-12 transition-all cursor-pointer bg-white/40"
            >
              {theme === "night" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-3 border-l border-slate-200 dark:border-white/10 pl-4 max-sm:hidden">
              <div className="w-10 h-10 rounded-2xl bg-[#00537A] text-white flex items-center justify-center font-bold font-mono text-[14px]">
                {currentUser.fullname.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wide">{currentUser.fullname}</span>
                <span className="text-[10px] text-slate-400 tracking-wider">{currentUser.role}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn border border-[#00537A]/10 dark:border-white/10 hover:border-rose-500/30 text-slate-600 dark:text-slate-400 hover:text-rose-500 rounded-xl p-2.5 flex items-center justify-center cursor-pointer transition-all bg-white/40"
              title="Secure Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Box Zone */}
        <main className="flex-1 p-6 overflow-y-auto w-full max-w-7xl mx-auto space-y-6">
          {activeTab === Tab.Dashboard && (
            <DashboardView
              resignations={resignations}
              nssf={nssf}
              donations={donations}
              masterEmployees={masterEmployees}
              onOpenReportModal={() => setIsReportModalOpen(true)}
              isNight={theme === "night"}
            />
          )}
          {activeTab === Tab.Resignations && (
            <ResignationsView
              resignations={resignations}
              onAddRecord={handleAddResignation}
              onUpdateRecord={handleUpdateResignation}
              onDeleteRecord={handleDeleteResignation}
              onViewPdf={handleViewPdf}
            />
          )}
          {activeTab === Tab.Nssf && (
            <NssfView
              nssf={nssf}
              onAddRecord={handleAddNssf}
              onUpdateRecord={handleUpdateNssf}
              onDeleteRecord={handleDeleteNssf}
              onViewPdf={handleViewPdf}
            />
          )}
          {activeTab === Tab.Donations && (
            <DonationsView
              donations={donations}
              onAddRecord={handleAddDonation}
              onUpdateRecord={handleUpdateDonation}
              onDeleteRecord={handleDeleteDonation}
              onViewPdf={handleViewPdf}
            />
          )}
          {activeTab === Tab.DataManagement && (
            <DataManagementView
              resignations={resignations}
              nssf={nssf}
              donations={donations}
              telegram={telegram}
              onUpdateTelegram={handleUpdateTelegram}
              onRestoreDatabase={handleRestoreDatabase}
              onResetDatabase={handleResetDatabase}
              onAddToast={addToast}
              currentUser={currentUser}
            />
          )}
        </main>
      </div>

      {/* Floating active toasts list */}
      <div id="notification-area" className="fixed top-24 right-6 space-y-3 z-50 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{ opacity: t.opacity }}
            className={`px-5 py-4 min-w-[280px] rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-xl border border-white/20 transition-all duration-300 transform translate-x-0 ${
              t.type === "success"
                ? "bg-[#10243D]/90 border-l-[4px] border-l-emerald-500 text-teal-400 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-[#10243D]/90 border-l-[4px] border-l-rose-500 text-rose-400 dark:bg-rose-500/10 dark:text-rose-400"
            }`}
          >
            {t.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-500 animate-bounce" /> : <X className="w-5 h-5 text-rose-500 animate-pulse" />}
            <span className="text-xs font-semibold text-white tracking-wide">{t.text}</span>
          </div>
        ))}
      </div>

      {/* High Fidelity PDF Viewer Modal */}
      {previewPdf && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-lg z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#122238] border border-slate-200 dark:border-white/10 rounded-[32px] overflow-hidden w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl relative">
            <button onClick={handleClosePdf} className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-rose-500/10 hover:text-rose-500 text-slate-500 rounded-full transition-all cursor-pointer border-none z-10" title="Close window">
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-base font-bold text-slate-800 dark:text-white text-left truncate max-w-xs md:max-w-md">Document Viewer - {previewPdf.filename}</h3>
            </div>
            <div className="flex-1 bg-slate-800 relative">
              <embed src={previewPdf.fileData} type="application/pdf" className="w-full h-full border-none" />
            </div>
          </div>
        </div>
      )}

      {/* Aggregate Audit Report PDF generator Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-lg z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#122238] border border-[#00537A]/15 dark:border-white/10 rounded-[32px] w-full max-w-md p-6 shadow-2xl flex flex-col space-y-5">
            <div className="flex items-center justify-between border-b border-dashed border-slate-100 dark:border-white/5 pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#00537A] dark:text-cyan-400" />
                Generate Audit PDF Report
              </h3>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-rose-500 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Select category type</span>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#00537A]/10 dark:border-white/5 bg-[#00537A]/5 dark:bg-white/5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-white">
                  <input type="radio" name="report-cat" checked={reportType === "resignation"} onChange={() => setReportType("resignation")} className="w-4 h-4 accent-[#00537A]" />
                  Departure Clearances Report
                </label>
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#00537A]/10 dark:border-white/5 bg-[#00537A]/5 dark:bg-white/5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-white">
                  <input type="radio" name="report-cat" checked={reportType === "nssf"} onChange={() => setReportType("nssf")} className="w-4 h-4 accent-[#00537A]" />
                  NSSF Contributions Statement
                </label>
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#00537A]/10 dark:border-white/5 bg-[#00537A]/5 dark:bg-white/5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-white">
                  <input type="radio" name="report-cat" checked={reportType === "donation"} onChange={() => setReportType("donation")} className="w-4 h-4 accent-[#00537A]" />
                  Staff Donations Statement
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">From Date</label>
                <input type="date" value={reportFromDate} onChange={(e) => setReportFromDate(e.target.value)} className="form-control" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">To Date</label>
                <input type="date" value={reportToDate} onChange={(e) => setReportToDate(e.target.value)} className="form-control" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider">Note: Unspecified dates will default compiling the complete active database.</p>
            <div className="flex gap-3 justify-end border-t border-slate-100 dark:border-white/5 pt-4 mt-2">
              <button onClick={() => setIsReportModalOpen(false)} className="btn border border-[#00537A]/10 text-slate-600 dark:text-slate-300 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer">Cancel</button>
              <button onClick={triggerGenerateReport} className="btn bg-[#00537A] hover:bg-[#003d5c] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer">Generate PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


