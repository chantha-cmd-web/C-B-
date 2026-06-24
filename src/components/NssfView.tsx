import React, { useState, useMemo } from "react";
import {
  Receipt,
  Plus,
  Trash2,
  FileText,
  Eye,
  Edit3,
  Search,
  Filter,
  UploadCloud,
  ChevronDown,
} from "lucide-react";
import { Nssf } from "../types";
import { uploadPdf } from "../firebase";

interface NssfViewProps {
  nssf: Nssf[];
  onAddRecord: (record: Omit<Nssf, "id" | "timestamp">) => Promise<void>;
  onUpdateRecord: (id: string, record: Partial<Nssf>) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onViewPdf: (filename: string, fileData: string) => void;
}

const PAGE_SIZE = 10;

export default function NssfView({
  nssf,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onViewPdf,
}: NssfViewProps) {
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);

  // Form states
  const [month, setMonth] = useState("January");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [staff, setStaff] = useState<number>(1);
  const [amount, setAmount] = useState<number>(0);
  const [fileData, setFileData] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [uploadWarning, setUploadWarning] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Filters state
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedMonth, setAppliedMonth] = useState("");

  const monthsList = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadWarning("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setUploadWarning("Only PDF documents are allowed.");
      return;
    }

    if (file.size > 1073741824) {
      setUploadWarning("File exceeds the 1GB size limit.");
      return;
    }

    setIsUploading(true);
    try {
      const { url, name } = await uploadPdf("nssf", file);
      setFileData(url);
      setFilename(name);
      setUploadWarning("");
    } catch (err) {
      setUploadWarning("Upload failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      alert("Please specify a contribution amount greater than $0.");
      return;
    }

    const payload = {
      month,
      year: Number(year),
      staff: Number(staff),
      amount: Number(amount),
      filename: filename || "No file statement",
      fileData,
    };

    try {
      if (editingId) {
        await onUpdateRecord(editingId, payload);
      } else {
        await onAddRecord(payload);
      }
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditInit = (record: Nssf) => {
    setEditingId(record.id);
    setMonth(record.month);
    setYear(record.year);
    setStaff(record.staff);
    setAmount(record.amount);
    setFileData(record.fileData);
    setFilename(record.filename);
    setUploadWarning("");

    // Scroll to form
    const editContainer = document.getElementById("nssf-form-anchor");
    if (editContainer) {
      editContainer.scrollIntoView({ behavior: "smooth" });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setMonth("January");
    setYear(new Date().getFullYear());
    setStaff(1);
    setAmount(0);
    setFileData(null);
    setFilename("");
    setUploadWarning("");
    setIsUploading(false);
  };

  // Filtering list
  const filteredRecords = useMemo(() => {
    return nssf.filter((n) => {
      const matchSearch = !appliedSearch || n.year.toString().includes(appliedSearch);
      const matchMonth = !appliedMonth || n.month === appliedMonth;
      return matchSearch && matchMonth;
    });
  }, [nssf, appliedSearch, appliedMonth]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginatedRecords = useMemo(
    () => filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredRecords, page]
  );

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedSearch(search);
    setAppliedMonth(filterMonth);
  };

  const handleClearFilters = () => {
    setPage(1);
    setSearch("");
    setFilterMonth("");
    setAppliedSearch("");
    setAppliedMonth("");
  };

  return (
    <div className="fade-in space-y-6">
      <div id="nssf-form-anchor" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
            <span className="w-2.5 h-6 rounded bg-[#00537A] dark:bg-cyan-400 block" />
            NSSF Contribution Registry
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Real-time synchronization of monthly National Social Security Fund logs, staff counts, and payments
          </p>
        </div>
        <button
          onClick={resetForm}
          className="btn btn-primary flex items-center gap-2 bg-gradient-to-r from-[#00537A] to-cyan-600 text-white font-semibold rounded-2xl text-sm px-5 py-2.5 hover:shadow-lg transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add NSSF report
        </button>
      </div>

      {/* Form Panel */}
      <div className="panel bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/10 dark:border-white/10 rounded-[28px] p-6 shadow-sm transition-all">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white border-b border-slate-100 dark:border-white/5 pb-4 mb-5 flex items-center gap-2">
          {editingId ? <Edit3 className="w-4 h-4 text-[#00537A]" /> : <UploadCloud className="w-4 h-4 text-cyan-500" />}
          {editingId ? "Edit Monthly NSSF Clearance Statement" : "Upload Monthly NSSF Records Sheet"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Month Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Statement Month</label>
              <div className="relative">
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="form-control appearance-none"
                >
                  {monthsList.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Year Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Statement Year</label>
              <input
                type="number"
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="form-control"
              />
            </div>

            {/* Number of Staff */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Number of Active Staff</label>
              <input
                type="number"
                required
                min={1}
                value={staff}
                onChange={(e) => setStaff(Number(e.target.value))}
                placeholder="Staff contributes count"
                className="form-control"
              />
            </div>

            {/* Total Contribution */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total Contribution Value (USD)</label>
              <input
                type="number"
                step="0.01"
                required
                min={0.01}
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="$0.00"
                className="form-control"
              />
            </div>
          </div>

          {/* Doc Upload */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Upload Official NSSF Payment receipt (PDF)
            </label>
            <div className="relative border border-dashed border-[#00537A]/20 dark:border-white/10 rounded-2xl p-5 hover:bg-[#00537A]/5 dark:hover:bg-white/5 transition-all text-center">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="w-8 h-8 border-2 border-[#00537A]/30 border-t-[#00537A] rounded-full animate-spin" />
                  <p className="text-xs text-slate-500">Uploading...</p>
                </div>
              ) : (
                <UploadCloud className="w-8 h-8 text-[#00537A]/40 dark:text-cyan-400/40 mx-auto mb-2" />
              )}
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {filename ? filename : "Click here to upload receipt PDF"}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Max file size: 1GB
              </p>
            </div>
            {uploadWarning && (
              <p className="text-xs text-rose-500 dark:text-rose-400 font-medium">
                {uploadWarning}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isUploading}
              className="btn btn-primary bg-gradient-to-r from-[#00537A] to-cyan-600 text-white font-semibold rounded-2xl text-sm px-6 py-3 cursor-pointer hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "Uploading PDF..." : editingId ? "Update NSSF" : "Confirm & Save NSSF"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-secondary border border-slate-200 dark:border-white/10 px-6 py-3 rounded-2xl font-semibold text-slate-600 dark:text-white hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Query Filters */}
      <div className="panel bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/10 dark:border-white/10 rounded-[28px] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-white/5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#00537A]" /> Manage Records
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyFilters}
              className="btn bg-[#00537A] hover:bg-[#003d5c] text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer shadow-sm"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="btn border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer hover:bg-slate-150"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by Year (e.g., 2026)"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/70 dark:bg-white/5 border border-[#00537A]/10 dark:border-white/10 text-xs text-slate-800 dark:text-white focus:outline-none"
            />
          </div>

          <div className="relative">
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white/70 dark:bg-white/5 border border-[#00537A]/10 dark:border-white/10 text-xs text-slate-800 dark:text-white focus:outline-none appearance-none"
            >
              <option value="">All months</option>
              {monthsList.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Listings Table */}
      <div className="panel bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/10 dark:border-white/10 rounded-[28px] p-6 shadow-sm">
        <div className="table-responsive">
          <table className="w-full text-left border-separate border-spacing-y-1.5">
            <thead>
              <tr className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-4 py-3">Reporting Period</th>
                <th className="px-4 py-3">Contributes count (staff)</th>
                <th className="px-4 py-3">Amount total (USD)</th>
                <th className="px-4 py-3">Authorized Statement File</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((n) => (
                  <tr
                    key={n.id}
                    className="bg-white/60 dark:bg-[#122238]/60 hover:bg-white/80 dark:hover:bg-[#122238]/80 hover:-translate-y-0.5 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-white/5 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <td className="px-4 py-4 font-bold">{n.month} {n.year}</td>
                    <td className="px-4 py-4">{n.staff}</td>
                    <td className="px-4 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                      ${n.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 flex items-center gap-1 text-slate-500">
                      <FileText className="w-4 h-4 text-rose-500 stroke-[2px]" />
                      <span className="truncate max-w-[200px]">{n.filename}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditInit(n)}
                          className="p-1.5 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-all cursor-pointer"
                          title="Edit statements"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {n.fileData && (
                          <button
                            onClick={() => onViewPdf(n.filename, n.fileData!)}
                            className="p-1.5 hover:bg-slate-500/10 text-slate-500 dark:text-slate-400 rounded-lg transition-all cursor-pointer"
                            title="Open Pdf viewer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteRecord(n.id)}
                          className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-all cursor-pointer"
                          title="Delete statement file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    <Receipt className="w-8 h-8 mx-auto stroke-slate-300 dark:stroke-slate-600 mb-2" />
                    No NSSF contributions uploaded in database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredRecords.length > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-white/5">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    p === page
                      ? "bg-[#00537A] text-white shadow-sm"
                      : "border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
