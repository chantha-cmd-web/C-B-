import React, { useState, useMemo, useEffect } from "react";
import {
  Heart,
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
import { Donation } from "../types";
import { uploadPdf } from "../firebase";
import { getEmployee } from "../utils/masterList";

interface DonationsViewProps {
  donations: Donation[];
  onAddRecord: (record: Omit<Donation, "id" | "timestamp">) => Promise<void>;
  onUpdateRecord: (id: string, record: Partial<Donation>) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onViewPdf: (filename: string, fileData: string) => void;
}

const PAGE_SIZE = 10;

export default function DonationsView({
  donations,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onViewPdf,
}: DonationsViewProps) {
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);

  // Form states
  const [staffId, setStaffId] = useState("");
  const [name, setName] = useState("");
  const [campus, setCampus] = useState("");
  const [status, setStatus] = useState("Full-time");
  const [type, setType] = useState("Wedding");
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState("");
  const [fileData, setFileData] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [uploadWarning, setUploadWarning] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const id = staffId.trim();
    if (!id || id.length < 3) return;
    let cancelled = false;
    getEmployee(id).then((emp) => {
      if (cancelled) return;
      if (!emp) {
        setUploadWarning(`No employee found with ID "${id}"`);
        return;
      }
      setUploadWarning("");
      setName(emp.name);
      setCampus(emp.campus);
      setStatus(emp.status === "Active" ? "Full-time" : "Part-time");
    });
    return () => { cancelled = true; };
  }, [staffId]);

  // Filters state
  const [search, setSearch] = useState("");
  const [filterCampus, setFilterCampus] = useState("");
  const [filterType, setFilterType] = useState("");

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCampus, setAppliedCampus] = useState("");
  const [appliedType, setAppliedType] = useState("");

  const campuses = [
    "BCH",
    "BKK",
    "BTB1",
    "BTB2",
    "BTB3",
    "CAR",
    "CEN",
    "CKD1",
    "CKD2",
    "DNG",
    "SHV",
    "SSK",
    "SOW",
    "STD",
    "TSK",
    "VSB",
  ];

  const donationTypes = [
    "Wedding",
    "Funeral",
    "Maternity",
    "Hospitalization",
    "Other",
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
      const { url, name } = await uploadPdf("donations", file);
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

    if (!campus) {
      alert("Please design a campus location.");
      return;
    }

    if (amount <= 0) {
      alert("Please specify a contribution amount greater than $0.");
      return;
    }

    const payload = {
      staffId: staffId.trim(),
      name: name.trim(),
      campus,
      status,
      type,
      amount: Number(amount),
      date,
      filename: filename || "No statement attached",
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

  const handleEditInit = (record: Donation) => {
    setEditingId(record.id);
    setStaffId(record.staffId);
    setName(record.name);
    setCampus(record.campus);
    setStatus(record.status);
    setType(record.type);
    setAmount(record.amount);
    setDate(record.date);
    setFileData(record.fileData);
    setFilename(record.filename);
    setUploadWarning("");

    // Scroll to form
    const editContainer = document.getElementById("don-form-anchor");
    if (editContainer) {
      editContainer.scrollIntoView({ behavior: "smooth" });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setStaffId("");
    setName("");
    setCampus("");
    setStatus("Full-time");
    setType("Wedding");
    setAmount(0);
    setDate("");
    setFileData(null);
    setFilename("");
    setUploadWarning("");
    setIsUploading(false);
  };

  // Perform filtration of lists
  const filteredRecords = useMemo(() => {
    return donations.filter((d) => {
      const matchSearch =
        !appliedSearch ||
        d.staffId.toLowerCase().includes(appliedSearch.toLowerCase()) ||
        d.name.toLowerCase().includes(appliedSearch.toLowerCase());

      const matchCampus = !appliedCampus || d.campus === appliedCampus;
      const matchType = !appliedType || d.type === appliedType;

      return matchSearch && matchCampus && matchType;
    });
  }, [donations, appliedSearch, appliedCampus, appliedType]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginatedRecords = useMemo(
    () => filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredRecords, page]
  );

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedSearch(search);
    setAppliedCampus(filterCampus);
    setAppliedType(filterType);
  };

  const handleClearFilters = () => {
    setPage(1);
    setSearch("");
    setFilterCampus("");
    setFilterType("");

    setAppliedSearch("");
    setAppliedCampus("");
    setAppliedType("");
  };

  return (
    <div className="fade-in space-y-6">
      <div id="don-form-anchor" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
            <span className="w-2.5 h-6 rounded bg-[#00537A] dark:bg-cyan-400 block" />
            Social Donation & Sponsoring
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Real-time synchronization of wedding, maternal, funeral and medical staff donations
          </p>
        </div>
        <button
          onClick={resetForm}
          className="btn btn-primary flex items-center gap-2 bg-gradient-to-r from-[#00537A] to-cyan-600 text-white font-semibold rounded-2xl text-sm px-5 py-2.5 hover:shadow-lg transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add donation record
        </button>
      </div>

      {/* Form Panel */}
      <div className="panel bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/10 dark:border-white/10 rounded-[28px] p-6 shadow-sm transition-all">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white border-b border-slate-100 dark:border-white/5 pb-4 mb-5 flex items-center gap-2">
          {editingId ? <Edit3 className="w-4 h-4 text-[#00537A]" /> : <Heart className="w-4 h-4 text-emerald-500 animate-pulse" />}
          {editingId ? "Edit Donation Record" : "Input New Share Contribution"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Staff ID */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Staff ID</label>
              <input
                type="text"
                required
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="e.g., 1105"
                className="form-control"
              />
            </div>

            {/* Staff Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Staff Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., KEO CHANTY"
                className="form-control"
              />
            </div>

            {/* Campus dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Campus</label>
              <div className="relative">
                <select
                  required
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  className="form-control appearance-none"
                >
                  <option value="" disabled>Select campus designation</option>
                  {campuses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Status dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Staff Employment Status</label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="form-control appearance-none"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Semi-full-time">Semi-full-time</option>
                  <option value="Temporary">Temporary</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Donation Type dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Donation Category</label>
              <div className="relative">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="form-control appearance-none"
                >
                  {donationTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Value of Donation (USD)</label>
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

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Event Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-control"
              />
            </div>
          </div>

          {/* Doc Upload */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Attach Proof Receipt / Announcement (PDF format)
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
                {filename ? filename : "Click here to upload announcement PDF Proof"}
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
              className="btn btn-primary bg-gradient-to-r from-[#00537A] to-cyan-600 text-white font-semibold rounded-2xl text-sm px-6 py-3 cursor-pointer hover:shadow-lg"
            >
              Confirm & Save Contribution
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
            <Filter className="w-4 h-4 text-[#00537A] dark:text-cyan-400" /> Filter Contributions
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyFilters}
              className="btn bg-[#00537A] hover:bg-[#003d5c] text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer shadow-sm"
            >
              Apply Filter
            </button>
            <button
              onClick={handleClearFilters}
              className="btn border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer hover:bg-slate-150"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Staff, ID..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/70 dark:bg-white/5 border border-[#00537A]/10 dark:border-white/10 text-xs text-slate-800 dark:text-white focus:outline-none"
            />
          </div>

          {/* Campus Filter */}
          <div className="relative">
            <select
              value={filterCampus}
              onChange={(e) => setFilterCampus(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white/70 dark:bg-white/5 border border-[#00537A]/10 dark:border-white/10 text-xs text-slate-800 dark:text-white focus:outline-none appearance-none"
            >
              <option value="">All Campuses</option>
              {campuses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white/70 dark:bg-white/5 border border-[#00537A]/10 dark:border-white/10 text-xs text-slate-800 dark:text-white focus:outline-none appearance-none"
            >
              <option value="">All Categories</option>
              {donationTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Listings table */}
      <div className="panel bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/10 dark:border-white/10 rounded-[28px] p-6 shadow-sm">
        <div className="table-responsive">
          <table className="w-full text-left border-separate border-spacing-y-1.5">
            <thead>
              <tr className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-4 py-3">Staff ID</th>
                <th className="px-4 py-3">FullName</th>
                <th className="px-4 py-3">Campus</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Amount Given ($)</th>
                <th className="px-4 py-3">Date Committed</th>
                <th className="px-4 py-3">Statement Slip</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((d) => (
                  <tr
                    key={d.id}
                    className="bg-white/60 dark:bg-[#122238]/60 hover:bg-white/80 dark:hover:bg-[#122238]/80 hover:-translate-y-0.5 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-white/5 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <td className="px-4 py-4 font-bold">{d.staffId}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">{d.name}</td>
                    <td className="px-4 py-4">
                      <span className="badge badge-cyan font-semibold">{d.campus}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="badge badge-gray font-semibold">{d.type}</span>
                    </td>
                    <td className="px-4 py-4 font-extrabold text-emerald-600 dark:text-emerald-400">
                      ${d.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 font-medium">{d.date}</td>
                    <td className="px-4 py-4">
                      {d.fileData ? (
                        <button
                          title="Open attached PDF proof"
                          onClick={() => onViewPdf(d.filename, d.fileData!)}
                          className="p-1 hover:bg-rose-500/10 text-rose-500 rounded transition-all cursor-pointer border-none bg-transparent"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditInit(d)}
                          className="p-1.5 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-all cursor-pointer"
                          title="Edit contribution details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {d.fileData && (
                          <button
                            onClick={() => onViewPdf(d.filename, d.fileData!)}
                            className="p-1.5 hover:bg-slate-500/10 text-slate-500 dark:text-slate-400 rounded-lg transition-all cursor-pointer"
                            title="Preview file"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteRecord(d.id)}
                          className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-all cursor-pointer"
                          title="Delete record file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    <Heart className="w-8 h-8 mx-auto stroke-slate-300 dark:stroke-slate-600 mb-2" />
                    No staff donations currently found.
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
