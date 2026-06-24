import React, { useState } from "react";
import {
  Database,
  DownloadCloud,
  FileSpreadsheet,
  FileCode,
  UploadCloud,
  Send,
  Sliders,
  Trash2,
  Settings,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Resignation, Nssf, Donation, TelegramSettings } from "../types";

interface DataManagementViewProps {
  resignations: Resignation[];
  nssf: Nssf[];
  donations: Donation[];
  telegram: TelegramSettings;
  onUpdateTelegram: (tg: TelegramSettings) => Promise<void>;
  onRestoreDatabase: (data: {
    resignations: Resignation[];
    nssf: Nssf[];
    donations: Donation[];
  }) => Promise<void>;
  onResetDatabase: () => Promise<void>;
  onAddToast: (text: string, type: "success" | "error") => void;
  currentUser: { fullname: string } | null;
}

export default function DataManagementView({
  resignations,
  nssf,
  donations,
  telegram,
  onUpdateTelegram,
  onRestoreDatabase,
  onResetDatabase,
  onAddToast,
  currentUser,
}: DataManagementViewProps) {
  // Telegram Settings local state
  const [tgToken, setTgToken] = useState(telegram.token || "8762629026:AAGWtrMC9LmdGyr41CQ07bLM6jbZZRJZ020");
  const [tgChatId, setTgChatId] = useState(telegram.chatId || "-1003596479947");
  const [tgFileName, setTgFileName] = useState(telegram.fileName || "CB_Report");

  const [isTesting, setIsTesting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Strip fileData for spreadsheet weight reduction
  const cleanData = (arr: any[]) => {
    return arr.map(({ fileData, ...rest }) => rest);
  };

  // Export spreadsheet using SheetJS
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const resSheet = XLSX.utils.json_to_sheet(cleanData(resignations));
      XLSX.utils.book_append_sheet(wb, resSheet, "Resignations");

      const nssfSheet = XLSX.utils.json_to_sheet(cleanData(nssf));
      XLSX.utils.book_append_sheet(wb, nssfSheet, "NSSF");

      const donSheet = XLSX.utils.json_to_sheet(cleanData(donations));
      XLSX.utils.book_append_sheet(wb, donSheet, "Donations");

      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `CBS_Export_${dateStr}.xlsx`);
      onAddToast("Excel workbook downloaded successfully.", "success");
    } catch (err) {
      console.error(err);
      onAddToast("Failed to formulate Excel worksheet.", "error");
    }
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    try {
      const payload = {
        resignations,
        nssf,
        donations,
        version: "1.0",
        timestamp: Date.now(),
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `CBS_Database_Backup_${new Date().toISOString().split("T")[0]}.json`);
      downloadAnchor.click();
      onAddToast("JSON database backup downloaded.", "success");
    } catch (err) {
      onAddToast("Failed to compile text backup.", "error");
    }
  };

  // Import JSON Backup & Restore
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result as string);
        if (parsed.resignations || parsed.nssf || parsed.donations) {
          if (
            confirm(
              "Are you sure you want to restore? This will synchronise and overwrite existing databases on all connected devices."
            )
          ) {
            await onRestoreDatabase({
              resignations: parsed.resignations || [],
              nssf: parsed.nssf || [],
              donations: parsed.donations || [],
            });
            onAddToast("Database restored and synced across connected devices.", "success");
          }
        } else {
          onAddToast("Invalid backup file layout structure.", "error");
        }
      } catch (err) {
        onAddToast("Failed to parse JSON file.", "error");
      } finally {
        setIsImporting(false);
        e.target.value = ""; // Reset input
      }
    };
    reader.readAsText(file);
  };

  // Save Telegram parameters to Firestore
  const handleSaveTelegram = async () => {
    try {
      await onUpdateTelegram({
        id: "default",
        token: tgToken.trim(),
        chatId: tgChatId.trim(),
        fileName: tgFileName.trim(),
      });
      onAddToast("Telegram config synchronized across all devices.", "success");
    } catch (err) {
      onAddToast("Failed to sync settings.", "error");
    }
  };

  // Reset Telegram parameters to default values
  const handleResetTelegram = () => {
    setTgToken("8762629026:AAGWtrMC9LmdGyr41CQ07bLM6jbZZRJZ020");
    setTgChatId("-1003596479947");
    setTgFileName("CB_Report");
  };

  // Test connection to Bot channel
  const handleTestTelegram = async () => {
    if (!tgToken || !tgChatId) {
      onAddToast("Bot Token and Chat ID parameters are required.", "error");
      return;
    }

    setIsTesting(true);
    try {
      const url = `https://api.telegram.org/bot${tgToken.trim()}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgChatId.trim(),
          text: `✅ C&B System Connected!\n\nThis device successfully passed the connection audit.\nTime: ${new Date().toLocaleString()}`,
        }),
      });

      const result = await response.json();
      if (result.ok) {
        onAddToast("Test transmission sent to Telegram chat.", "success");
      } else {
        onAddToast(`Telegram failed: ${result.description}`, "error");
      }
    } catch (err) {
      onAddToast("Network fault, cannot reach Telegram server.", "error");
    } finally {
      setIsTesting(false);
    }
  };

  // Send JSON backup report to channel
  const handleSendTelegramBackup = async () => {
    if (!tgToken || !tgChatId) {
      onAddToast("Configure and Save active Bot settings first.", "error");
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        resignations,
        nssf,
        donations,
        timestamp: Date.now(),
      };

      const dataStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const fileDate = new Date().toISOString().split("T")[0];
      const actualFileName = `${tgFileName || "CB_Backup"}_${fileDate}.json`;

      const formData = new FormData();
      formData.append("chat_id", tgChatId.trim());
      formData.append("document", blob, actualFileName);
      formData.append(
        "caption",
        `📦 *C&B System Backup File*\nGenerated: ${new Date().toLocaleString()}\nSynchronized By: ${
          currentUser?.fullname || "HR Administrator"
        }`
      );
      formData.append("parse_mode", "Markdown");

      const response = await fetch(`https://api.telegram.org/bot${tgToken.trim()}/sendDocument`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result.ok) {
        onAddToast("Backup successfully dispatched to Telegram Channel.", "success");
      } else {
        onAddToast(`Telegram upload error: ${result.description}`, "error");
      }
    } catch (err) {
      onAddToast("Network fault while delivering file to Telegram.", "error");
    } finally {
      setIsSending(false);
    }
  };

  // Clear Firestore collections
  const handleResetSystem = async () => {
    if (
      confirm(
        "🚨 WARNING: This action will completely and irreversibly DELETE all database logs across ALL connected devices and locations. Are you absolutely certain you want to proceed?"
      )
    ) {
      try {
        await onResetDatabase();
        onAddToast("Factory Reset completed. Databases cleared and synchronized.", "success");
      } catch (err) {
        console.error(err);
        onAddToast("Failed to clean cloud databases.", "error");
      }
    }
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
          <span className="w-2.5 h-6 rounded bg-[#00537A] dark:bg-cyan-400 block" />
          Data Management & Telegram Integration
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
          Synchronize backups, export spreadsheets, and connect reporting bots to your Telegram channel
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup exports panel */}
        <div className="panel bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/10 dark:border-white/10 rounded-[28px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3 mb-4 flex items-center gap-2">
              <DownloadCloud className="w-4 h-4 text-emerald-500" /> Export System Records
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Export all system records comprising resignations, NSSF contributions, and donations. To conserve download weight and protect transmission buffers, binary PDF attachment payloads are stripped automatically in xlsx format.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportExcel}
              className="btn btn-success bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-semibold px-5 py-3 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-emerald-500/10 hover:translate-y-[-1px] active:translate-y-0 text-left transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export multi-tab Excel
            </button>
            <button
              onClick={handleExportJSON}
              className="btn bg-[#00537A] hover:bg-[#003d5c] text-white text-xs font-semibold px-5 py-3 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm hover:translate-y-[-1px] active:translate-y-0 text-left transition-all"
            >
              <FileCode className="w-4 h-4 text-cyan-400" /> Download JSON Backup
            </button>
          </div>
        </div>

        {/* Database Restore panel */}
        <div className="panel bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/10 dark:border-white/10 rounded-[28px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3 mb-4 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-cyan-500" /> Restore System Databases
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Import a previously compiled JSON system backup file to restore databases. Uploading a valid schema will immediately synchronize the state and replace records on all connected admin devices.
            </p>
          </div>
          <div>
            <label className="relative btn border border-[#00537A]/10 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-[#00537A]/5 hover:border-[#00537A]/20 transition-all text-xs font-semibold px-5 py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer max-w-xs shadow-sm bg-white/50 dark:bg-white/5">
              <UploadCloud className="w-4 h-4 text-cyan-500" />
              {isImporting ? "Importing Data..." : "Choose Backup JSON file"}
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                disabled={isImporting}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Telegram Panel & Notifications Bot config */}
      <div className="panel bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/10 dark:border-white/10 rounded-[28px] p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3 mb-5 flex items-center gap-2">
          <Send className="w-4 h-4 text-sky-400 animate-pulse" /> Telegram Bot Notifications & Auto Backup
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              Bot Token <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={tgToken}
              onChange={(e) => setTgToken(e.target.value)}
              placeholder="e.g., 78103445..."
              className="form-control font-mono text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              Chat Channel ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={tgChatId}
              onChange={(e) => setTgChatId(e.target.value)}
              placeholder="e.g., -10045612..."
              className="form-control font-mono text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              Backup Export Name Format
            </label>
            <input
              type="text"
              value={tgFileName}
              onChange={(e) => setTgFileName(e.target.value)}
              placeholder="CB_Backup"
              className="form-control font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-100 dark:border-white/5 pt-4">
          <button
            onClick={handleSaveTelegram}
            className="btn bg-[#00537A] hover:bg-[#003d5c] text-white text-xs font-semibold px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Settings className="w-4 h-4" /> Save Bot Parameters
          </button>
          <button
            type="button"
            onClick={handleTestTelegram}
            disabled={isTesting}
            className="btn border border-[#00537A]/10 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-[#00537A]/5 font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-4 h-4 text-sky-400" />
            {isTesting ? "Testing Channel Connection..." : "Test Bot Output Link"}
          </button>
          <button
            onClick={handleSendTelegramBackup}
            disabled={isSending}
            className="btn border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer bg-white/50 dark:bg-white/5"
          >
            <Database className="w-4 h-4 text-amber-500" />
            {isSending ? "Dispatching Backup Payload..." : "Send Database JSON to Canal"}
          </button>
          <button
            onClick={handleResetTelegram}
            className="btn border border-dashed border-rose-500/20 text-rose-500 hover:bg-rose-500/5 text-xs font-medium px-4 py-2 rounded-xl cursor-pointer"
          >
             Clear / Reset Settings
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="panel bg-[#ffedeb]/40 dark:bg-[#e17055]/5 border border-red-500/25 rounded-[28px] p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-rose-600 dark:text-red-400 flex items-center gap-2 mb-2">
          <Trash2 className="w-4 h-4" /> System Factory Reset
        </h3>
        <p className="text-xs text-rose-500/70 dark:text-slate-400 mb-5 max-w-xl leading-relaxed">
          Resetting the system triggers Firestore deletion rules across all collections. This removes NSSF lists, departs, clear statements, and donations across all authenticated administrator terminals. This remains permanent.
        </p>
        <button
          onClick={handleResetSystem}
          className="btn btn-danger bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-5 py-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm shadow-rose-600/15 hover:shadow-rose-600/30 hover:translate-y-[-1px] active:translate-y-0 transition-all"
        >
          <Trash2 className="w-4 h-4" /> Reset System Database
        </button>
      </div>
    </div>
  );
}
