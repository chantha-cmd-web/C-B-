export interface Resignation {
  id: string;
  staffId: string;
  name: string;
  nationality: string;
  campus: string;
  department: string;
  position: string;
  status: string;
  reason: string;
  start: string;
  end: string;
  clearance: "Yes" | "No" | string;
  filename: string;
  fileData: string | null; // Base64 PDF content
  timestamp: number;
}

export interface Nssf {
  id: string;
  month: string;
  year: number;
  staff: number;
  amount: number;
  filename: string;
  fileData: string | null; // Base64 PDF content
  timestamp: number;
}

export interface Donation {
  id: string;
  staffId: string;
  name: string;
  campus: string;
  status: string;
  type: string;
  amount: number;
  date: string;
  filename: string;
  fileData: string | null; // Base64 PDF content
  timestamp: number;
}

export interface TelegramSettings {
  id: string;
  token: string;
  chatId: string;
  fileName: string;
}

export interface User {
  id: string;
  username: string;
  fullname: string;
  password?: string;
  role: string;
}

export enum Tab {
  Dashboard = "dashboard",
  Resignations = "resignations",
  Nssf = "nssf",
  Donations = "donations",
  DataManagement = "data-management",
}

export interface Activity {
  id: string;
  text: string;
  time: number;
  icon: string;
  color: string;
}
