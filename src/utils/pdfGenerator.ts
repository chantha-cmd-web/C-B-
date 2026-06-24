import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Resignation, Nssf, Donation } from "../types";

// Extends jsPDF type to solve typescript build validation with autotable plugin
interface ExtendedjsPDF extends jsPDF {
  autoTable: any;
}

interface GenerateReportOptions {
  type: "resignation" | "nssf" | "donation";
  fromDate: string;
  toDate: string;
  resignations: Resignation[];
  nssf: Nssf[];
  donations: Donation[];
  isNight: boolean;
  onAddToast: (text: string, type: "success" | "error") => void;
}

export function generatePdfReport({
  type,
  fromDate,
  toDate,
  resignations,
  nssf,
  donations,
  isNight,
  onAddToast,
}: GenerateReportOptions) {
  try {
    const doc = new jsPDF("landscape") as ExtendedjsPDF;
    const fromVal = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const toVal = toDate ? new Date(toDate + "T23:59:59") : null;

    // Theme adaptations
    const titleColor = isNight ? "#A8E8F9" : "#00537A";
    const textColor = isNight ? "#ffffff" : "#1a2a3a";
    const headColor = isNight ? "#1a3050" : "#00537A";
    const altRowColor = isNight ? "#1a2a3a" : "#f8fafc";

    const addMeta = (titleText: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(titleColor);
      doc.text(titleText, 14, 22);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(isNight ? "#94a3b8" : "#64748b");
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

      if (fromDate || toDate) {
        const range = `Analysis Period: ${fromDate || "Beginning"} to ${toDate || "Present"}`;
        doc.text(range, 14, 36);
      }
    };

    if (type === "resignation") {
      let data = [...resignations];

      if (fromVal) {
        data = data.filter((r) => r.end && new Date(r.end + "T20:00:00") >= fromVal);
      }
      if (toVal) {
        data = data.filter((r) => r.end && new Date(r.end + "T00:00:00") <= toVal);
      }

      data.sort((a, b) => (a.end || "").localeCompare(b.end || ""));
      addMeta("Resignations & Clearance Compliance Audit");

      const rows = data.map((r) => [
        r.staffId,
        r.name,
        r.position,
        r.campus || "-",
        r.department || "-",
        r.nationality || "-",
        r.status || "-",
        r.reason || "-",
        r.end || "-",
        r.clearance === "Yes" ? "Cleared" : "Pending",
      ]);

      doc.autoTable({
        startY: fromDate || toDate ? 42 : 36,
        head: [["ID", "Name", "Position", "Campus", "Department", "Nationality", "Status", "Reason", "Last Day", "Clearance"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: headColor, textColor: "#ffffff", fontStyle: "bold", fontSize: 9 },
        bodyStyles: { textColor: textColor, fontSize: 8 },
        alternateRowStyles: { fillColor: altRowColor },
        margin: { top: 14 },
      });

      const resignationsUrl = URL.createObjectURL(doc.output('blob'));
      window.open(resignationsUrl, '_blank');
      onAddToast(`PDF resignation report compile completed: ${data.length} records.`, "success");

    } else if (type === "nssf") {
      let data = [...nssf];
      const monthOrder = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      if (fromVal || toVal) {
        data = data.filter((n) => {
          const mIdx = monthOrder.indexOf(n.month);
          const d = new Date(Number(n.year), mIdx, 1);
          if (fromVal && d < fromVal) return false;
          if (toVal && d > toVal) return false;
          return true;
        });
      }

      data.sort((a, b) => {
        const aIdx = monthOrder.indexOf(a.month);
        const bIdx = monthOrder.indexOf(b.month);
        return Number(a.year) - Number(b.year) || aIdx - bIdx;
      });

      addMeta("National Social Security Fund Payments Audit");

      const rows = data.map((n) => [
        `${n.month} ${n.year}`,
        n.staff.toString(),
        `$${Number(n.amount).toFixed(2)}`,
        n.filename,
      ]);

      const totalEmployees = data.reduce((s, n) => s + Number(n.staff || 0), 0);
      const totalContributionValue = data.reduce((s, n) => s + Number(n.amount || 0), 0);

      rows.push(["GRAND TOTAL", totalEmployees.toString(), `$${totalContributionValue.toFixed(2)}`, "Compiled Archive Summary"]);

      doc.autoTable({
        startY: fromDate || toDate ? 42 : 36,
        head: [["Payment Period", "Active Contributes", "Contribution Total", "Receipt File Attachment"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: headColor, textColor: "#ffffff", fontStyle: "bold", fontSize: 9 },
        bodyStyles: { textColor: textColor, fontSize: 8 },
        alternateRowStyles: { fillColor: altRowColor },
        footStyles: { fillColor: headColor, textColor: "#ffffff", fontStyle: "bold", fontSize: 9 },
        margin: { top: 14 },
      });

      const nssfUrl = URL.createObjectURL(doc.output('blob'));
      window.open(nssfUrl, '_blank');
      onAddToast(`NSSF report compiled completely.`, "success");

    } else if (type === "donation") {
      let data = [...donations];

      if (fromVal) {
        data = data.filter((d) => d.date && new Date(d.date + "T00:00:00") >= fromVal);
      }
      if (toVal) {
        data = data.filter((d) => d.date && new Date(d.date + "T23:59:59") <= toVal);
      }

      data.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      addMeta("Staff Social Events Donations Statement");

      const rows = data.map((d) => [
        d.staffId,
        d.name,
        d.campus || "-",
        d.type,
        `$${Number(d.amount).toFixed(2)}`,
        d.date || "-",
      ]);

      const grandTotalAmount = data.reduce((s, d) => s + Number(d.amount || 0), 0);
      rows.push(["GRAND TOTAL", "", "", "", `$${grandTotalAmount.toFixed(2)}`, "Dispatched Donations Summary"]);

      doc.autoTable({
        startY: fromDate || toDate ? 42 : 36,
        head: [["ID", "Donating Staff Member", "Designated Campus", "Donation Event Type", "Shared Contribution", "Committed Date"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: headColor, textColor: "#ffffff", fontStyle: "bold", fontSize: 9 },
        bodyStyles: { textColor: textColor, fontSize: 8 },
        alternateRowStyles: { fillColor: altRowColor },
        footStyles: { fillColor: headColor, textColor: "#ffffff", fontStyle: "bold", fontSize: 9 },
        margin: { top: 14 },
      });

      const donationsUrl = URL.createObjectURL(doc.output('blob'));
      window.open(donationsUrl, '_blank');
      onAddToast(`Donations aggregate audit compiled successfully.`, "success");
    }
  } catch (err) {
    console.error(err);
    onAddToast("Critical failure compiling PDF report statement.", "error");
  }
}
