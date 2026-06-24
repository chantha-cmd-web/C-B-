import { useMemo } from "react";
import {
  Users,
  CheckCircle,
  Clock,
  Calendar,
  Receipt,
  Heart,
  DollarSign,
  Activity as ActivityIcon,
  TrendingUp,
  FileText,
  Building2,
  MapPin,
  Briefcase,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { Resignation, Nssf, Donation, Activity } from "../types";
import { EmployeeRecord } from "../utils/masterList";

interface DashboardViewProps {
  resignations: Resignation[];
  nssf: Nssf[];
  donations: Donation[];
  masterEmployees: Map<string, EmployeeRecord>;
  onOpenReportModal: () => void;
  isNight: boolean;
}

const DEPT_COLORS = ["#00537A", "#F5A201", "#10B981", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316", "#6366F1"];

export default function DashboardView({
  resignations,
  nssf,
  donations,
  masterEmployees,
  onOpenReportModal,
  isNight,
}: DashboardViewProps) {
  // ========== Employee Master List Stats ==========
  const employees = useMemo(() => Array.from(masterEmployees.values()), [masterEmployees]);
  const totalEmployees = employees.length;
  const deptBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach((e) => {
      const dept = e.department || "Unknown";
      map.set(dept, (map.get(dept) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [employees]);
  const campusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach((e) => {
      const campus = e.campus || "Unknown";
      map.set(campus, (map.get(campus) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [employees]);

  // ========== Resignation Stats ==========
  const resTotal = resignations.length;
  const resCleared = useMemo(
    () => resignations.filter((r) => r.clearance === "Yes").length,
    [resignations]
  );
  const resPending = useMemo(
    () => resignations.filter((r) => r.clearance === "No").length,
    [resignations]
  );
  const resThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return resignations.filter((r) => {
      if (!r.end) return false;
      const d = new Date(r.end);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [resignations]);

  // ========== NSSF & Donation Stats ==========
  const nssfCount = nssf.length;
  const donEventsCount = donations.length;
  const donTotalAmount = useMemo(
    () => donations.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [donations]
  );

  // ========== NSSF Monthly Trend ==========
  const nssfChartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    const amounts = new Array(12).fill(0);
    nssf.forEach((n) => {
      if (n.year === currentYear) {
        const idx = months.indexOf(n.month);
        if (idx >= 0) amounts[idx] += n.amount;
      }
    });
    return months.map((m, i) => ({ name: m, "NSSF Contributions": amounts[i] }));
  }, [nssf]);

  // ========== Donation Monthly Trend ==========
  const donChartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    const amounts = new Array(12).fill(0);
    donations.forEach((d) => {
      if (d.date) {
        const dt = new Date(d.date);
        if (dt.getFullYear() === currentYear) {
          amounts[dt.getMonth()] += Number(d.amount || 0);
        }
      }
    });
    return months.map((m, i) => ({ name: m, "Donations": amounts[i] }));
  }, [donations]);

  // ========== Recent Activities ==========
  const recentActivities = useMemo(() => {
    const list: Activity[] = [];
    resignations.forEach((r) => {
      list.push({
        id: `res-${r.id}`,
        text: `Resignation Logged: ${r.name} (${r.position}, ${r.campus})`,
        time: r.timestamp || Date.now(),
        icon: "UserMinus",
        color: "text-rose-500 bg-rose-500/10",
      });
    });
    nssf.forEach((n) => {
      list.push({
        id: `nssf-${n.id}`,
        text: `NSSF upload: ${n.month} ${n.year} contribution record`,
        time: n.timestamp || Date.now(),
        icon: "Receipt",
        color: "text-cyan-500 bg-cyan-500/10",
      });
    });
    donations.forEach((d) => {
      list.push({
        id: `don-${d.id}`,
        text: `Donation registered: $${d.amount} for ${d.name} (${d.type})`,
        time: d.timestamp || Date.now(),
        icon: "Heart",
        color: "text-amber-500 bg-amber-500/10",
      });
    });
    return list.sort((a, b) => b.time - a.time).slice(0, 5);
  }, [resignations, nssf, donations]);

  // ========== Resignation Chart ==========
  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    const counts = new Array(12).fill(0);
    resignations.forEach((r) => {
      if (!r.end) return;
      const d = new Date(r.end);
      if (d.getFullYear() === currentYear) {
        counts[d.getMonth()]++;
      }
    });
    return months.map((m, idx) => ({ name: m, "Resignations": counts[idx] }));
  }, [resignations]);

  const chartBarColor = isNight ? "#A8E8F9" : "#00537A";
  const labelColor = isNight ? "rgba(255, 255, 255, 0.5)" : "rgba(30, 41, 59, 0.6)";
  const gridColor = isNight ? "rgba(255, 255, 255, 0.05)" : "rgba(30, 41, 59, 0.05)";

  return (
    <div className="fade-in space-y-8">
      {/* View Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
            <span className="w-2.5 h-6 rounded bg-[#00537A] dark:bg-cyan-400 block" />
            Dashboard Overview
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Real-time analytics and tracking systems
          </p>
        </div>
        <button
          onClick={onOpenReportModal}
          className="btn btn-secondary flex items-center gap-2 border border-slate-200 dark:border-white/10 px-5 py-2.5 rounded-2xl bg-white/70 dark:bg-white/5 font-semibold text-slate-700 dark:text-white hover:bg-[#00537A]/5 dark:hover:bg-white/10 transition-all cursor-pointer shadow-sm text-sm"
        >
          <FileText className="w-4 h-4 text-rose-500" />
          Generate PDF Report
        </button>
      </div>

      {/* Employee Overview Section (from master list) */}
      {totalEmployees > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#00537A]/50 dark:text-[#A8E8F9]/50 flex items-center gap-2">
            <Users className="w-4 h-4" /> Employee Overview
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="group relative rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00537A] rounded-t-[28px]" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#00537A]/60 dark:text-cyan-400">Total Employees</span>
                <Users className="w-5 h-5 text-[#00537A] dark:text-cyan-400" />
              </div>
              <p className="text-3xl font-extrabold mt-4 text-slate-800 dark:text-white">{totalEmployees}</p>
            </div>

            <div className="group relative rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500 rounded-t-[28px]" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Departments</span>
                <Briefcase className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-3xl font-extrabold mt-4 text-slate-800 dark:text-white">{deptBreakdown.length}</p>
            </div>

            <div className="group relative rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-purple-500 rounded-t-[28px]" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Campuses</span>
                <MapPin className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-extrabold mt-4 text-slate-800 dark:text-white">{campusBreakdown.length}</p>
            </div>

            <div className="group relative rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500 rounded-t-[28px]" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-500">Active Staff</span>
                <CheckCircle className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-3xl font-extrabold mt-4 text-slate-800 dark:text-white">
                {employees.filter((e) => e.status !== "Inactive").length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resignations Metrics Group */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#00537A]/50 dark:text-[#A8E8F9]/50 flex items-center gap-2">
          <Users className="w-4 h-4" /> Resignation Summary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="group relative rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00537A] rounded-t-[28px]" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#00537A]/60 dark:text-cyan-400">Total Resigned</span>
              <Users className="w-5 h-5 text-[#00537A] dark:text-cyan-400" />
            </div>
            <p className="text-3xl font-extrabold mt-4 text-slate-800 dark:text-white">{resTotal}</p>
          </div>

          <div className="group relative rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-teal-500 rounded-t-[28px]" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">Cleared</span>
              <CheckCircle className="w-5 h-5 text-teal-500" />
            </div>
            <p className="text-3xl font-extrabold mt-4 text-slate-800 dark:text-white">{resCleared}</p>
          </div>

          <div className="group relative rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-rose-500 rounded-t-[28px]" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-500">Pending Clearance</span>
              <Clock className="w-5 h-5 text-rose-500" />
            </div>
            <p className="text-3xl font-extrabold mt-4 text-slate-800 dark:text-white">{resPending}</p>
          </div>

          <div className="group relative rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500 rounded-t-[28px]" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-500">Leaving This Month</span>
              <Calendar className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-extrabold mt-4 text-slate-800 dark:text-white">{resThisMonth}</p>
          </div>
        </div>
      </div>

      {/* Finance Metrics Group */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#00537A]/50 dark:text-[#A8E8F9]/50 flex items-center gap-2">
          <Receipt className="w-4 h-4" /> NSSF & Donations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="group relative rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-purple-500 rounded-t-[28px]" />
            <div className="flex items-center justify-between border-b border-dashed border-[#00537A]/5 pb-3">
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">NSSF Monthly Uploads</span>
              <Receipt className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-extrabold mt-4 text-slate-800 dark:text-white">{nssfCount}</p>
          </div>

          <div className="group relative rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-500 rounded-t-[28px]" />
            <div className="flex items-center justify-between border-b border-dashed border-[#00537A]/5 pb-3">
              <span className="text-xs font-semibold text-indigo-500">Donation Counts</span>
              <Heart className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-3xl font-extrabold mt-4 text-slate-800 dark:text-white">{donEventsCount}</p>
          </div>

          <div className="group relative rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#F5A201] rounded-t-[28px]" />
            <div className="flex items-center justify-between border-b border-dashed border-[#00537A]/5 pb-3">
              <span className="text-xs font-semibold text-amber-500">Total Contribution Volume</span>
              <DollarSign className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-extrabold mt-4 text-emerald-600 dark:text-emerald-400">
              ${donTotalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Grid: 2 columns on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Breakdown Pie Chart */}
        {deptBreakdown.length > 0 && (
          <div className="rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm">
            <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00537A] dark:text-cyan-400" />
              Department Distribution
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Employee count by department</p>
            <div className="flex-1 min-h-[260px] w-full">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={deptBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {deptBreakdown.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={DEPT_COLORS[idx % DEPT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isNight ? "#122238" : "#ffffff",
                      borderColor: isNight ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 83, 122, 0.1)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: isNight ? "#ffffff" : "#1a2a3a",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", color: isNight ? "#94a3b8" : "#64748b" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Resignation Trends Bar Chart */}
        <div className="rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-white mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00537A] dark:text-cyan-400" />
            Resignation Trend (This Year)
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
            Overview of departures per month in {new Date().getFullYear()}
          </p>
          <div className="flex-1 min-h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: labelColor, fontSize: 11, fontFamily: "Inter" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: labelColor, fontSize: 11, fontFamily: "Inter" }}
                />
                <Tooltip
                  cursor={{ fill: isNight ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 83, 122, 0.03)" }}
                  contentStyle={{
                    backgroundColor: isNight ? "#122238" : "#ffffff",
                    borderColor: isNight ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 83, 122, 0.1)",
                    borderRadius: "12px",
                    fontFamily: "Inter",
                    fontSize: "12px",
                    color: isNight ? "#ffffff" : "#1a2a3a",
                  }}
                />
                <Bar dataKey="Resignations" radius={[6, 6, 0, 0]} barSize={18}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.Resignations > 0 ? chartBarColor : `${chartBarColor}30`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NSSF Contribution Trend */}
        <div className="rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-white mb-2 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-purple-500" />
            NSSF Contribution Trend ({new Date().getFullYear()})
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Monthly NSSF contribution amounts</p>
          <div className="flex-1 min-h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nssfChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: labelColor, fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: labelColor, fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: isNight ? "rgba(255,255,255,0.03)" : "rgba(0,83,122,0.03)" }}
                  contentStyle={{
                    backgroundColor: isNight ? "#122238" : "#ffffff",
                    borderColor: isNight ? "rgba(255,255,255,0.1)" : "rgba(0,83,122,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: isNight ? "#ffffff" : "#1a2a3a",
                  }}
                />
                <Bar dataKey="NSSF Contributions" radius={[6, 6, 0, 0]} barSize={18} fill="#8B5CF6">
                  {nssfChartData.map((entry, i) => (
                    <Cell key={i} fill={entry["NSSF Contributions"] > 0 ? "#8B5CF6" : "#8B5CF630"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donation Monthly Trend */}
        <div className="rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-white mb-2 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            Donation Trend ({new Date().getFullYear()})
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Monthly staff donation amounts</p>
          <div className="flex-1 min-h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={donChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: labelColor, fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: labelColor, fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: isNight ? "rgba(255,255,255,0.03)" : "rgba(0,83,122,0.03)" }}
                  contentStyle={{
                    backgroundColor: isNight ? "#122238" : "#ffffff",
                    borderColor: isNight ? "rgba(255,255,255,0.1)" : "rgba(0,83,122,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: isNight ? "#ffffff" : "#1a2a3a",
                  }}
                />
                <Bar dataKey="Donations" radius={[6, 6, 0, 0]} barSize={18} fill="#EC4899">
                  {donChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.Donations > 0 ? "#EC4899" : "#EC489930"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="rounded-[28px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/5 dark:border-white/5 p-6 shadow-sm">
        <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-white mb-5 flex items-center gap-2">
          <ActivityIcon className="w-4 h-4 text-amber-500" />
          Recent Synchronization Actions
        </h3>
        <div className="space-y-4">
          {recentActivities.length > 0 ? (
            recentActivities.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[#00537A]/5 dark:hover:bg-white/5 transition-all text-sm border border-transparent hover:border-[#00537A]/5"
              >
                <div
                  className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
                    act.icon === "UserMinus"
                      ? "bg-rose-500/10 text-rose-500"
                      : act.icon === "Receipt"
                      ? "bg-cyan-500/10 text-cyan-500"
                      : "bg-emerald-500/10 text-emerald-500"
                  }`}
                >
                  <ActivityIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 dark:text-slate-200 font-medium truncate">
                    {act.text}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {new Date(act.time).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <ActivityIcon className="w-8 h-8 animate-pulse text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-semibold">Ready for synchronization</p>
              <p className="text-[10px] mt-1">Actions on any device sync here instantly</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
