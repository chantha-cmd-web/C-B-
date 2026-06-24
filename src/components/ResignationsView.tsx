import React, { useState, useMemo, useEffect } from "react";
import {
  UserMinus,
  Plus,
  Trash2,
  FileText,
  Eye,
  Edit3,
  Search,
  Filter,
  X,
  UploadCloud,
  CheckCircle,
  HelpCircle,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Resignation } from "../types";
import { uploadPdf } from "../firebase";
import { getEmployee } from "../utils/masterList";

interface ResignationsViewProps {
  resignations: Resignation[];
  onAddRecord: (record: Omit<Resignation, "id" | "timestamp">) => Promise<void>;
  onUpdateRecord: (id: string, record: Partial<Resignation>) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onViewPdf: (filename: string, fileData: string) => void;
}

const PAGE_SIZE = 10;

export default function ResignationsView({
  resignations,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onViewPdf,
}: ResignationsViewProps) {
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);

  // Form states
  const [staffId, setStaffId] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [nationality, setNationality] = useState("Cambodian");
  const [campus, setCampus] = useState("");
  const [department, setDepartment] = useState("Academic");
  const [status, setStatus] = useState("Full-time");
  const [reason, setReason] = useState("Resign");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [clearance, setClearance] = useState("No");
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
      setPosition(emp.position);
      setNationality(emp.nationality || "Cambodian");
      setCampus(emp.campus);
      setDepartment(emp.department || "Academic");
      setStatus(emp.status === "Active" ? "Full-time" : "Part-time");
      if (emp.lastWorkingDay) setEnd(emp.lastWorkingDay);
    });
    return () => { cancelled = true; };
  }, [staffId]);

  // Filters state
  const [search, setSearch] = useState("");
  const [filterCampus, setFilterCampus] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterReason, setFilterReason] = useState("");
  const [filterClearance, setFilterClearance] = useState("");

  // Trigger values for filtering
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCampus, setAppliedCampus] = useState("");
  const [appliedDept, setAppliedDept] = useState("");
  const [appliedReason, setAppliedReason] = useState("");
  const [appliedClearance, setAppliedClearance] = useState("");

  // Campuses list
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
      const { url, name } = await uploadPdf("resignations", file);
      setFileData(url);
      setFilename(name);
      setUploadWarning("");
    } catch (err) {
      setUploadWarning("Upload failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campus) {
      alert("Please designate a campus.");
      return;
    }

    const payload = {
      staffId: staffId.trim(),
      name: name.trim(),
      nationality: nationality.trim(),
      campus,
      department,
      position: position.trim(),
      status,
      reason,
      start,
      end,
      clearance,
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

  const handleEditInit = (record: Resignation) => {
    setEditingId(record.id);
    setStaffId(record.staffId);
    setName(record.name);
    setPosition(record.position);
    setNationality(record.nationality || "Cambodian");
    setCampus(record.campus);
    setDepartment(record.department);
    setStatus(record.status);
    setReason(record.reason);
    setStart(record.start);
    setEnd(record.end);
    setClearance(record.clearance);
    setFileData(record.fileData);
    setFilename(record.filename);
    setUploadWarning("");

    // Smooth scroll to form
    const editContainer = document.getElementById("res-form-anchor");
    if (editContainer) {
      editContainer.scrollIntoView({ behavior: "smooth" });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setStaffId("");
    setName("");
    setPosition("");
    setNationality("Cambodian");
    setCampus("");
    setDepartment("Academic");
    setStatus("Full-time");
    setReason("Resign");
    setStart("");
    setEnd("");
    setClearance("No");
    setFileData(null);
    setFilename("");
    setUploadWarning("");
    setIsUploading(false);
  };

  // Perform filtering
  const filteredRecords = useMemo(() => {
    return resignations.filter((r) => {
      const matchSearch =
        !appliedSearch ||
        r.staffId.toLowerCase().includes(appliedSearch.toLowerCase()) ||
        r.name.toLowerCase().includes(appliedSearch.toLowerCase()) ||
        r.position.toLowerCase().includes(appliedSearch.toLowerCase());

      const matchCampus = !appliedCampus || r.campus === appliedCampus;
      const matchDept = !appliedDept || r.department === appliedDept;
      const matchReason = !appliedReason || r.reason === appliedReason;
      const matchClearance = !appliedClearance || r.clearance === appliedClearance;

      return matchSearch && matchCampus && matchDept && matchReason && matchClearance;
    });
  }, [resignations, appliedSearch, appliedCampus, appliedDept, appliedReason, appliedClearance]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginatedRecords = useMemo(
    () => filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredRecords, page]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedSearch(search);
    setAppliedCampus(filterCampus);
    setAppliedDept(filterDept);
    setAppliedReason(filterReason);
    setAppliedClearance(filterClearance);
  };

  const handleClearFilters = () => {
    setPage(1);
    setSearch("");
    setFilterCampus("");
    setFilterDept("");
    setFilterReason("");
    setFilterClearance("");

    setAppliedSearch("");
    setAppliedCampus("");
    setAppliedDept("");
    setAppliedReason("");
    setAppliedClearance("");
  };

  return (
    <div className="fade-in space-y-6">
      {/* Anchor for editing */}
      <div id="res-form-anchor" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
            <span className="w-2.5 h-6 rounded bg-[#00537A] dark:bg-cyan-400 block" />
            Resignation Log & Clearances
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Real-time tracking of staff departures, terminal clearance, and official records
          </p>
        </div>
        <button
          onClick={resetForm}
          className="btn btn-primary flex items-center gap-2 bg-gradient-to-r from-[#00537A] to-cyan-600 text-white font-semibold rounded-2xl text-sm px-5 py-2.5 hover:shadow-lg transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add departure record
        </button>
      </div>

      {/* Document Form Panel */}
      <div className="panel bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/10 dark:border-white/10 rounded-[28px] p-6 shadow-sm transition-all">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white border-b border-slate-100 dark:border-white/5 pb-4 mb-5 flex items-center gap-2">
          {editingId ? <Edit3 className="w-4 h-4 text-[#00537A]" /> : <Plus className="w-4 h-4 text-emerald-500" />}
          {editingId ? "Edit Resignation Departure Record" : "Input New Resignation Record"}
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
                placeholder="e.g., 2102"
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
                placeholder="e.g., CHANN NITA"
                className="form-control"
              />
            </div>

            {/* Position */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Position</label>
              <input
                type="text"
                required
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g., ESL Teacher"
                className="form-control"
              />
            </div>

            {/* Nationality */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Nationality</label>
              <input
                type="text"
                required
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="Cambodian"
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
                  <option value="" disabled>Select campus location</option>
                  {campuses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Department dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Department</label>
              <div className="relative">
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="form-control appearance-none"
                >
                  <option value="Academic">Academic</option>
                  <option value="Academics">Academics</option>
                  <option value="Operations">Operations</option>
                  <option value="Finance">Finance</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Employment Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Employment Status</label>
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

            {/* Reason Left */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Reason for departure</label>
              <div className="relative">
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="form-control appearance-none"
                >
                  <option value="Resign">Resign</option>
                  <option value="Terminate">Terminate</option>
                  <option value="Abandonment">Abandonment</option>
                  <option value="End of Contract">End of Contract</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Start Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Start Date</label>
              <input
                type="date"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="form-control"
              />
            </div>

            {/* Last Working Day */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Last Working Day</label>
              <input
                type="date"
                required
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="form-control"
              />
            </div>

            {/* Clearance Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">HR Clearance</label>
              <div className="relative">
                <select
                  value={clearance}
                  onChange={(e) => setClearance(e.target.value)}
                  className="form-control appearance-none"
                >
                  <option value="Yes">Cleared / Done</option>
                  <option value="No">Pending</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* PDF files attachment */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Attach Clearance Statement (PDF)
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
                {filename ? filename : "Click here to upload clear statements in PDF format"}
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

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="btn btn-primary bg-gradient-to-r from-[#00537A] to-cyan-600 text-white font-semibold rounded-2xl text-sm px-6 py-3 cursor-pointer hover:shadow-lg"
            >
              Confirm & Save Departure
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

      {/* Filter and Queries Segment */}
      <div className="panel bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/10 dark:border-white/10 rounded-[28px] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-white/5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#00537A] dark:text-cyan-400" /> Filter Logs
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Text Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Staff, ID, Post..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/70 dark:bg-white/5 border border-[#00537A]/10 dark:border-white/10 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#00537A]"
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
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Dept Filter */}
          <div className="relative">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white/70 dark:bg-white/5 border border-[#00537A]/10 dark:border-white/10 text-xs text-slate-800 dark:text-white focus:outline-none appearance-none"
            >
              <option value="">All Departments</option>
              <option value="Academic">Academic</option>
              <option value="Academics">Academics</option>
              <option value="Operations">Operations</option>
              <option value="Finance">Finance</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reason filter */}
          <div className="relative">
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white/70 dark:bg-white/5 border border-[#00537A]/10 dark:border-white/10 text-xs text-slate-800 dark:text-white focus:outline-none appearance-none"
            >
              <option value="">All Reasons</option>
              <option value="Resign">Resign</option>
              <option value="Terminate">Terminate</option>
              <option value="Abandonment">Abandonment</option>
              <option value="End of Contract">End of Contract</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Clearance filter */}
          <div className="relative">
            <select
              value={filterClearance}
              onChange={(e) => setFilterClearance(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white/70 dark:bg-white/5 border border-[#00537A]/10 dark:border-white/10 text-xs text-slate-800 dark:text-white focus:outline-none appearance-none"
            >
              <option value="">All Clearance</option>
              <option value="Yes">Cleared</option>
              <option value="No">Pending</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Records Table Card */}
      <div className="panel bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/10 dark:border-white/10 rounded-[28px] p-6 shadow-sm">
        <div className="table-responsive">
          <table className="w-full text-left border-separate border-spacing-y-1.5">
            <thead>
              <tr className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-4 py-3">Staff ID</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Campus</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Nationality</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Last Day</th>
                <th className="px-4 py-3">Clearance</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((r) => (
                  <tr
                    key={r.id}
                    className="bg-white/60 dark:bg-[#122238]/60 hover:bg-white/80 dark:hover:bg-[#122238]/80 hover:-translate-y-0.5 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-white/5 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <td className="px-4 py-3.5 font-bold">{r.staffId}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">{r.name}</td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{r.position}</td>
                    <td className="px-4 py-3.5">
                      <span className="badge badge-cyan font-semibold">{r.campus}</span>
                    </td>
                    <td className="px-4 py-3.5">{r.department}</td>
                    <td className="px-4 py-3.5 text-slate-500">{r.nationality || "-"}</td>
                    <td className="px-4 py-3.5 text-slate-500">{r.status}</td>
                    <td className="px-4 py-3.5 text-slate-500">{r.reason}</td>
                    <td className="px-4 py-3.5 font-medium">{r.end}</td>
                    <td className="px-4 py-3.5">
                      {r.clearance === "Yes" ? (
                        <span className="badge badge-success font-bold text-[10px] inline-flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Cleared
                        </span>
                      ) : (
                        <span className="badge badge-warning font-bold text-[10px] inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {r.fileData ? (
                        <button
                          title="Open attached PDF"
                          onClick={() => onViewPdf(r.filename, r.fileData!)}
                          className="p-1 hover:bg-rose-500/10 text-rose-500 rounded transition-all cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditInit(r)}
                          className="p-1.5 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-all cursor-pointer"
                          title="Edit record"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {r.fileData && (
                          <button
                            onClick={() => onViewPdf(r.filename, r.fileData!)}
                            className="p-1.5 hover:bg-slate-500/10 text-slate-500 dark:text-slate-400 rounded-lg transition-all cursor-pointer"
                            title="Preview file"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteRecord(r.id)}
                          className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-all cursor-pointer"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    <UserMinus className="w-8 h-8 mx-auto stroke-slate-300 dark:stroke-slate-600 mb-2" />
                    No departure logs fit the active criteria.
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
