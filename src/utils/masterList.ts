export interface EmployeeRecord {
  staffId: string;
  name: string;
  position: string;
  nationality: string;
  campus: string;
  department: string;
  status: string;
  lastWorkingDay: string;
}

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTO68GX9WFErMXR7GxUbaAybv0Vu-Cuia482ACsE8LDVOy_g_fAmvuEG7Y6WTSAII_PG521XZoBgBM_/pub?output=csv&gid=1500996284";

let fetchPromise: Promise<Map<string, EmployeeRecord>> | null = null;

function splitRow(row: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of row) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { cells.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

export async function fetchMasterList(): Promise<Map<string, EmployeeRecord>> {
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(CSV_URL, { signal: controller.signal });
      const text = await res.text();
      const rows = text.split("\n");
      const map = new Map<string, EmployeeRecord>();

      for (let i = 5; i < rows.length; i++) {
        const cells = splitRow(rows[i]);
        const rawId = cells[2] || "";
        if (!/^\d{3,}$/.test(rawId.trim())) continue;

        const id = rawId.trim();
        const staffType = cells[9] || "";
        const actInact = (cells[58] || "").toLowerCase();

        map.set(id, {
          staffId: id,
          name: cells[3] || "",
          position: cells[14] || "",
          nationality: cells[6] || "",
          campus: cells[13] || "",
          department: cells[15] || "",
          status: staffType === "Full-Time" ? "Full-time" : "Part-time",
          lastWorkingDay: actInact === "inactive" ? (cells[60] || "") : "",
        });
      }
      return map;
    } catch (err) {
      console.warn("Master list fetch failed, will retry:", err);
      fetchPromise = null;
      return new Map();
    } finally {
      clearTimeout(timeout);
    }
  })();

  return fetchPromise;
}

export async function getEmployee(staffId: string): Promise<EmployeeRecord | null> {
  const map = await fetchMasterList();
  return map.get(staffId) || null;
}
