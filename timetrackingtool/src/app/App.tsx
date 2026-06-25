import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";
import { LoginView } from "./LoginView";
import {
  LayoutDashboard, Clock, ClipboardCheck, FolderOpen, Users, BarChart3,
  CreditCard, Download, Settings, Bell, Search, Play, Square, Plus,
  Check, X, AlertTriangle, DollarSign, Calendar, Filter, MoreHorizontal,
  ChevronDown, ChevronRight, TrendingUp, Activity, Briefcase, FileText,
  User, LogOut, Building2, Zap, Send, Lock, ArrowUpRight, ArrowDownRight,
  CheckCircle2, XCircle, Timer, PieChart, Globe, Shield, Eye, EyeOff,
  Edit2, Trash2, RefreshCw, ExternalLink, ChevronUp, Minus, UploadCloud,
  Info, Star, Layers, Target, Landmark, AlertCircle, CalendarDays,
  Plane, HeartPulse, UmbrellaOff, MapPin
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, AreaChart, Area
} from "recharts";

// ─── TYPES ──────────────────────────────────────────────────────────────────

type Role = "owner" | "operations" | "freelancer";
type EntryStatus = "draft" | "submitted" | "approved" | "rejected" | "paid";
type ProjectStatus = "active" | "completed" | "on-hold" | "at-risk";
type ProjectCategory =
  | "directly-billable"
  | "billable-approval"
  | "strategic-investment"
  | "overhead"
  | "personal-development"
  | "social-impact";
type View =
  | "dashboard" | "time-register" | "approvals" | "projects"
  | "freelancers" | "reports" | "payments" | "exports" | "settings"
  | "my-time" | "my-projects" | "submit-hours" | "profile"
  | "time-off" | "availability";

type TimeOffType = "vacation" | "sick";
type TimeOffStatus = "pending" | "approved" | "denied";

interface TimeOffEntry {
  id: string;
  freelancerId: string;
  type: TimeOffType;
  startDate: string;
  endDate: string;
  notes?: string;
  status: TimeOffStatus;
  submittedAt: string;
  respondedAt?: string;
  respondedBy?: string;
}

interface BankAccount {
  accountHolder: string;
  bankName: string;
  sortCode: string;
  accountNumber: string;
  iban?: string;
  paymentRef?: string;
}

interface Freelancer {
  id: string; name: string; email: string; role: string;
  hourlyRate: number; avatar: string; status: "active" | "inactive";
  totalHours: number; pendingHours: number;
  bankAccount?: BankAccount;
}

interface Project {
  id: string; clientName: string; name: string; serviceType: string;
  code: string;
  category: ProjectCategory;
  budget: number | null; status: ProjectStatus; assignedFreelancers: string[];
  approvedCost: number; forecastCost: number; description: string;
  startDate: string; endDate: string;
  billable: boolean;
  requiresApproval?: boolean;
}

const CATEGORY_CONFIG: Record<ProjectCategory, { label: string; color: string; dot: string }> = {
  "directly-billable":    { label: "Directly Billable",         color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  "billable-approval":    { label: "Billable (Prior Approval)",  color: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
  "strategic-investment": { label: "Strategic Investment",       color: "bg-blue-50 text-blue-700 border-blue-200",          dot: "bg-blue-500" },
  "overhead":             { label: "Overhead",                   color: "bg-slate-100 text-slate-600 border-slate-200",      dot: "bg-slate-400" },
  "personal-development": { label: "Personal Development",       color: "bg-purple-50 text-purple-700 border-purple-200",    dot: "bg-purple-500" },
  "social-impact":        { label: "Social Impact",              color: "bg-teal-50 text-teal-700 border-teal-200",          dot: "bg-teal-500" },
};

interface TimeEntry {
  id: string; freelancerId: string; projectId: string;
  date: string; startTime: string; endTime: string;
  hours: number; description: string; status: EntryStatus;
  submittedAt?: string; approvedAt?: string; approvedBy?: string;
  amount?: number;
}

// ─── MOCK DATA ───────────────────────────────────────────────────────────────

const FREELANCERS: Freelancer[] = [
  { id: "f1", name: "Sarah Mitchell", email: "sarah@freelance.com", role: "Accessibility Auditor", hourlyRate: 95, avatar: "SM", status: "active", totalHours: 142, pendingHours: 8,
    bankAccount: { accountHolder: "Sarah Mitchell", bankName: "Barclays", sortCode: "20-15-42", accountNumber: "31415926", iban: "GB29BARC20154231415926", paymentRef: "ESTEEM-SM" } },
  { id: "f2", name: "James Okonkwo", email: "james@freelance.com", role: "WCAG Specialist", hourlyRate: 110, avatar: "JO", status: "active", totalHours: 98, pendingHours: 12,
    bankAccount: { accountHolder: "James Okonkwo", bankName: "HSBC UK", sortCode: "40-12-34", accountNumber: "12345678", paymentRef: "ESTEEM-JO" } },
  { id: "f3", name: "Priya Sharma", email: "priya@freelance.com", role: "UX/Inclusive Designer", hourlyRate: 85, avatar: "PS", status: "active", totalHours: 76, pendingHours: 4,
    bankAccount: { accountHolder: "Priya Sharma", bankName: "NatWest", sortCode: "60-01-23", accountNumber: "87654321", iban: "GB12NWBK60012387654321" } },
  { id: "f4", name: "Tom Brennan", email: "tom@freelance.com", role: "Screen Reader Tester", hourlyRate: 75, avatar: "TB", status: "active", totalHours: 55, pendingHours: 0,
    bankAccount: { accountHolder: "Thomas Brennan", bankName: "Lloyds Bank", sortCode: "30-93-45", accountNumber: "55667788" } },
  { id: "f5", name: "Anika Patel", email: "anika@freelance.com", role: "Legal & Compliance", hourlyRate: 120, avatar: "AP", status: "active", totalHours: 88, pendingHours: 6,
    bankAccount: { accountHolder: "Anika Patel", bankName: "Monzo", sortCode: "04-00-04", accountNumber: "99887766", iban: "GB55MONZ04000499887766", paymentRef: "ESTEEM-AP" } },
  { id: "f6", name: "Marco Ricci", email: "marco@freelance.com", role: "Accessibility Auditor", hourlyRate: 90, avatar: "MR", status: "inactive", totalHours: 34, pendingHours: 0 },
];

const TIME_OFF_ENTRIES: TimeOffEntry[] = [
  { id: "to1", freelancerId: "f1", type: "vacation", startDate: "2026-06-20", endDate: "2026-06-27", notes: "Summer holiday — Tenerife", status: "approved", submittedAt: "2026-06-08", respondedAt: "2026-06-09", respondedBy: "Alex Wright" },
  { id: "to2", freelancerId: "f2", type: "sick", startDate: "2026-06-13", endDate: "2026-06-13", notes: "Migraine, back tomorrow", status: "approved", submittedAt: "2026-06-13", respondedAt: "2026-06-13", respondedBy: "Alex Wright" },
  { id: "to3", freelancerId: "f3", type: "vacation", startDate: "2026-07-01", endDate: "2026-07-14", notes: "Annual leave — Portugal", status: "pending", submittedAt: "2026-06-14" },
  { id: "to4", freelancerId: "f4", type: "vacation", startDate: "2026-06-16", endDate: "2026-06-16", notes: "Bank holiday extension", status: "approved", submittedAt: "2026-06-10", respondedAt: "2026-06-11", respondedBy: "Alex Wright" },
  { id: "to5", freelancerId: "f5", type: "sick", startDate: "2026-06-14", endDate: "2026-06-15", notes: "Flu", status: "approved", submittedAt: "2026-06-14", respondedAt: "2026-06-14", respondedBy: "Alex Wright" },
  { id: "to6", freelancerId: "f6", type: "vacation", startDate: "2026-06-10", endDate: "2026-06-17", notes: "Family trip", status: "approved", submittedAt: "2026-06-01", respondedAt: "2026-06-02", respondedBy: "Alex Wright" },
  { id: "to7", freelancerId: "f1", type: "sick", startDate: "2026-05-22", endDate: "2026-05-22", notes: "Doctor appointment", status: "approved", submittedAt: "2026-05-22", respondedAt: "2026-05-22", respondedBy: "Alex Wright" },
  { id: "to8", freelancerId: "f2", type: "vacation", startDate: "2026-08-04", endDate: "2026-08-15", notes: "Summer holiday — Greece", status: "pending", submittedAt: "2026-06-15" },
];

const TODAY = "2026-06-15";

function isOnLeaveToday(freelancerId: string, entries: TimeOffEntry[] = TIME_OFF_ENTRIES): TimeOffEntry | undefined {
  return entries.find(e =>
    e.freelancerId === freelancerId &&
    e.status === "approved" &&
    e.startDate <= TODAY &&
    e.endDate >= TODAY
  );
}

function isOnLeaveSoon(freelancerId: string, entries: TimeOffEntry[] = TIME_OFF_ENTRIES): TimeOffEntry | undefined {
  const inSevenDays = "2026-06-22";
  return entries.find(e =>
    e.freelancerId === freelancerId &&
    e.status === "approved" &&
    e.startDate > TODAY &&
    e.startDate <= inSevenDays
  );
}

const PROJECTS: Project[] = [
  // ── Directly Billable ────────────────────────────────────────────────────
  { id: "p1",  code: "KL-001", clientName: "Genovum",  name: "Genovum",  category: "directly-billable", serviceType: "Client Project", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Consulting, training, workshops, support and project management for Genovum.", startDate: "", endDate: "", billable: true },
  { id: "p2",  code: "KL-002", clientName: "Handelsbank", name: "Handelsbank", category: "directly-billable", serviceType: "Client Project", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Consulting, training, workshops, support and project management for Handelsbank.", startDate: "", endDate: "", billable: true },
  { id: "p3",  code: "KL-003", clientName: "Applause", name: "Applause", category: "directly-billable", serviceType: "Client Project", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Consulting, training, workshops, support and project management for Applause.", startDate: "", endDate: "", billable: true },
  { id: "p4",  code: "KL-004", clientName: "Esteem", name: "Esteem Awareness Trainings", category: "directly-billable", serviceType: "Training Delivery", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Delivery of accessibility awareness training programmes.", startDate: "", endDate: "", billable: true },
  { id: "p5",  code: "HR-001", clientName: "Esteem", name: "Coaching & People Development", category: "directly-billable", serviceType: "Coaching", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Coaching sessions organised by Esteem. Personal guidance and mentoring of junior team members.", startDate: "", endDate: "", billable: true },
  // ── Billable upon Prior Approval ──────────────────────────────────────────
  { id: "p6",  code: "CX-001", clientName: "Esteem", name: "Customer & People Development", category: "billable-approval", serviceType: "Strategic Investment", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Dashboards, AI solutions, automations, client portals, coaching programs, training materials and wellbeing initiatives. Requires prior approval from Carmen.", startDate: "", endDate: "", billable: true, requiresApproval: true },
  // ── Strategic Investment ──────────────────────────────────────────────────
  { id: "p7",  code: "BD-001", clientName: "Esteem", name: "Partner Development", category: "strategic-investment", serviceType: "Business Development", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Building and maintaining partnerships that support Esteem's growth.", startDate: "", endDate: "", billable: false },
  { id: "p8",  code: "BD-002", clientName: "Esteem", name: "Service Development", category: "strategic-investment", serviceType: "Business Development", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Innovation of services, new methodologies, frameworks and programmes.", startDate: "", endDate: "", billable: false },
  { id: "p9",  code: "BD-003", clientName: "Esteem", name: "Community Management", category: "strategic-investment", serviceType: "Business Development", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Community building and management activities.", startDate: "", endDate: "", billable: false },
  { id: "p10", code: "BD-004", clientName: "Esteem", name: "Event Organization", category: "strategic-investment", serviceType: "Business Development", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Planning and organisation of Esteem events.", startDate: "", endDate: "", billable: false },
  { id: "p11", code: "MKT-001", clientName: "Esteem", name: "Esteem Social Media", category: "strategic-investment", serviceType: "Marketing", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Content creation and management of Esteem social media channels.", startDate: "", endDate: "", billable: false },
  { id: "p12", code: "MKT-002", clientName: "Esteem", name: "Communications", category: "strategic-investment", serviceType: "Marketing", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "External communications, newsletters and PR activities.", startDate: "", endDate: "", billable: false },
  { id: "p13", code: "MKT-003", clientName: "Esteem", name: "Public Speaking & Presentations", category: "strategic-investment", serviceType: "Marketing", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Thought leadership, conferences, talks and presentations.", startDate: "", endDate: "", billable: false },
  { id: "p14", code: "HR-001s", clientName: "Esteem", name: "Coaching & People Development (Strategic)", category: "strategic-investment", serviceType: "HR", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Leadership development, team coaching and professional development programmes.", startDate: "", endDate: "", billable: false },
  // ── Overhead ──────────────────────────────────────────────────────────────
  { id: "p15", code: "INT-001", clientName: "Esteem", name: "Management & Organization", category: "overhead", serviceType: "Operations", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Operational management, internal meetings and organisational activities.", startDate: "", endDate: "", billable: false },
  { id: "p16", code: "INT-002", clientName: "Esteem", name: "Administration & Office Management", category: "overhead", serviceType: "Operations", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Administration, finance and office management.", startDate: "", endDate: "", billable: false },
  { id: "p17", code: "INT-003", clientName: "Esteem", name: "Internal IT & Systems", category: "overhead", serviceType: "Operations", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Internal systems management, tooling and IT.", startDate: "", endDate: "", billable: false },
  // ── Personal Development ──────────────────────────────────────────────────
  { id: "p18", code: "INT-004", clientName: "Esteem", name: "Learning & Development", category: "personal-development", serviceType: "Personal Development", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "External training, certifications, professional courses, self-study and personal knowledge development.", startDate: "", endDate: "", billable: false },
  // ── Social Impact ─────────────────────────────────────────────────────────
  { id: "p19", code: "IMP-001", clientName: "Esteem", name: "Volunteer Work", category: "social-impact", serviceType: "Social Impact", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Voluntary activities contributing to society.", startDate: "", endDate: "", billable: false },
  { id: "p20", code: "IMP-002", clientName: "Esteem", name: "Pro Bono Projects", category: "social-impact", serviceType: "Social Impact", budget: null, status: "active", assignedFreelancers: [], approvedCost: 0, forecastCost: 0, description: "Pro bono client work contributing to social good.", startDate: "", endDate: "", billable: false },
];

const TIME_ENTRIES: TimeEntry[] = [
  { id: "t1", freelancerId: "f1", projectId: "p1", date: "2026-06-13", startTime: "09:00", endTime: "13:00", hours: 4, description: "Homepage and navigation audit - keyboard accessibility", status: "approved", submittedAt: "2026-06-13", approvedAt: "2026-06-14", approvedBy: "Owner", amount: 380 },
  { id: "t2", freelancerId: "f2", projectId: "p1", date: "2026-06-13", startTime: "10:00", endTime: "16:00", hours: 6, description: "ARIA landmark review and form accessibility testing", status: "approved", submittedAt: "2026-06-13", approvedAt: "2026-06-14", approvedBy: "Owner", amount: 660 },
  { id: "t3", freelancerId: "f3", projectId: "p2", date: "2026-06-12", startTime: "09:30", endTime: "17:30", hours: 8, description: "Patient registration flow - inclusive design review", status: "submitted", submittedAt: "2026-06-12", amount: 680 },
  { id: "t4", freelancerId: "f1", projectId: "p1", date: "2026-06-14", startTime: "09:00", endTime: "12:00", hours: 3, description: "Colour contrast analysis and remediation notes", status: "submitted", submittedAt: "2026-06-14", amount: 285 },
  { id: "t5", freelancerId: "f5", projectId: "p2", date: "2026-06-11", startTime: "14:00", endTime: "18:00", hours: 4, description: "Legal compliance check - PSBAR and EAA requirements", status: "approved", submittedAt: "2026-06-11", approvedAt: "2026-06-12", approvedBy: "Owner", amount: 480 },
  { id: "t6", freelancerId: "f4", projectId: "p1", date: "2026-06-10", startTime: "09:00", endTime: "14:00", hours: 5, description: "NVDA and JAWS testing on account management screens", status: "paid", submittedAt: "2026-06-10", approvedAt: "2026-06-11", approvedBy: "Owner", amount: 375 },
  { id: "t7", freelancerId: "f2", projectId: "p3", date: "2026-06-13", startTime: "13:00", endTime: "17:00", hours: 4, description: "Journey planner widget keyboard navigation review", status: "submitted", submittedAt: "2026-06-13", amount: 440 },
  { id: "t8", freelancerId: "f3", projectId: "p3", date: "2026-06-12", startTime: "10:00", endTime: "14:00", hours: 4, description: "Map interface accessible alternatives design", status: "draft", amount: 340 },
  { id: "t9", freelancerId: "f5", projectId: "p5", date: "2026-06-14", startTime: "09:00", endTime: "13:00", hours: 4, description: "HMRC PSBAR gap analysis and remediation roadmap", status: "submitted", submittedAt: "2026-06-14", amount: 480 },
  { id: "t10", freelancerId: "f1", projectId: "p2", date: "2026-06-09", startTime: "09:00", endTime: "17:00", hours: 8, description: "Appointment booking flow full accessibility review", status: "paid", submittedAt: "2026-06-09", approvedAt: "2026-06-10", approvedBy: "Owner", amount: 760 },
  { id: "t11", freelancerId: "f2", projectId: "p5", date: "2026-06-11", startTime: "09:00", endTime: "13:00", hours: 4, description: "Self Assessment portal - skip navigation and focus management", status: "approved", submittedAt: "2026-06-11", approvedAt: "2026-06-13", approvedBy: "Owner", amount: 440 },
  { id: "t12", freelancerId: "f3", projectId: "p2", date: "2026-06-14", startTime: "13:00", endTime: "17:00", hours: 4, description: "Medical form accessible error handling patterns", status: "draft", amount: 340 },
];

const WEEKLY_CHART_DATA = [
  { week: "W21", hours: 62, cost: 5840 },
  { week: "W22", hours: 78, cost: 7220 },
  { week: "W23", hours: 54, cost: 5110 },
  { week: "W24", hours: 91, cost: 8640 },
  { week: "W25 (now)", hours: 43, cost: 4080 },
];

const MONTHLY_CHART_DATA = [
  { month: "Jan", approved: 24000, paid: 20000 },
  { month: "Feb", approved: 28000, paid: 24000 },
  { month: "Mar", approved: 32000, paid: 30000 },
  { month: "Apr", approved: 26000, paid: 26000 },
  { month: "May", approved: 38000, paid: 32000 },
  { month: "Jun", approved: 22000, paid: 14000 },
];

// ─── UTILITIES ───────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function formatHours(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function getFreelancer(id: string) { return FREELANCERS.find(f => f.id === id); }
function getProject(id: string) { return PROJECTS.find(p => p.id === id); }

function budgetPct(project: Project) {
  if (!project.billable || !project.budget) return 0;
  return Math.round((project.forecastCost / project.budget) * 100);
}

const STATUS_CONFIG: Record<EntryStatus, { label: string; color: string; dot: string }> = {
  draft:     { label: "Draft",     color: "bg-slate-100 text-slate-600 border-slate-200",    dot: "bg-slate-400" },
  submitted: { label: "Submitted", color: "bg-blue-50 text-blue-700 border-blue-200",         dot: "bg-blue-500" },
  approved:  { label: "Approved",  color: "bg-emerald-50 text-emerald-700 border-emerald-200",dot: "bg-emerald-500" },
  rejected:  { label: "Rejected",  color: "bg-red-50 text-red-700 border-red-200",            dot: "bg-red-500" },
  paid:      { label: "Paid",      color: "bg-purple-50 text-purple-700 border-purple-200",   dot: "bg-purple-500" },
};

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  active:    { label: "Active",    color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { label: "Completed", color: "bg-slate-100 text-slate-600 border-slate-200" },
  "on-hold": { label: "On Hold",   color: "bg-amber-50 text-amber-700 border-amber-200" },
  "at-risk": { label: "At Risk",   color: "bg-red-50 text-red-700 border-red-200" },
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EntryStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = PROJECT_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-8 h-8 text-sm", lg: "w-10 h-10 text-base" };
  const colors = ["bg-blue-600", "bg-indigo-600", "bg-violet-600", "bg-emerald-600", "bg-teal-600", "bg-cyan-600"];
  const idx = initials.charCodeAt(0) % colors.length;
  return (
    <div className={`${sizes[size]} ${colors[idx]} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

function KPICard({
  title, value, subtitle, icon: Icon, trend, trendDir, accent
}: {
  title: string; value: string; subtitle?: string;
  icon: React.ElementType; trend?: string; trendDir?: "up" | "down" | "neutral"; accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#64748b]">{title}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent || "bg-[#f1f5f9]"}`}>
          <Icon className="w-4 h-4 text-[#1d3461]" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold text-[#0f172a] tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-[#64748b] mt-0.5">{subtitle}</p>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendDir === "up" ? "text-emerald-600" : trendDir === "down" ? "text-red-500" : "text-[#64748b]"}`}>
          {trendDir === "up" ? <ArrowUpRight className="w-3 h-3" /> : trendDir === "down" ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {trend}
        </div>
      )}
    </div>
  );
}

function BudgetBar({ pct, size = "md" }: { pct: number; size?: "sm" | "md" }) {
  const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  const h = size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className={`w-full ${h} rounded-full bg-[#f1f5f9] overflow-hidden`}>
      <div className={`${h} rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-lg font-semibold text-[#0f172a]">{title}</h2>
        {subtitle && <p className="text-sm text-[#64748b] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-[#f1f5f9] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[#94a3b8]" />
      </div>
      <p className="text-sm font-medium text-[#0f172a]">{title}</p>
      <p className="text-sm text-[#64748b] mt-1 max-w-xs">{description}</p>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

const NAV_BY_ROLE: Record<Role, { id: View; label: string; icon: React.ElementType }[]> = {
  owner: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "time-register", label: "Time Register", icon: Clock },
    { id: "approvals", label: "Approvals", icon: ClipboardCheck },
    { id: "projects", label: "Projects", icon: FolderOpen },
    { id: "freelancers", label: "Freelancers", icon: Users },
    { id: "availability", label: "Availability", icon: CalendarDays },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "exports", label: "Exports", icon: Download },
    { id: "settings", label: "Settings", icon: Settings },
  ],
  operations: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "time-register", label: "Time Register", icon: Clock },
    { id: "approvals", label: "Approvals", icon: ClipboardCheck },
    { id: "projects", label: "Projects", icon: FolderOpen },
    { id: "availability", label: "Availability", icon: CalendarDays },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "exports", label: "Exports", icon: Download },
  ],
  freelancer: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "my-time", label: "My Time", icon: Clock },
    { id: "my-projects", label: "My Projects", icon: FolderOpen },
    { id: "submit-hours", label: "Submit Hours", icon: Send },
    { id: "time-off", label: "Time Off", icon: CalendarDays },
    { id: "profile", label: "Profile", icon: User },
  ],
};

function Sidebar({ role, view, onNavigate, onRoleChange, profile, onLogout }: {
  role: Role; view: View; onNavigate: (v: View) => void; onRoleChange: (r: Role) => void;
  profile: any; onLogout: () => void;
}) {
  const nav = NAV_BY_ROLE[role];
  const pendingCount = TIME_ENTRIES.filter(e => e.status === "submitted").length;

  const roleLabels: Record<Role, { label: string; icon: React.ElementType; color: string }> = {
    owner: { label: "Owner", icon: Shield, color: "text-amber-400" },
    operations: { label: "Operations", icon: Activity, color: "text-blue-400" },
    freelancer: { label: "Freelancer", icon: User, color: "text-emerald-400" },
  };

  const roleCfg = roleLabels[role];
  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "User";
  const initials = profile?.avatar_initials || displayName.slice(0, 2).toUpperCase();

  return (
    <aside className="w-[230px] shrink-0 bg-[#0c1e3c] flex flex-col h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1e3a6e]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#2563eb] rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-base tracking-wide">ESTEEM</span>
            <p className="text-[#4a7bd4] text-[10px] font-medium tracking-widest uppercase leading-none mt-0.5">Ops Platform</p>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-3 py-3 border-b border-[#1e3a6e]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#162d56]">
          <roleCfg.icon className={`w-3.5 h-3.5 ${roleCfg.color} shrink-0`} />
          <span className="text-[#e2e8f0] text-sm font-medium">{roleCfg.label}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {nav.map(item => {
          const active = view === item.id;
          const badge = item.id === "approvals" && pendingCount > 0 ? pendingCount : null;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-[#2563eb] text-white"
                  : "text-[#94a3b8] hover:bg-[#162d56] hover:text-[#e2e8f0]"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {badge && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-[#1e3a6e] space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <Avatar initials={initials} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#e2e8f0] truncate">{displayName}</p>
            <p className="text-xs text-[#64748b] truncate">{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#94a3b8] hover:bg-[#162d56] hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ─── TOP BAR ─────────────────────────────────────────────────────────────────

function TopBar({ title, subtitle, role }: { title: string; subtitle?: string; role: Role }) {
  const pendingCount = TIME_ENTRIES.filter(e => e.status === "submitted").length;
  return (
    <header className="h-14 bg-white border-b border-[#e2e8f0] flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1">
        <h1 className="text-base font-semibold text-[#0f172a]">{title}</h1>
        {subtitle && <p className="text-xs text-[#64748b]">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="pl-9 pr-4 py-1.5 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] w-52 placeholder:text-[#94a3b8]"
            placeholder="Search..."
            readOnly
          />
        </div>
        {role !== "freelancer" && (
          <button className="relative w-8 h-8 rounded-lg hover:bg-[#f1f5f9] flex items-center justify-center transition-colors">
            <Bell className="w-4 h-4 text-[#64748b]" />
            {pendingCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        )}
      </div>
    </header>
  );
}

// ─── DASHBOARD VIEW ───────────────────────────────────────────────────────────

function DashboardView({ role }: { role: Role }) {
  const submitted = TIME_ENTRIES.filter(e => e.status === "submitted");
  const approvedEntries = TIME_ENTRIES.filter(e => e.status === "approved" || e.status === "paid");
  const paidEntries = TIME_ENTRIES.filter(e => e.status === "paid");
  const approvedCost = approvedEntries.reduce((s, e) => s + (e.amount || 0), 0);
  const paidCost = paidEntries.reduce((s, e) => s + (e.amount || 0), 0);
  const activeProjects = PROJECTS.filter(p => p.status === "active" || p.status === "at-risk");
  const activeFreelancers = FREELANCERS.filter(f => f.status === "active");
  const weekHours = TIME_ENTRIES.filter(e => e.date >= "2026-06-09").reduce((s, e) => s + e.hours, 0);

  const recentActivity = TIME_ENTRIES.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const atRiskProjects = PROJECTS.filter(p => budgetPct(p) >= 80);

  if (role === "freelancer") {
    const myEntries = TIME_ENTRIES.filter(e => e.freelancerId === "f1");
    const myWeekHours = myEntries.filter(e => e.date >= "2026-06-09").reduce((s, e) => s + e.hours, 0);
    const myPending = myEntries.filter(e => e.status === "submitted");
    const myProjects = PROJECTS.filter(p => p.assignedFreelancers.includes("f1"));
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Hours This Week" value={`${myWeekHours}h`} subtitle="Mon–Sun" icon={Clock} trend="+2h vs last week" trendDir="up" />
          <KPICard title="Pending Approval" value={`${myPending.length}`} subtitle="entries awaiting review" icon={ClipboardCheck} />
          <KPICard title="Active Projects" value={`${myProjects.length}`} subtitle="assigned to you" icon={FolderOpen} />
          <KPICard title="Submitted This Month" value={`${myEntries.filter(e => e.status !== "draft").length}`} subtitle="total entries" icon={Send} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
            <h3 className="text-sm font-semibold text-[#0f172a] mb-4">My Recent Entries</h3>
            <div className="space-y-3">
              {myEntries.slice(0, 5).map(entry => {
                const project = getProject(entry.projectId);
                return (
                  <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-[#f1f5f9] last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0f172a] truncate">{entry.description}</p>
                      <p className="text-xs text-[#64748b]">{project?.name} · {entry.date}</p>
                    </div>
                    <span className="text-sm font-mono font-medium text-[#0f172a]">{entry.hours}h</span>
                    <StatusBadge status={entry.status} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
            <h3 className="text-sm font-semibold text-[#0f172a] mb-4">My Projects</h3>
            <div className="space-y-3">
              {myProjects.map(p => (
                <div key={p.id} className="py-2 border-b border-[#f1f5f9] last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-[#0f172a]">{p.name}</p>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                  <p className="text-xs text-[#64748b]">{p.clientName} · {p.serviceType}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Hours This Week" value={`${weekHours}h`} subtitle="tracked across all projects" icon={Clock} trend="+12h vs last week" trendDir="up" />
        <KPICard title="Pending Approvals" value={`${submitted.length}`} subtitle="entries awaiting review" icon={ClipboardCheck} trend="5 new today" trendDir="neutral" />
        <KPICard title="Active Projects" value={`${activeProjects.length}`} subtitle={`${atRiskProjects.length} at risk`} icon={FolderOpen} />
        <KPICard title="Active Freelancers" value={`${activeFreelancers.length}`} subtitle="across all projects" icon={Users} />
      </div>

      {/* KPI Row 2 - Financial */}
      {role === "owner" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Approved Costs" value={formatCurrency(approvedCost)} subtitle="this month" icon={CheckCircle2} accent="bg-emerald-50" trend="+£2,400 vs last month" trendDir="up" />
          <KPICard title="Paid Costs" value={formatCurrency(paidCost)} subtitle="settled invoices" icon={CreditCard} accent="bg-purple-50" />
          <KPICard title="Outstanding" value={formatCurrency(approvedCost - paidCost)} subtitle="approved but unpaid" icon={DollarSign} accent="bg-amber-50" />
          <KPICard title="Avg Budget Usage" value={`${Math.round(PROJECTS.filter(p => p.status === "active").reduce((s, p) => s + budgetPct(p), 0) / PROJECTS.filter(p => p.status === "active").length)}%`} subtitle="across active projects" icon={TrendingUp} accent="bg-blue-50" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e2e8f0] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0f172a]">Pending Approvals</h3>
            <span className="text-xs text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded-full">{submitted.length} entries</span>
          </div>
          <div className="space-y-2">
            {submitted.map(entry => {
              const freelancer = getFreelancer(entry.freelancerId);
              const project = getProject(entry.projectId);
              return (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f8fafc] transition-colors">
                  <Avatar initials={freelancer?.avatar || "??"} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0f172a] truncate">{freelancer?.name}</p>
                    <p className="text-xs text-[#64748b] truncate">{project?.name} · {entry.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono font-semibold text-[#0f172a]">{entry.hours}h</p>
                    <p className="text-xs text-[#64748b]">{entry.date}</p>
                  </div>
                  {role === "owner" && (
                    <div className="flex gap-1.5 shrink-0">
                      <button className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center transition-colors">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                      <button className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                        <X className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Budget Alerts */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Budget Alerts</h3>
          <div className="space-y-4">
            {atRiskProjects.map(p => {
              const pct = budgetPct(p);
              const over = pct >= 100;
              return (
                <div key={p.id} className={`p-3 rounded-lg border ${over ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${over ? "text-red-500" : "text-amber-500"}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${over ? "text-red-700" : "text-amber-700"}`}>{p.name}</p>
                      <p className={`text-xs ${over ? "text-red-600" : "text-amber-600"}`}>{p.clientName}</p>
                    </div>
                  </div>
                  <BudgetBar pct={pct} size="sm" />
                  <p className={`text-xs mt-1 font-medium ${over ? "text-red-600" : "text-amber-600"}`}>
                    {pct}% used · {over ? "Over budget" : "At risk"}
                  </p>
                </div>
              );
            })}
            {atRiskProjects.length === 0 && (
              <p className="text-sm text-[#64748b] text-center py-4">All projects within budget</p>
            )}
          </div>
        </div>
      </div>

      {/* Who's Away */}
      {role !== "freelancer" && (() => {
        const awayToday = FREELANCERS.filter(f => isOnLeaveToday(f.id));
        const awaySoon = FREELANCERS.filter(f => !isOnLeaveToday(f.id) && isOnLeaveSoon(f.id));
        const pendingRequests = TIME_OFF_ENTRIES.filter(e => e.status === "pending");
        if (awayToday.length === 0 && awaySoon.length === 0 && pendingRequests.length === 0) return null;
        return (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-4 h-4 text-[#1d3461]" />
              <h3 className="text-sm font-semibold text-[#0f172a]">Team Availability</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2">Out Today</p>
                {awayToday.length === 0 ? (
                  <p className="text-xs text-[#94a3b8]">Everyone is in</p>
                ) : (
                  <div className="space-y-2">
                    {awayToday.map(f => {
                      const entry = isOnLeaveToday(f.id)!;
                      return (
                        <div key={f.id} className="flex items-center gap-2">
                          <Avatar initials={f.avatar} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#0f172a]">{f.name}</p>
                            <p className={`text-xs ${entry.type === "sick" ? "text-red-500" : "text-blue-500"}`}>
                              {entry.type === "sick" ? "Sick leave" : `Vacation · back ${entry.endDate.slice(5).replace("-", "/")}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2">Away This Week</p>
                {awaySoon.length === 0 ? (
                  <p className="text-xs text-[#94a3b8]">No upcoming absences</p>
                ) : (
                  <div className="space-y-2">
                    {awaySoon.map(f => {
                      const entry = isOnLeaveSoon(f.id)!;
                      return (
                        <div key={f.id} className="flex items-center gap-2">
                          <Avatar initials={f.avatar} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#0f172a]">{f.name}</p>
                            <p className="text-xs text-amber-600">
                              {entry.type === "vacation" ? <><Plane className="w-3 h-3 inline mr-1" /></> : null}
                              From {entry.startDate.slice(5).replace("-", "/")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {role === "owner" && (
                <div>
                  <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-2">Pending Requests</p>
                  {pendingRequests.length === 0 ? (
                    <p className="text-xs text-[#94a3b8]">No pending requests</p>
                  ) : (
                    <div className="space-y-2">
                      {pendingRequests.map(e => {
                        const f = getFreelancer(e.freelancerId);
                        return (
                          <div key={e.id} className="flex items-center gap-2">
                            <Avatar initials={f?.avatar || "??"} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-[#0f172a]">{f?.name}</p>
                              <p className="text-xs text-[#64748b]">{e.startDate.slice(5).replace("-", "/")} – {e.endDate.slice(5).replace("-", "/")}</p>
                            </div>
                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Pending</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Weekly Chart */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
        <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Weekly Hours & Cost</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart id="weekly-hours-chart" data={WEEKLY_CHART_DATA} barSize={28}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis key="x" dataKey="week" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis key="y" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip key="tip" contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} cursor={{ fill: "#f8fafc" }} />
              <Bar key="hours" dataKey="hours" fill="#2563eb" radius={[4, 4, 0, 0]} name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── TIME REGISTER VIEW ───────────────────────────────────────────────────────

function TimeRegisterView({ role, userId = "", onSaved }: { role: Role; userId?: string; onSaved?: () => void }) {
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const myProjects = role === "freelancer"
    ? PROJECTS.filter(p => p.assignedFreelancers.includes(userId))
    : PROJECTS;
  const defaultProject = myProjects[0]?.id ?? "";
  const [timerProject, setTimerProject] = useState(defaultProject);
  const [timerDesc, setTimerDesc] = useState("");
  const [manualDate, setManualDate] = useState(TODAY);
  const [manualProject, setManualProject] = useState(defaultProject);
  const [manualDesc, setManualDesc] = useState("");
  const [manualStart, setManualStart] = useState("09:00");
  const [manualEnd, setManualEnd] = useState("13:00");
  const [manualHours, setManualHours] = useState("");
  const [manualMode, setManualMode] = useState<"time" | "hours">("time");
  const [entries, setEntries] = useState<TimeEntry[]>(TIME_ENTRIES);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [toast, setToast] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function stopTimer() {
    setTimerRunning(false);
    const h = parseFloat((timerSeconds / 3600).toFixed(2));
    if (h > 0 && timerDesc) {
      const today = new Date().toISOString().slice(0, 10);
      const rate = FREELANCERS.find(f => f.id === userId)?.hourlyRate ?? 0;
      const optimistic: TimeEntry = {
        id: `t${Date.now()}`, freelancerId: userId, projectId: timerProject,
        date: today, startTime: "", endTime: "",
        hours: h, description: timerDesc, status: "draft", amount: parseFloat((h * rate).toFixed(2)),
      };
      setEntries(prev => [optimistic, ...prev]);
      showToast("Time entry saved as draft");
      const { data } = await supabase.from("time_entries").insert({
        user_id: userId, project_id: timerProject, date: today,
        hours: h, description: timerDesc, status: "draft",
        amount: parseFloat((h * rate).toFixed(2)),
      }).select().single();
      if (data) {
        setEntries(prev => prev.map(e => e.id === optimistic.id ? { ...e, id: data.id } : e));
        onSaved?.();
      }
    }
    setTimerSeconds(0);
    setTimerDesc("");
  }

  async function submitManual() {
    const hours = manualMode === "time"
      ? (() => { const [sh, sm] = manualStart.split(":").map(Number); const [eh, em] = manualEnd.split(":").map(Number); return (eh * 60 + em - sh * 60 - sm) / 60; })()
      : parseFloat(manualHours);
    if (!hours || hours <= 0 || !manualDesc) { showToast("Please fill in all fields"); return; }
    const rate = FREELANCERS.find(f => f.id === userId)?.hourlyRate ?? 0;
    const amount = parseFloat((hours * rate).toFixed(2));
    const optimistic: TimeEntry = {
      id: `t${Date.now()}`, freelancerId: userId, projectId: manualProject,
      date: manualDate, startTime: manualStart, endTime: manualEnd,
      hours, description: manualDesc, status: "draft", amount,
    };
    setEntries(prev => [optimistic, ...prev]);
    setManualDesc("");
    showToast("Manual entry added as draft");
    const { data } = await supabase.from("time_entries").insert({
      user_id: userId, project_id: manualProject, date: manualDate,
      start_time: manualMode === "time" ? manualStart : null,
      end_time: manualMode === "time" ? manualEnd : null,
      hours, description: manualDesc, status: "draft", amount,
    }).select().single();
    if (data) {
      setEntries(prev => prev.map(e => e.id === optimistic.id ? { ...e, id: data.id } : e));
      onSaved?.();
    }
  }

  async function submitEntry(id: string) {
    const now = new Date().toISOString();
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status: "submitted", submittedAt: now.slice(0,10) } : e));
    showToast("Entry submitted for approval");
    await supabase.from("time_entries").update({ status: "submitted", submitted_at: now }).eq("id", id);
  }

  const displayEntries = entries
    .filter(e => role === "freelancer" ? e.freelancerId === userId : true)
    .filter(e => filterStatus === "all" ? true : e.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Guidelines reminder */}
      <div className="bg-[#f0f7ff] border border-[#bfdbfe] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-[#1d3461]">Time Registration Guidelines</p>
            <ul className="text-xs text-[#3b5fa0] space-y-0.5 list-none">
              <li>• Register your hours <strong>daily</strong>, no later than the end of each working week.</li>
              <li>• Always book to the project that <strong>best matches</strong> the work performed.</li>
              <li>• Add a <strong>short description</strong> of the activities completed — e.g. "Prepared workshop for Genovum".</li>
              <li>• Register <strong>all</strong> hours worked, even if not billable.</li>
              <li>• Client meetings → book under the relevant client project (KL-xxx).</li>
              <li>• <strong>CX-001</strong> requires prior approval from Carmen before it can be invoiced. ⚠️</li>
              <li>• If in doubt, register the hours and align with Carmen.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Timer and Manual Entry side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Live Timer */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Timer className="w-4 h-4 text-[#2563eb]" />
            </div>
            <h3 className="text-sm font-semibold text-[#0f172a]">Live Timer</h3>
            {timerRunning && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Recording
              </span>
            )}
          </div>

          <div className="text-center mb-6">
            <span className="text-5xl font-mono font-bold text-[#0f172a] tabular-nums tracking-tight">
              {formatDuration(timerSeconds)}
            </span>
          </div>

          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Project</label>
              <select
                value={timerProject}
                onChange={e => setTimerProject(e.target.value)}
                disabled={timerRunning}
                className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] disabled:opacity-60"
              >
                {(Object.keys(CATEGORY_CONFIG) as ProjectCategory[]).map(cat => {
                  const group = myProjects.filter(p => p.category === cat);
                  if (!group.length) return null;
                  return (
                    <optgroup key={cat} label={CATEGORY_CONFIG[cat].label}>
                      {group.map(p => (
                        <option key={p.id} value={p.id}>{p.code} — {p.name}{p.requiresApproval ? " ⚠️" : ""}</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Description</label>
              <input
                value={timerDesc}
                onChange={e => setTimerDesc(e.target.value)}
                placeholder="What are you working on?"
                className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] placeholder:text-[#94a3b8]"
              />
            </div>
          </div>

          <button
            onClick={() => timerRunning ? stopTimer() : setTimerRunning(true)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors ${
              timerRunning
                ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                : "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
            }`}
          >
            {timerRunning ? <><Square className="w-4 h-4" /> Stop Timer</> : <><Play className="w-4 h-4" /> Start Timer</>}
          </button>
        </div>

        {/* Manual Entry */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Edit2 className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-semibold text-[#0f172a]">Manual Entry</h3>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Date</label>
                <input
                  type="date" value={manualDate} onChange={e => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Project</label>
                <select
                  value={manualProject} onChange={e => setManualProject(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                >
                  {(Object.keys(CATEGORY_CONFIG) as ProjectCategory[]).map(cat => {
                    const group = myProjects.filter(p => p.category === cat);
                    if (!group.length) return null;
                    return (
                      <optgroup key={cat} label={CATEGORY_CONFIG[cat].label}>
                        {group.map(p => (
                          <option key={p.id} value={p.id}>{p.code} — {p.name}{p.requiresApproval ? " ⚠️" : ""}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Description</label>
              <input
                value={manualDesc} onChange={e => setManualDesc(e.target.value)}
                placeholder="Describe the work completed"
                className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] placeholder:text-[#94a3b8]"
              />
            </div>

            {/* Time entry mode toggle */}
            <div className="flex rounded-lg border border-[#e2e8f0] overflow-hidden">
              <button
                onClick={() => setManualMode("time")}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${manualMode === "time" ? "bg-[#1d3461] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}
              >
                Start &amp; End Time
              </button>
              <button
                onClick={() => setManualMode("hours")}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${manualMode === "hours" ? "bg-[#1d3461] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}
              >
                Total Hours
              </button>
            </div>

            {manualMode === "time" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Start Time</label>
                  <input type="time" value={manualStart} onChange={e => setManualStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">End Time</label>
                  <input type="time" value={manualEnd} onChange={e => setManualEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Total Hours</label>
                <input
                  type="number" min="0.25" max="24" step="0.25" value={manualHours}
                  onChange={e => setManualHours(e.target.value)}
                  placeholder="e.g. 3.5"
                  className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] placeholder:text-[#94a3b8]"
                />
              </div>
            )}

            <button
              onClick={submitManual}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1d3461] text-white rounded-lg font-medium text-sm hover:bg-[#162d56] transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Entry
            </button>
          </div>
        </div>
      </div>

      {/* Entries Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0]">
        <div className="p-5 border-b border-[#f1f5f9] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0f172a]">
            {role === "freelancer" ? "My Time Entries" : "All Time Entries"}
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#f1f5f9]">
                <th className="text-left text-xs font-medium text-[#64748b] px-5 py-3">Date</th>
                {role !== "freelancer" && <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Freelancer</th>}
                <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Project</th>
                <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Description</th>
                <th className="text-right text-xs font-medium text-[#64748b] px-3 py-3">Hours</th>
                <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Status</th>
                <th className="text-right text-xs font-medium text-[#64748b] px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f8fafc]">
              {displayEntries.map(entry => {
                const freelancer = getFreelancer(entry.freelancerId);
                const project = getProject(entry.projectId);
                return (
                  <tr key={entry.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-5 py-3 text-sm font-mono text-[#0f172a] whitespace-nowrap">{entry.date}</td>
                    {role !== "freelancer" && (
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar initials={freelancer?.avatar || "??"} size="sm" />
                          <span className="text-sm text-[#0f172a] whitespace-nowrap">{freelancer?.name}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <span className="text-sm text-[#0f172a] max-w-[160px] truncate block">{project?.name}</span>
                      <span className="text-xs text-[#64748b]">{project?.clientName}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-sm text-[#64748b] max-w-[200px] truncate block">{entry.description}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-mono font-semibold text-[#0f172a]">{entry.hours}h</span>
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={entry.status} /></td>
                    <td className="px-5 py-3 text-right">
                      {entry.status === "draft" && (
                        <button
                          onClick={() => submitEntry(entry.id)}
                          className="text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8] flex items-center gap-1 ml-auto"
                        >
                          <Send className="w-3 h-3" /> Submit
                        </button>
                      )}
                      {entry.status === "approved" && <Lock className="w-3.5 h-3.5 text-[#94a3b8] ml-auto" />}
                    </td>
                  </tr>
                );
              })}
              {displayEntries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-[#64748b]">No entries found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0f172a] text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── APPROVALS VIEW ───────────────────────────────────────────────────────────

function ApprovalsView({ role, onSaved }: { role: Role; onSaved?: () => void }) {
  const [entries, setEntries] = useState<TimeEntry[]>(TIME_ENTRIES);
  const [filter, setFilter] = useState<string>("submitted");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function approve(id: string) {
    const now = new Date().toISOString();
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status: "approved", approvedAt: now.slice(0,10) } : e));
    showToast("Entry approved");
    await supabase.from("time_entries").update({ status: "approved", approved_at: now }).eq("id", id);
    onSaved?.();
  }

  async function reject(id: string) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status: "rejected" } : e));
    showToast("Entry rejected");
    await supabase.from("time_entries").update({ status: "rejected" }).eq("id", id);
    onSaved?.();
  }

  const statuses: Array<{ key: string; label: string }> = [
    { key: "submitted", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "paid", label: "Paid" },
    { key: "all", label: "All" },
  ];

  const counts: Record<string, number> = {
    submitted: entries.filter(e => e.status === "submitted").length,
    approved: entries.filter(e => e.status === "approved").length,
    rejected: entries.filter(e => e.status === "rejected").length,
    paid: entries.filter(e => e.status === "paid").length,
    all: entries.length,
  };

  const displayEntries = filter === "all" ? entries : entries.filter(e => e.status === filter);
  const totalHours = displayEntries.reduce((s, e) => s + e.hours, 0);
  const totalAmount = displayEntries.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Status Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e2e8f0] p-1 w-fit">
        {statuses.map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s.key ? "bg-[#1d3461] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"
            }`}
          >
            {s.label}
            {counts[s.key] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${filter === s.key ? "bg-white/20 text-white" : "bg-[#f1f5f9] text-[#64748b]"}`}>
                {counts[s.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-4 text-sm text-[#64748b]">
        <span>{displayEntries.length} entries</span>
        <span className="text-[#e2e8f0]">·</span>
        <span className="font-mono">{totalHours}h total</span>
        {role === "owner" && (
          <>
            <span className="text-[#e2e8f0]">·</span>
            <span className="font-mono font-semibold text-[#0f172a]">{formatCurrency(totalAmount)}</span>
          </>
        )}
        {role === "owner" && filter === "submitted" && displayEntries.length > 0 && (
          <button
            onClick={() => displayEntries.forEach(e => approve(e.id))}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> Approve All
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#f1f5f9]">
                <th className="text-left text-xs font-medium text-[#64748b] px-5 py-3">Freelancer</th>
                <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Project</th>
                <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Description</th>
                <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Date</th>
                <th className="text-right text-xs font-medium text-[#64748b] px-3 py-3">Hours</th>
                {role === "owner" && <th className="text-right text-xs font-medium text-[#64748b] px-3 py-3">Amount</th>}
                <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Status</th>
                {role === "owner" && <th className="text-right text-xs font-medium text-[#64748b] px-5 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f8fafc]">
              {displayEntries.map(entry => {
                const freelancer = getFreelancer(entry.freelancerId);
                const project = getProject(entry.projectId);
                return (
                  <tr key={entry.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={freelancer?.avatar || "??"} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-[#0f172a]">{freelancer?.name}</p>
                          <p className="text-xs text-[#64748b]">{freelancer?.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm text-[#0f172a]">{project?.clientName}</p>
                      <p className="text-xs text-[#64748b] max-w-[150px] truncate">{project?.name}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm text-[#64748b] max-w-[200px] truncate">{entry.description}</p>
                    </td>
                    <td className="px-3 py-3 text-sm font-mono text-[#64748b] whitespace-nowrap">{entry.date}</td>
                    <td className="px-3 py-3 text-right text-sm font-mono font-semibold text-[#0f172a]">{entry.hours}h</td>
                    {role === "owner" && (
                      <td className="px-3 py-3 text-right text-sm font-mono font-semibold text-[#0f172a]">
                        {formatCurrency(entry.amount || 0)}
                      </td>
                    )}
                    <td className="px-3 py-3"><StatusBadge status={entry.status} /></td>
                    {role === "owner" && (
                      <td className="px-5 py-3 text-right">
                        {entry.status === "submitted" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => approve(entry.id)} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200">
                              <Check className="w-3 h-3" /> Approve
                            </button>
                            <button onClick={() => reject(entry.id)} className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors border border-red-200">
                              <X className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        )}
                        {entry.status === "approved" && (
                          <span className="text-xs text-[#64748b]">by {entry.approvedBy}</span>
                        )}
                        {entry.status === "paid" && (
                          <Lock className="w-3.5 h-3.5 text-[#94a3b8] ml-auto" />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {displayEntries.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[#64748b]">No entries with this status</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0f172a] text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
        </div>
      )}
    </div>
  );
}

// ─── PROJECTS VIEW ────────────────────────────────────────────────────────────

function ProjectsView({ role }: { role: Role }) {
  const [selected, setSelected] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const projects = role === "freelancer"
    ? PROJECTS.filter(p => p.assignedFreelancers.includes("f1"))
    : PROJECTS;

  const filtered = projects.filter(p =>
    (statusFilter === "all" || p.status === statusFilter) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.clientName.toLowerCase().includes(search.toLowerCase()))
  );

  if (selected) {
    const pct = budgetPct(selected);
    const assignedFl = FREELANCERS.filter(f => selected.assignedFreelancers.includes(f.id));
    const projectEntries = TIME_ENTRIES.filter(e => e.projectId === selected.id);
    return (
      <div className="space-y-5">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#0f172a] transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Projects
        </button>

        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-[#64748b] uppercase tracking-wide">{selected.clientName}</span>
                <ProjectStatusBadge status={selected.status} />
                {selected.billable ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <DollarSign className="w-2.5 h-2.5" /> Billable
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                    Internal
                  </span>
                )}
              </div>
              <h2 className="text-xl font-semibold text-[#0f172a]">{selected.name}</h2>
              <p className="text-sm text-[#64748b] mt-1">{selected.description}</p>
            </div>
            <span className="text-xs text-[#64748b] bg-[#f1f5f9] px-3 py-1 rounded-full border border-[#e2e8f0]">
              {selected.serviceType}
            </span>
          </div>

          {role === "owner" && selected.billable && selected.budget != null && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <div className="bg-[#f8fafc] rounded-lg p-3">
                <p className="text-xs text-[#64748b] mb-1">Budget</p>
                <p className="text-base font-semibold font-mono text-[#0f172a]">{formatCurrency(selected.budget)}</p>
              </div>
              <div className="bg-[#f8fafc] rounded-lg p-3">
                <p className="text-xs text-[#64748b] mb-1">Approved Cost</p>
                <p className="text-base font-semibold font-mono text-emerald-700">{formatCurrency(selected.approvedCost)}</p>
              </div>
              <div className="bg-[#f8fafc] rounded-lg p-3">
                <p className="text-xs text-[#64748b] mb-1">Forecast Cost</p>
                <p className="text-base font-semibold font-mono text-amber-700">{formatCurrency(selected.forecastCost)}</p>
              </div>
              <div className={`rounded-lg p-3 ${pct >= 100 ? "bg-red-50" : pct >= 80 ? "bg-amber-50" : "bg-[#f8fafc]"}`}>
                <p className="text-xs text-[#64748b] mb-1">Remaining</p>
                <p className={`text-base font-semibold font-mono ${pct >= 100 ? "text-red-700" : pct >= 80 ? "text-amber-700" : "text-[#0f172a]"}`}>
                  {formatCurrency(selected.budget - selected.forecastCost)}
                </p>
              </div>
            </div>
          )}

          {role === "owner" && !selected.billable && (
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg mb-5">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <p className="text-sm text-slate-600">Internal project — hours are tracked but not billed to a client. No budget applies.</p>
            </div>
          )}

          {role === "owner" && selected.billable && selected.budget != null && (
            <div className="mb-5">
              <div className="flex items-center justify-between text-xs text-[#64748b] mb-2">
                <span>Budget Usage</span>
                <span className={`font-semibold ${pct >= 100 ? "text-red-600" : pct >= 80 ? "text-amber-600" : "text-emerald-600"}`}>{pct}%</span>
              </div>
              <BudgetBar pct={pct} />
              {pct >= 80 && (
                <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium ${pct >= 100 ? "text-red-600" : "text-amber-600"}`}>
                  <AlertTriangle className="w-3 h-3" />
                  {pct >= 100 ? "Over budget" : "Budget at risk"}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <h4 className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-3">Assigned Team</h4>
              <div className="space-y-2">
                {assignedFl.map(f => (
                  <div key={f.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#f8fafc]">
                    <Avatar initials={f.avatar} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0f172a]">{f.name}</p>
                      <p className="text-xs text-[#64748b]">{f.role}</p>
                    </div>
                    {role === "owner" && (
                      <span className="text-xs font-mono font-semibold text-[#64748b]">{formatCurrency(f.hourlyRate)}/h</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-3">Recent Time Entries</h4>
              <div className="space-y-2">
                {projectEntries.slice(0, 4).map(e => {
                  const fl = getFreelancer(e.freelancerId);
                  return (
                    <div key={e.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#f8fafc]">
                      <Avatar initials={fl?.avatar || "??"} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#0f172a] truncate">{e.description}</p>
                        <p className="text-xs text-[#64748b]">{fl?.name} · {e.date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-mono font-semibold text-[#0f172a]">{e.hours}h</p>
                        <StatusBadge status={e.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] placeholder:text-[#94a3b8]"
          />
        </div>
        <select
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="text-sm px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="at-risk">At Risk</option>
          <option value="on-hold">On Hold</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(p => {
          const pct = budgetPct(p);
          const assignedFl = FREELANCERS.filter(f => p.assignedFreelancers.includes(f.id));
          return (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              className="bg-white rounded-xl border border-[#e2e8f0] p-5 cursor-pointer hover:border-[#2563eb]/40 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold font-mono text-[#64748b] bg-[#f1f5f9] px-1.5 py-0.5 rounded">{p.code}</span>
                    <span className="text-xs text-[#64748b]">{p.clientName}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#0f172a] group-hover:text-[#2563eb] transition-colors">{p.name}</h3>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <ProjectStatusBadge status={p.status} />
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_CONFIG[p.category].color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY_CONFIG[p.category].dot}`} />
                  {CATEGORY_CONFIG[p.category].label}
                </span>
                {p.requiresApproval && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    ⚠️ Prior approval required
                  </span>
                )}
              </div>

              {role === "owner" && p.billable && p.budget != null && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[#64748b]">Budget: {formatCurrency(p.budget)}</span>
                    <span className={`font-semibold ${pct >= 100 ? "text-red-600" : pct >= 80 ? "text-amber-600" : "text-emerald-600"}`}>{pct}%</span>
                  </div>
                  <BudgetBar pct={pct} size="sm" />
                  <div className="flex justify-between text-xs text-[#94a3b8] mt-1">
                    <span>Approved: {formatCurrency(p.approvedCost)}</span>
                    <span>Forecast: {formatCurrency(p.forecastCost)}</span>
                  </div>
                </div>
              )}
              {role === "owner" && !p.billable && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-500">Internal project · hours tracked, no billing</p>
                  {p.approvedCost > 0 && <p className="text-xs text-slate-500 mt-0.5">Cost so far: {formatCurrency(p.approvedCost)}</p>}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex -space-x-1.5">
                  {assignedFl.slice(0, 4).map(f => (
                    <Avatar key={f.id} initials={f.avatar} size="sm" />
                  ))}
                  {assignedFl.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-[#f1f5f9] border-2 border-white flex items-center justify-center text-[10px] font-semibold text-[#64748b]">
                      +{assignedFl.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-xs text-[#94a3b8]">{p.startDate} – {p.endDate}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FREELANCERS VIEW ─────────────────────────────────────────────────────────

function FreelancersView({ role }: { role: Role }) {
  const [showRates, setShowRates] = useState(role === "owner");
  const [expandedBank, setExpandedBank] = useState<string | null>(null);
  const [bankData, setBankData] = useState<Record<string, BankAccount | undefined>>(
    Object.fromEntries(FREELANCERS.map(f => [f.id, f.bankAccount]))
  );
  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#64748b]">{FREELANCERS.length} freelancers</span>
          {role === "owner" && (
            <span className="text-sm text-[#64748b]">·
              <span className="text-amber-600 font-medium ml-1">
                {FREELANCERS.filter(f => !bankData[f.id]?.accountNumber).length} missing bank details
              </span>
            </span>
          )}
        </div>
        {role === "owner" && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRates(r => !r)}
              className="flex items-center gap-1.5 text-xs font-medium text-[#64748b] hover:text-[#0f172a] transition-colors"
            >
              {showRates ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showRates ? "Hide Rates" : "Show Rates"}
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1d3461] text-white text-xs font-medium rounded-lg hover:bg-[#162d56] transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Freelancer
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f1f5f9]">
              <th className="text-left text-xs font-medium text-[#64748b] px-5 py-3">Freelancer</th>
              <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Role</th>
              <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Status</th>
              {role === "owner" && <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Bank Details</th>}
              {showRates && <th className="text-right text-xs font-medium text-[#64748b] px-3 py-3">Rate</th>}
              <th className="text-right text-xs font-medium text-[#64748b] px-3 py-3">Total Hours</th>
              <th className="text-right text-xs font-medium text-[#64748b] px-3 py-3">Pending</th>
              {role === "owner" && <th className="text-right text-xs font-medium text-[#64748b] px-5 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {FREELANCERS.map(f => {
              const bank = bankData[f.id];
              const hasBank = !!(bank?.accountNumber && bank?.sortCode);
              const isExpanded = expandedBank === f.id;
              return (
                <React.Fragment key={f.id}>
                  <tr className={`border-b ${isExpanded ? "border-[#e2e8f0] bg-[#f8fafc]" : "border-[#f8fafc] hover:bg-[#f8fafc]"} transition-colors`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar initials={f.avatar} />
                        <div>
                          <p className="text-sm font-medium text-[#0f172a]">{f.name}</p>
                          <p className="text-xs text-[#64748b]">{f.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <span className="text-sm text-[#0f172a]">{f.role}</span>
                    </td>
                    <td className="px-3 py-4">
                      {(() => {
                        const onLeave = isOnLeaveToday(f.id);
                        const soon = isOnLeaveSoon(f.id);
                        if (onLeave) return (
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border ${onLeave.type === "sick" ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                            {onLeave.type === "sick" ? <HeartPulse className="w-3 h-3" /> : <Plane className="w-3 h-3" />}
                            {onLeave.type === "sick" ? "Sick leave" : "On vacation"}
                          </span>
                        );
                        if (soon) return (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                            <CalendarDays className="w-3 h-3" /> Off from {soon.startDate.slice(5).replace("-", "/")}
                          </span>
                        );
                        return (
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border ${f.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${f.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {f.status === "active" ? "Available" : "Inactive"}
                          </span>
                        );
                      })()}
                    </td>
                    {role === "owner" && (
                      <td className="px-3 py-4">
                        {hasBank ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> On file
                            </span>
                            <span className="text-xs font-mono text-[#64748b]">{bank.bankName}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Missing
                          </span>
                        )}
                      </td>
                    )}
                    {showRates && (
                      <td className="px-3 py-4 text-right">
                        <span className="text-sm font-mono font-semibold text-[#0f172a]">{formatCurrency(f.hourlyRate)}/h</span>
                      </td>
                    )}
                    <td className="px-3 py-4 text-right text-sm font-mono font-semibold text-[#0f172a]">{f.totalHours}h</td>
                    <td className="px-3 py-4 text-right">
                      {f.pendingHours > 0 ? (
                        <span className="text-sm font-mono text-amber-600 font-semibold">{f.pendingHours}h</span>
                      ) : (
                        <span className="text-sm font-mono text-[#94a3b8]">—</span>
                      )}
                    </td>
                    {role === "owner" && (
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setExpandedBank(isExpanded ? null : f.id)}
                          className="text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8] flex items-center gap-1 ml-auto transition-colors"
                        >
                          <Landmark className="w-3 h-3" />
                          {isExpanded ? "Close" : hasBank ? "View" : "Add"} Bank
                        </button>
                      </td>
                    )}
                  </tr>
                  {isExpanded && role === "owner" && (
                    <tr key={`${f.id}-bank`} className="border-b border-[#e2e8f0]">
                      <td colSpan={8} className="px-8 py-5 bg-[#f8fafc]">
                        <div className="max-w-2xl">
                          <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide mb-4">
                            Bank Details — {f.name}
                          </p>
                          {hasBank ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                              {[
                                { label: "Account Holder", value: bank.accountHolder },
                                { label: "Bank", value: bank.bankName },
                                { label: "Sort Code", value: bank.sortCode, mono: true },
                                { label: "Account Number", value: "••••" + bank.accountNumber.slice(-4), mono: true },
                                ...(bank.iban ? [{ label: "IBAN", value: bank.iban, mono: true }] : []),
                                ...(bank.paymentRef ? [{ label: "Payment Ref", value: bank.paymentRef }] : []),
                              ].map(d => (
                                <div key={d.label} className="bg-white rounded-lg border border-[#e2e8f0] px-3 py-2.5">
                                  <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">{d.label}</p>
                                  <p className={`text-sm font-medium text-[#0f172a] ${d.mono ? "font-mono" : ""}`}>{d.value}</p>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          <BankAccountForm
                            compact
                            initial={bank}
                            onSave={b => {
                              setBankData(prev => ({ ...prev, [f.id]: b }));
                              showToast(`Bank details saved for ${f.name}`);
                              setExpandedBank(null);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0f172a] text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
        </div>
      )}
    </div>
  );
}

// ─── REPORTS VIEW ─────────────────────────────────────────────────────────────

function ReportsView({ role }: { role: Role }) {
  const [reportType, setReportType] = useState<"hours" | "budget" | "payment">("hours");
  const [dateRange, setDateRange] = useState("this-month");

  const hoursData = FREELANCERS.map(f => ({
    name: f.name.split(" ")[0],
    hours: f.totalHours,
    pending: f.pendingHours,
  }));

  const projectBudgetData = PROJECTS.map(p => ({
    name: p.clientName,
    budget: p.budget,
    approved: p.approvedCost,
    forecast: p.forecastCost,
  }));

  return (
    <div className="space-y-5">
      {/* Report Type Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e2e8f0] p-1 w-fit">
        {[
          { key: "hours", label: "Hours Report" },
          { key: "budget", label: "Budget Report" },
          { key: "payment", label: "Payment Report" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setReportType(t.key as typeof reportType)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${reportType === t.key ? "bg-[#1d3461] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={dateRange} onChange={e => setDateRange(e.target.value)}
          className="text-sm px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg focus:outline-none"
        >
          <option value="this-week">This Week</option>
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
          <option value="this-quarter">This Quarter</option>
          <option value="custom">Custom Range</option>
        </select>
        <select className="text-sm px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg focus:outline-none">
          <option value="">All Projects</option>
          {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {role !== "freelancer" && (
          <select className="text-sm px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg focus:outline-none">
            <option value="">All Freelancers</option>
            {FREELANCERS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
        <button className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-[#1d3461] text-white text-sm font-medium rounded-lg hover:bg-[#162d56] transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {reportType === "hours" && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
            <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Hours by Freelancer</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart id="freelancer-hours-chart" data={hoursData} barSize={32}>
                  <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis key="x" dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis key="y" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip key="tip" contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} cursor={{ fill: "#f8fafc" }} />
                  <Bar key="hours" dataKey="hours" fill="#1d3461" radius={[4, 4, 0, 0]} name="Approved Hours" />
                  <Bar key="pending" dataKey="pending" fill="#93c5fd" radius={[4, 4, 0, 0]} name="Pending Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
            <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Monthly Trends</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart id="monthly-trend-chart" data={MONTHLY_CHART_DATA}>
                  <defs key="defs">
                    <linearGradient id="esteem-grad-approved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis key="x" dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis key="y" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip key="tip" contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} />
                  <Area key="approved" type="monotone" dataKey="approved" stroke="#2563eb" strokeWidth={2} fill="url(#esteem-grad-approved)" name="Approved (£)" />
                  <Area key="paid" type="monotone" dataKey="paid" stroke="#059669" strokeWidth={2} fill="none" name="Paid (£)" strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0]">
            <div className="p-5 border-b border-[#f1f5f9]">
              <h3 className="text-sm font-semibold text-[#0f172a]">Detailed Hours Summary</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f1f5f9]">
                  <th className="text-left text-xs font-medium text-[#64748b] px-5 py-3">Freelancer</th>
                  <th className="text-right text-xs font-medium text-[#64748b] px-3 py-3">Total Hours</th>
                  <th className="text-right text-xs font-medium text-[#64748b] px-3 py-3">Approved</th>
                  <th className="text-right text-xs font-medium text-[#64748b] px-3 py-3">Pending</th>
                  {role === "owner" && <th className="text-right text-xs font-medium text-[#64748b] px-5 py-3">Approved Value</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f8fafc]">
                {FREELANCERS.map(f => {
                  const fEntries = TIME_ENTRIES.filter(e => e.freelancerId === f.id);
                  const approvedH = fEntries.filter(e => e.status === "approved" || e.status === "paid").reduce((s, e) => s + e.hours, 0);
                  const pendingH = fEntries.filter(e => e.status === "submitted").reduce((s, e) => s + e.hours, 0);
                  return (
                    <tr key={f.id} className="hover:bg-[#f8fafc]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar initials={f.avatar} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-[#0f172a]">{f.name}</p>
                            <p className="text-xs text-[#64748b]">{f.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-mono font-semibold text-[#0f172a]">{f.totalHours}h</td>
                      <td className="px-3 py-3 text-right text-sm font-mono text-emerald-700">{approvedH}h</td>
                      <td className="px-3 py-3 text-right text-sm font-mono text-amber-600">{pendingH}h</td>
                      {role === "owner" && (
                        <td className="px-5 py-3 text-right text-sm font-mono font-semibold text-[#0f172a]">
                          {formatCurrency(approvedH * f.hourlyRate)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === "budget" && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
            <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Budget vs Forecast by Project</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart id="budget-project-chart" data={projectBudgetData} layout="vertical" barSize={16}>
                  <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis key="x" type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `£${(v/1000).toFixed(0)}k`} />
                  <YAxis key="y" type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip key="tip" contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => formatCurrency(v)} />
                  <Bar key="budget" dataKey="budget" fill="#e0e7ff" radius={[0, 4, 4, 0]} name="Budget" />
                  <Bar key="forecast" dataKey="forecast" fill="#2563eb" radius={[0, 4, 4, 0]} name="Forecast" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0]">
            <div className="p-5 border-b border-[#f1f5f9]">
              <h3 className="text-sm font-semibold text-[#0f172a]">Project Budget Summary</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f1f5f9]">
                  <th className="text-left text-xs font-medium text-[#64748b] px-5 py-3">Project</th>
                  <th className="text-right text-xs font-medium text-[#64748b] px-3 py-3">Budget</th>
                  <th className="text-right text-xs font-medium text-[#64748b] px-3 py-3">Approved</th>
                  <th className="text-right text-xs font-medium text-[#64748b] px-3 py-3">Forecast</th>
                  <th className="text-right text-xs font-medium text-[#64748b] px-3 py-3">Remaining</th>
                  <th className="text-left text-xs font-medium text-[#64748b] px-5 py-3">Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f8fafc]">
                {PROJECTS.map(p => {
                  const pct = budgetPct(p);
                  return (
                    <tr key={p.id} className="hover:bg-[#f8fafc]">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-[#0f172a]">{p.name}</p>
                        <p className="text-xs text-[#64748b]">{p.clientName}</p>
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-mono font-semibold text-[#0f172a]">{formatCurrency(p.budget)}</td>
                      <td className="px-3 py-3 text-right text-sm font-mono text-emerald-700">{formatCurrency(p.approvedCost)}</td>
                      <td className="px-3 py-3 text-right text-sm font-mono text-amber-700">{formatCurrency(p.forecastCost)}</td>
                      <td className={`px-3 py-3 text-right text-sm font-mono font-semibold ${pct >= 100 ? "text-red-600" : "text-[#0f172a]"}`}>
                        {formatCurrency(p.budget - p.forecastCost)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20"><BudgetBar pct={pct} size="sm" /></div>
                          <span className={`text-xs font-semibold ${pct >= 100 ? "text-red-600" : pct >= 80 ? "text-amber-600" : "text-emerald-600"}`}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === "payment" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <KPICard title="Total Approved" value={formatCurrency(TIME_ENTRIES.filter(e => ["approved","paid"].includes(e.status)).reduce((s,e)=>s+(e.amount||0),0))} icon={CheckCircle2} accent="bg-emerald-50" />
            <KPICard title="Total Paid" value={formatCurrency(TIME_ENTRIES.filter(e => e.status === "paid").reduce((s,e)=>s+(e.amount||0),0))} icon={CreditCard} accent="bg-purple-50" />
            <KPICard title="Outstanding" value={formatCurrency(TIME_ENTRIES.filter(e => e.status === "approved").reduce((s,e)=>s+(e.amount||0),0))} icon={DollarSign} accent="bg-amber-50" />
          </div>
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
            <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Monthly Approved vs Paid</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart id="payment-monthly-chart" data={MONTHLY_CHART_DATA} barSize={24} barGap={4}>
                  <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis key="x" dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis key="y" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `£${(v/1000).toFixed(0)}k`} />
                  <Tooltip key="tip" contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => formatCurrency(v)} />
                  <Bar key="approved" dataKey="approved" fill="#1d3461" radius={[4, 4, 0, 0]} name="Approved" />
                  <Bar key="paid" dataKey="paid" fill="#059669" radius={[4, 4, 0, 0]} name="Paid" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAYMENTS VIEW ────────────────────────────────────────────────────────────

function PaymentsView({ role, onSaved }: { role: Role; onSaved?: () => void }) {
  const [entries, setEntries] = useState<TimeEntry[]>(TIME_ENTRIES);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }
  async function markPaid(id: string) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status: "paid" } : e));
    showToast("Entry marked as paid");
    await supabase.from("time_entries").update({ status: "paid" }).eq("id", id);
    onSaved?.();
  }

  const approvedEntries = entries.filter(e => e.status === "approved");
  const paidEntries = entries.filter(e => e.status === "paid");
  const approvedTotal = approvedEntries.reduce((s, e) => s + (e.amount || 0), 0);
  const paidTotal = paidEntries.reduce((s, e) => s + (e.amount || 0), 0);

  const byFreelancer = FREELANCERS.map(f => {
    const fApproved = approvedEntries.filter(e => e.freelancerId === f.id);
    const fPaid = paidEntries.filter(e => e.freelancerId === f.id);
    return {
      freelancer: f,
      approvedAmount: fApproved.reduce((s, e) => s + (e.amount || 0), 0),
      paidAmount: fPaid.reduce((s, e) => s + (e.amount || 0), 0),
      approvedEntries: fApproved,
    };
  }).filter(r => r.approvedAmount > 0 || r.paidAmount > 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KPICard title="Outstanding (Approved)" value={formatCurrency(approvedTotal)} subtitle="approved, awaiting payment" icon={DollarSign} accent="bg-amber-50" />
        <KPICard title="Total Paid" value={formatCurrency(paidTotal)} subtitle="settled this period" icon={CreditCard} accent="bg-emerald-50" />
        <KPICard title="Pending Entries" value={`${approvedEntries.length}`} subtitle="entries ready to pay" icon={ClipboardCheck} />
      </div>

      {/* Outstanding by Freelancer */}
      <div className="bg-white rounded-xl border border-[#e2e8f0]">
        <div className="p-5 border-b border-[#f1f5f9]">
          <h3 className="text-sm font-semibold text-[#0f172a]">Payments by Freelancer</h3>
        </div>
        <div className="divide-y divide-[#f8fafc]">
          {byFreelancer.map(({ freelancer: f, approvedAmount, paidAmount, approvedEntries: ae }) => (
            <div key={f.id} className="p-5">
              <div className="flex items-start justify-between mb-3 gap-4">
                <div className="flex items-center gap-3">
                  <Avatar initials={f.avatar} />
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">{f.name}</p>
                    <p className="text-xs text-[#64748b]">{f.role}</p>
                    {role === "owner" && (
                      <div className="mt-1.5">
                        {f.bankAccount?.accountNumber ? (
                          <div className="flex items-center gap-1.5">
                            <Landmark className="w-3 h-3 text-[#64748b]" />
                            <span className="text-xs font-mono text-[#64748b]">
                              {f.bankAccount.bankName} · {f.bankAccount.sortCode} · ••••{f.bankAccount.accountNumber.slice(-4)}
                            </span>
                            {f.bankAccount.paymentRef && (
                              <span className="text-xs text-[#94a3b8]">· Ref: {f.bankAccount.paymentRef}</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3 text-amber-500" />
                            <span className="text-xs text-amber-600 font-medium">No bank details — request from freelancer</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right shrink-0">
                  <div>
                    <p className="text-xs text-[#64748b]">Outstanding</p>
                    <p className="text-sm font-mono font-bold text-amber-700">{formatCurrency(approvedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748b]">Paid</p>
                    <p className="text-sm font-mono font-bold text-emerald-700">{formatCurrency(paidAmount)}</p>
                  </div>
                  {role === "owner" && ae.length > 0 && (
                    <button
                      onClick={() => ae.forEach(e => markPaid(e.id))}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Mark All Paid
                    </button>
                  )}
                </div>
              </div>
              {ae.length > 0 && (
                <div className="ml-11 space-y-1.5">
                  {ae.map(entry => {
                    const project = getProject(entry.projectId);
                    return (
                      <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg bg-[#f8fafc]">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#0f172a] truncate">{entry.description}</p>
                          <p className="text-xs text-[#64748b]">{project?.name} · {entry.date}</p>
                        </div>
                        <span className="text-xs font-mono font-semibold text-[#0f172a]">{entry.hours}h</span>
                        <span className="text-xs font-mono font-semibold text-amber-700">{formatCurrency(entry.amount || 0)}</span>
                        {role === "owner" && (
                          <button
                            onClick={() => markPaid(entry.id)}
                            className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {byFreelancer.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-[#64748b]">No outstanding payments</p>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0f172a] text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
        </div>
      )}
    </div>
  );
}

// ─── EXPORTS VIEW ─────────────────────────────────────────────────────────────

function ExportsView() {
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  const exports = [
    { label: "Weekly Time Report", description: "All time entries for the current week", icon: Calendar },
    { label: "Monthly Summary", description: "Consolidated hours and costs by month", icon: BarChart3 },
    { label: "Project Budget Report", description: "Budget usage and forecast by project", icon: FolderOpen },
    { label: "Freelancer Hours", description: "Hours breakdown per freelancer", icon: Users },
    { label: "Payment Report", description: "Approved, paid and outstanding amounts", icon: CreditCard },
    { label: "Full Time Register", description: "All entries with status and metadata", icon: Clock },
  ];

  return (
    <div className="space-y-6">
      {/* Export Cards */}
      <div>
        <SectionHeader title="Export Reports" subtitle="Download reports in your preferred format" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {exports.map(e => (
            <div key={e.label} className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f1f5f9] flex items-center justify-center shrink-0">
                  <e.icon className="w-4 h-4 text-[#1d3461]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">{e.label}</p>
                  <p className="text-xs text-[#64748b] mt-0.5">{e.description}</p>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0 ml-4">
                <button onClick={() => showToast(`Downloading ${e.label}.csv`)} className="px-2.5 py-1.5 text-xs font-medium bg-[#f1f5f9] text-[#1d3461] rounded-lg hover:bg-[#e2e8f0] transition-colors">CSV</button>
                <button onClick={() => showToast(`Downloading ${e.label}.xlsx`)} className="px-2.5 py-1.5 text-xs font-medium bg-[#f1f5f9] text-[#1d3461] rounded-lg hover:bg-[#e2e8f0] transition-colors">Excel</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Google Drive Integration */}
      <div>
        <SectionHeader title="Google Drive Integration" subtitle="Automatically sync reports to organised folders in Google Drive" />
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#f1f5f9] flex items-center justify-center">
                <Globe className="w-5 h-5 text-[#1d3461]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f172a]">Google Drive</p>
                <p className="text-xs text-[#64748b]">{connected ? "Connected · esteem-reports@workspace.google.com" : "Not connected"}</p>
              </div>
            </div>
            <button
              onClick={() => { setConnected(c => !c); showToast(connected ? "Disconnected from Google Drive" : "Connected to Google Drive"); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                connected
                  ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                  : "bg-[#1d3461] text-white hover:bg-[#162d56]"
              }`}
            >
              {connected ? "Disconnect" : "Connect Google Drive"}
            </button>
          </div>

          {connected && (
            <div className="border border-[#e2e8f0] rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-[#f8fafc] border-b border-[#e2e8f0]">
                <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Folder Structure</p>
              </div>
              <div className="p-4 space-y-1 font-mono text-xs text-[#64748b]">
                <div className="flex items-center gap-2"><FolderOpen className="w-3.5 h-3.5 text-amber-500" /><span className="font-semibold text-[#0f172a]">Esteem</span></div>
                {[
                  "Time Register",
                  "├── Weekly Reports",
                  "├── Monthly Reports",
                  "├── Project Reports",
                  "└── Payment Reports",
                ].map(line => (
                  <div key={line} className="pl-5">{line}</div>
                ))}
              </div>
            </div>
          )}

          {!connected && (
            <div className="bg-[#f8fafc] rounded-lg p-4 border border-[#e2e8f0]">
              <p className="text-xs font-semibold text-[#0f172a] mb-2">When connected you can:</p>
              <ul className="space-y-1.5">
                {["Automatically sync weekly and monthly reports", "Store exports in structured project folders", "Share reports directly with clients via Drive", "Schedule automated report delivery"].map(item => (
                  <li key={item} className="flex items-center gap-2 text-xs text-[#64748b]">
                    <Check className="w-3 h-3 text-emerald-500 shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0f172a] text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────

function SettingsView() {
  const [activeTab, setActiveTab] = useState<"rates" | "team" | "platform">("rates");
  const [rates, setRates] = useState(FREELANCERS.map(f => ({ id: f.id, name: f.name, role: f.role, rate: f.hourlyRate })));
  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e2e8f0] p-1 w-fit">
        {[
          { key: "rates", label: "Hourly Rates" },
          { key: "team", label: "Team & Access" },
          { key: "platform", label: "Platform" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t.key ? "bg-[#1d3461] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "rates" && (
        <div className="bg-white rounded-xl border border-[#e2e8f0]">
          <div className="p-5 border-b border-[#f1f5f9] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#0f172a]">Freelancer Hourly Rates</h3>
              <p className="text-xs text-[#64748b] mt-0.5">Only visible to Owner. Changes apply to future entries only.</p>
            </div>
          </div>
          <div className="divide-y divide-[#f8fafc]">
            {rates.map(r => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-4">
                <Avatar initials={r.name.split(" ").map(n => n[0]).join("")} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#0f172a]">{r.name}</p>
                  <p className="text-xs text-[#64748b]">{r.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#64748b]">£</span>
                  <input
                    type="number" value={r.rate} min={0} step={5}
                    onChange={e => setRates(prev => prev.map(x => x.id === r.id ? { ...x, rate: Number(e.target.value) } : x))}
                    className="w-20 text-right px-3 py-1.5 text-sm font-mono font-semibold bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                  />
                  <span className="text-sm text-[#64748b]">/hr</span>
                  <button
                    onClick={() => showToast(`Rate updated for ${r.name}`)}
                    className="px-3 py-1.5 text-xs font-medium bg-[#1d3461] text-white rounded-lg hover:bg-[#162d56] transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "team" && (
        <div className="bg-white rounded-xl border border-[#e2e8f0]">
          <div className="p-5 border-b border-[#f1f5f9] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0f172a]">Team Members &amp; Roles</h3>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1d3461] text-white text-xs font-medium rounded-lg hover:bg-[#162d56] transition-colors">
              <Plus className="w-3.5 h-3.5" /> Invite Member
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#f1f5f9]">
                <th className="text-left text-xs font-medium text-[#64748b] px-5 py-3">Member</th>
                <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Role</th>
                <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Access Level</th>
                <th className="text-right text-xs font-medium text-[#64748b] px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f8fafc]">
              {[
                { name: "Alex Wright", email: "alex@esteem.io", role: "Owner", level: "Full access" },
                { name: "Operations User", email: "ops@esteem.io", role: "Operations", level: "Read + export" },
                ...FREELANCERS.map(f => ({ name: f.name, email: f.email, role: "Freelancer", level: "Own data only" })),
              ].map((m, i) => (
                <tr key={i} className="hover:bg-[#f8fafc]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={m.name.split(" ").map(n => n[0]).join("").slice(0, 2)} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-[#0f172a]">{m.name}</p>
                        <p className="text-xs text-[#64748b]">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-[#0f172a]">{m.role}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded-full">{m.level}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {m.role !== "Owner" && (
                      <button className="text-xs font-medium text-[#64748b] hover:text-red-600 transition-colors">Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "platform" && (
        <div className="space-y-4">
          {[
            { title: "Company Name", desc: "Displayed on exports and reports", value: "Esteem Accessibility Agency" },
            { title: "Default Currency", desc: "Used for all financial calculations", value: "GBP (£)" },
            { title: "Fiscal Year Start", desc: "Used for annual budget calculations", value: "January" },
            { title: "Time Zone", desc: "Used for timestamps and scheduling", value: "Europe/London (GMT+1)" },
          ].map(s => (
            <div key={s.title} className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#0f172a]">{s.title}</p>
                <p className="text-xs text-[#64748b] mt-0.5">{s.desc}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#0f172a] font-medium">{s.value}</span>
                <button className="text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors">Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0f172a] text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
        </div>
      )}
    </div>
  );
}

// ─── BANK ACCOUNT FORM ───────────────────────────────────────────────────────

function BankAccountForm({
  initial, onSave, compact = false,
}: {
  initial?: BankAccount;
  onSave?: (b: BankAccount) => void;
  compact?: boolean;
}) {
  const empty: BankAccount = { accountHolder: "", bankName: "", sortCode: "", accountNumber: "", iban: "", paymentRef: "" };
  const [form, setForm] = useState<BankAccount>(initial || empty);
  const [showFull, setShowFull] = useState(false);
  const [saved, setSaved] = useState(false);

  function field(key: keyof BankAccount) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  function handleSave() {
    onSave?.(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const hasData = !!(form.accountNumber && form.sortCode && form.bankName);

  const maskedAccount = form.accountNumber
    ? "••••" + form.accountNumber.slice(-4)
    : "";

  return (
    <div className={`${compact ? "" : "bg-white rounded-xl border border-[#e2e8f0] p-6"}`}>
      {!compact && (
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Landmark className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#0f172a]">Bank Account Details</h3>
            <p className="text-xs text-[#64748b]">Used for payment processing. Stored securely.</p>
          </div>
          {hasData && (
            <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> On file
            </span>
          )}
        </div>
      )}

      {/* Summary strip when data exists and collapsed */}
      {hasData && !showFull && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] mb-4">
          <div className="w-8 h-8 rounded-lg bg-white border border-[#e2e8f0] flex items-center justify-center shrink-0">
            <Landmark className="w-3.5 h-3.5 text-[#1d3461]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#0f172a]">{form.bankName}</p>
            <p className="text-xs text-[#64748b] font-mono">{form.sortCode} · {maskedAccount}</p>
          </div>
          <button
            onClick={() => setShowFull(true)}
            className="text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        </div>
      )}

      {(!hasData || showFull) && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Account Holder Name <span className="text-red-500">*</span></label>
              <input
                value={form.accountHolder} onChange={field("accountHolder")}
                placeholder="Full name as it appears on account"
                className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] placeholder:text-[#94a3b8]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Bank Name <span className="text-red-500">*</span></label>
              <input
                value={form.bankName} onChange={field("bankName")}
                placeholder="e.g. Barclays, HSBC, Monzo"
                className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] placeholder:text-[#94a3b8]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Sort Code <span className="text-red-500">*</span></label>
              <input
                value={form.sortCode} onChange={field("sortCode")}
                placeholder="XX-XX-XX"
                maxLength={8}
                className="w-full px-3 py-2 text-sm font-mono bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] placeholder:text-[#94a3b8]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Account Number <span className="text-red-500">*</span></label>
              <input
                value={form.accountNumber} onChange={field("accountNumber")}
                placeholder="8-digit account number"
                maxLength={8}
                className="w-full px-3 py-2 text-sm font-mono bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] placeholder:text-[#94a3b8]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">IBAN <span className="text-[#94a3b8] font-normal">(optional, international)</span></label>
              <input
                value={form.iban} onChange={field("iban")}
                placeholder="GB29NWBK60161331926819"
                className="w-full px-3 py-2 text-sm font-mono bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] placeholder:text-[#94a3b8]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Payment Reference <span className="text-[#94a3b8] font-normal">(optional)</span></label>
              <input
                value={form.paymentRef} onChange={field("paymentRef")}
                placeholder="e.g. ESTEEM-Invoice"
                className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] placeholder:text-[#94a3b8]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-700">Bank details are encrypted and only visible to the Owner when processing payments.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                saved
                  ? "bg-emerald-600 text-white"
                  : "bg-[#1d3461] text-white hover:bg-[#162d56]"
              }`}
            >
              {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : <><Check className="w-4 h-4" /> Save Bank Details</>}
            </button>
            {hasData && showFull && (
              <button
                onClick={() => setShowFull(false)}
                className="px-4 py-2 text-sm font-medium text-[#64748b] hover:text-[#0f172a] transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PROFILE VIEW (Freelancer) ────────────────────────────────────────────────

function ProfileView({ profile }: { profile: any }) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [specialisation, setSpecialisation] = useState(profile?.specialisation ?? "");
  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  async function saveProfile() {
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, specialisation })
      .eq("id", profile?.id);
    showToast(error ? `Error: ${error.message}` : "Profile saved");
  }

  async function saveBankAccount(bank: BankAccount) {
    const { error } = await supabase
      .from("bank_accounts")
      .upsert({
        user_id: profile?.id,
        account_holder: bank.accountHolder,
        bank_name: bank.bankName,
        sort_code: bank.sortCode,
        account_number: bank.accountNumber,
        iban: bank.iban,
        payment_ref: bank.paymentRef,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    showToast(error ? `Error: ${error.message}` : "Bank details saved securely");
  }

  const initials = profile?.avatar_initials || "??";

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar initials={initials} size="lg" />
          <div>
            <h3 className="text-base font-semibold text-[#0f172a]">{profile?.full_name || "Your Name"}</h3>
            <p className="text-sm text-[#64748b]">{profile?.specialisation || profile?.role} · {profile?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">Full Name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">Email</label>
            <input value={profile?.email ?? ""} readOnly
              className="w-full px-3 py-2 text-sm bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg text-[#64748b] cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">Specialisation</label>
            <input value={specialisation} onChange={e => setSpecialisation(e.target.value)}
              placeholder="e.g. Accessibility Auditor"
              className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] placeholder:text-[#94a3b8]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">Role</label>
            <input value={profile?.role ?? ""} readOnly
              className="w-full px-3 py-2 text-sm bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg text-[#64748b] capitalize cursor-not-allowed" />
          </div>
        </div>
        <button onClick={saveProfile} className="mt-5 px-4 py-2 bg-[#1d3461] text-white text-sm font-medium rounded-lg hover:bg-[#162d56] transition-colors">
          Save Changes
        </button>
      </div>

      <BankAccountForm onSave={saveBankAccount} />

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0f172a] text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
        </div>
      )}
    </div>
  );
}

// ─── TIME OFF VIEW ────────────────────────────────────────────────────────────

function TimeOffView({ role, userId = "" }: { role: Role; userId?: string }) {
  const [allEntries, setAllEntries] = useState<TimeOffEntry[]>(TIME_OFF_ENTRIES);

  useEffect(() => {
    if (!userId) return;
    supabase.from("time_off").select("*").then(({ data }) => {
      if (data && data.length > 0) {
        setAllEntries(data.map((e: any) => ({
          id: e.id, freelancerId: e.user_id, type: e.type,
          startDate: e.start_date, endDate: e.end_date, notes: e.notes,
          status: e.status, submittedAt: e.submitted_at?.slice(0, 10) ?? "",
          respondedAt: e.responded_at?.slice(0, 10), respondedBy: e.responded_by,
        })));
      }
    });
  }, [userId]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<TimeOffType>("vacation");
  const [formStart, setFormStart] = useState(TODAY);
  const [formEnd, setFormEnd] = useState(TODAY);
  const [formNotes, setFormNotes] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  async function submitRequest() {
    if (!formStart || !formEnd) return;
    const optimistic: TimeOffEntry = {
      id: `to${Date.now()}`, freelancerId: userId || "f1", type: formType,
      startDate: formStart, endDate: formEnd, notes: formNotes || undefined,
      status: "pending", submittedAt: TODAY,
    };
    setAllEntries(prev => [optimistic, ...prev]);
    setShowForm(false);
    setFormNotes("");
    showToast(formType === "sick" ? "Sick day reported" : "Vacation request submitted");
    if (userId) {
      const { data } = await supabase.from("time_off").insert({
        user_id: userId, type: formType, start_date: formStart,
        end_date: formEnd, notes: formNotes || null, status: "pending",
      }).select().single();
      if (data) {
        setAllEntries(prev => prev.map(e => e.id === optimistic.id ? {
          ...e, id: data.id,
        } : e));
      }
    }
  }

  async function respond(id: string, decision: "approved" | "denied") {
    setAllEntries(prev => prev.map(e =>
      e.id === id ? { ...e, status: decision, respondedAt: TODAY } : e
    ));
    showToast(decision === "approved" ? "Request approved" : "Request denied");
    await supabase.from("time_off").update({
      status: decision, responded_at: new Date().toISOString(),
    }).eq("id", id);
  }

  const TO_STATUS: Record<TimeOffStatus, { label: string; color: string }> = {
    pending:  { label: "Pending",  color: "bg-amber-50 text-amber-700 border-amber-200" },
    approved: { label: "Approved", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    denied:   { label: "Denied",   color: "bg-red-50 text-red-700 border-red-200" },
  };

  // ── Freelancer view ──────────────────────────────────────────────────────────
  if (role === "freelancer") {
    const myEntries = allEntries.filter(e => e.freelancerId === "f1");
    const currentLeave = myEntries.find(e => e.status === "approved" && e.startDate <= TODAY && e.endDate >= TODAY);
    const upcoming = myEntries.filter(e => e.startDate > TODAY).sort((a, b) => a.startDate.localeCompare(b.startDate));
    const past = myEntries.filter(e => e.endDate < TODAY).sort((a, b) => b.startDate.localeCompare(a.startDate));

    return (
      <div className="space-y-5 max-w-2xl">
        {/* Status banner */}
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${
          currentLeave
            ? currentLeave.type === "sick" ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
            : "bg-emerald-50 border-emerald-200"
        }`}>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            currentLeave ? (currentLeave.type === "sick" ? "bg-red-100" : "bg-blue-100") : "bg-emerald-100"
          }`}>
            {currentLeave
              ? currentLeave.type === "sick" ? <HeartPulse className="w-4 h-4 text-red-600" /> : <Plane className="w-4 h-4 text-blue-600" />
              : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          </div>
          <div>
            <p className={`text-sm font-semibold ${currentLeave ? (currentLeave.type === "sick" ? "text-red-700" : "text-blue-700") : "text-emerald-700"}`}>
              {currentLeave
                ? currentLeave.type === "sick" ? "You are currently on sick leave" : `You are on vacation until ${currentLeave.endDate}`
                : "You are currently available"}
            </p>
            {currentLeave?.notes && <p className={`text-xs mt-0.5 ${currentLeave.type === "sick" ? "text-red-600" : "text-blue-600"}`}>{currentLeave.notes}</p>}
          </div>
        </div>

        {/* Quick action buttons */}
        {!showForm && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setFormType("vacation"); setShowForm(true); }}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#e2e8f0] hover:border-blue-300 hover:shadow-sm transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Plane className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f172a]">Request Vacation</p>
                <p className="text-xs text-[#64748b]">Plan time off in advance</p>
              </div>
            </button>
            <button
              onClick={() => { setFormType("sick"); setFormStart(TODAY); setFormEnd(TODAY); setShowForm(true); }}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#e2e8f0] hover:border-red-300 hover:shadow-sm transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <HeartPulse className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f172a]">Report Sick Day</p>
                <p className="text-xs text-[#64748b]">Notify the team today</p>
              </div>
            </button>
          </div>
        )}

        {/* Request form */}
        {showForm && (
          <div className={`bg-white rounded-xl border p-5 ${formType === "sick" ? "border-red-200" : "border-blue-200"}`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${formType === "sick" ? "bg-red-50" : "bg-blue-50"}`}>
                {formType === "sick" ? <HeartPulse className="w-3.5 h-3.5 text-red-500" /> : <Plane className="w-3.5 h-3.5 text-blue-600" />}
              </div>
              <h3 className="text-sm font-semibold text-[#0f172a]">
                {formType === "sick" ? "Report Sick Day" : "Request Vacation"}
              </h3>
              <button onClick={() => setShowForm(false)} className="ml-auto text-[#94a3b8] hover:text-[#64748b]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {formType === "vacation" && (
                <div className="flex rounded-lg border border-[#e2e8f0] overflow-hidden mb-1">
                  {(["vacation", "sick"] as TimeOffType[]).map(t => (
                    <button key={t} onClick={() => setFormType(t)}
                      className={`flex-1 py-1.5 text-xs font-medium transition-colors capitalize ${formType === t ? "bg-[#1d3461] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}>
                      {t === "sick" ? "Sick Leave" : "Vacation"}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">
                    {formType === "sick" ? "Date" : "Start Date"}
                  </label>
                  <input type="date" value={formStart} onChange={e => { setFormStart(e.target.value); if (formType === "sick") setFormEnd(e.target.value); }}
                    className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]" />
                </div>
                {formType === "vacation" && (
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">End Date</label>
                    <input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Notes <span className="text-[#94a3b8] font-normal">(optional)</span></label>
                <input value={formNotes} onChange={e => setFormNotes(e.target.value)}
                  placeholder={formType === "sick" ? "e.g. Flu, back tomorrow" : "e.g. Summer holiday — Spain"}
                  className="w-full px-3 py-2 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] placeholder:text-[#94a3b8]" />
              </div>

              {formType === "vacation" && formStart && formEnd && formStart <= formEnd && (
                <div className="flex items-center gap-1.5 text-xs text-[#64748b] bg-[#f8fafc] rounded-lg px-3 py-2">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {Math.round((new Date(formEnd).getTime() - new Date(formStart).getTime()) / 86400000) + 1} day(s) requested
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={submitRequest}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors ${formType === "sick" ? "bg-red-500 hover:bg-red-600" : "bg-[#2563eb] hover:bg-[#1d4ed8]"}`}>
                  <Send className="w-3.5 h-3.5" />
                  {formType === "sick" ? "Report Sick Day" : "Submit Request"}
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-[#64748b] hover:text-[#0f172a] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
            <h3 className="text-sm font-semibold text-[#0f172a] mb-3">Upcoming Time Off</h3>
            <div className="space-y-2">
              {upcoming.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#f8fafc]">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${e.type === "sick" ? "bg-red-50" : "bg-blue-50"}`}>
                    {e.type === "sick" ? <HeartPulse className="w-3.5 h-3.5 text-red-500" /> : <Plane className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0f172a] capitalize">{e.type === "sick" ? "Sick Leave" : "Vacation"}</p>
                    <p className="text-xs text-[#64748b]">
                      {e.startDate === e.endDate ? e.startDate : `${e.startDate} – ${e.endDate}`}
                      {e.notes && ` · ${e.notes}`}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${TO_STATUS[e.status].color}`}>
                    {TO_STATUS[e.status].label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {past.length > 0 && (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
            <h3 className="text-sm font-semibold text-[#0f172a] mb-3">History</h3>
            <div className="space-y-2">
              {past.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f8fafc] transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${e.type === "sick" ? "bg-red-50" : "bg-blue-50"}`}>
                    {e.type === "sick" ? <HeartPulse className="w-3 h-3 text-red-500" /> : <Plane className="w-3 h-3 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#0f172a]">{e.type === "sick" ? "Sick Leave" : "Vacation"}</p>
                    <p className="text-xs text-[#64748b]">{e.startDate === e.endDate ? e.startDate : `${e.startDate} – ${e.endDate}`}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TO_STATUS[e.status].color}`}>{TO_STATUS[e.status].label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 bg-[#0f172a] text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 z-50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </div>
        )}
      </div>
    );
  }

  // ── Owner / Operations view ──────────────────────────────────────────────────
  const pending = allEntries.filter(e => e.status === "pending");
  const approvedUpcoming = allEntries.filter(e => e.status === "approved" && e.startDate > TODAY)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const awayNow = allEntries.filter(e => e.status === "approved" && e.startDate <= TODAY && e.endDate >= TODAY);

  const months = ["Jun 2026", "Jul 2026", "Aug 2026"];

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <p className="text-xs font-medium text-[#64748b] mb-1">Out Today</p>
          <p className="text-2xl font-semibold text-[#0f172a]">{awayNow.length}</p>
          <p className="text-xs text-[#64748b] mt-0.5">of {FREELANCERS.filter(f => f.status === "active").length} active freelancers</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <p className="text-xs font-medium text-[#64748b] mb-1">Pending Requests</p>
          <p className="text-2xl font-semibold text-amber-600">{pending.length}</p>
          <p className="text-xs text-[#64748b] mt-0.5">awaiting your response</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <p className="text-xs font-medium text-[#64748b] mb-1">Upcoming Absences</p>
          <p className="text-2xl font-semibold text-[#0f172a]">{approvedUpcoming.length}</p>
          <p className="text-xs text-[#64748b] mt-0.5">approved upcoming leave</p>
        </div>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e2e8f0]">
          <div className="p-5 border-b border-[#f1f5f9] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0f172a]">Pending Requests</h3>
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">{pending.length} awaiting review</span>
          </div>
          <div className="divide-y divide-[#f8fafc]">
            {pending.map(e => {
              const f = getFreelancer(e.freelancerId);
              const days = Math.round((new Date(e.endDate).getTime() - new Date(e.startDate).getTime()) / 86400000) + 1;
              return (
                <div key={e.id} className="flex items-center gap-4 px-5 py-4">
                  <Avatar initials={f?.avatar || "??"} />
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${e.type === "sick" ? "bg-red-50" : "bg-blue-50"}`}>
                    {e.type === "sick" ? <HeartPulse className="w-3.5 h-3.5 text-red-500" /> : <Plane className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0f172a]">{f?.name}</p>
                    <p className="text-xs text-[#64748b]">
                      {e.type === "sick" ? "Sick Leave" : "Vacation"} · {e.startDate === e.endDate ? e.startDate : `${e.startDate} – ${e.endDate}`} · {days} day{days !== 1 ? "s" : ""}
                    </p>
                    {e.notes && <p className="text-xs text-[#94a3b8] mt-0.5 italic">"{e.notes}"</p>}
                  </div>
                  <p className="text-xs text-[#94a3b8] shrink-0">Submitted {e.submittedAt}</p>
                  {role === "owner" && (
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => respond(e.id, "approved")}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-colors">
                        <Check className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => respond(e.id, "denied")}
                        className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 border border-red-200 transition-colors">
                        <X className="w-3 h-3" /> Deny
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team calendar overview */}
      <div className="bg-white rounded-xl border border-[#e2e8f0]">
        <div className="p-5 border-b border-[#f1f5f9]">
          <h3 className="text-sm font-semibold text-[#0f172a]">Team Availability Overview</h3>
          <p className="text-xs text-[#64748b] mt-0.5">Approved and upcoming leave per freelancer</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#f1f5f9]">
                <th className="text-left text-xs font-medium text-[#64748b] px-5 py-3 w-52">Freelancer</th>
                <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Status Today</th>
                <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Next Absence</th>
                <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Notes</th>
                <th className="text-right text-xs font-medium text-[#64748b] px-5 py-3">Days Taken (YTD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f8fafc]">
              {FREELANCERS.map(f => {
                const onLeave = isOnLeaveToday(f.id, allEntries);
                const next = allEntries.filter(e => e.freelancerId === f.id && e.status === "approved" && e.startDate > TODAY)
                  .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
                const daysTaken = allEntries
                  .filter(e => e.freelancerId === f.id && e.status === "approved" && e.endDate < TODAY)
                  .reduce((s, e) => s + Math.round((new Date(e.endDate).getTime() - new Date(e.startDate).getTime()) / 86400000) + 1, 0);
                const pendingForF = allEntries.filter(e => e.freelancerId === f.id && e.status === "pending");
                return (
                  <tr key={f.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={f.avatar} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-[#0f172a]">{f.name}</p>
                          <p className="text-xs text-[#64748b]">{f.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {onLeave ? (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border ${onLeave.type === "sick" ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                          {onLeave.type === "sick" ? <HeartPulse className="w-3 h-3" /> : <Plane className="w-3 h-3" />}
                          {onLeave.type === "sick" ? "Sick leave" : "On vacation"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Available
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {next ? (
                        <div>
                          <p className="text-xs font-medium text-[#0f172a]">{next.startDate === next.endDate ? next.startDate : `${next.startDate} – ${next.endDate}`}</p>
                          <p className="text-xs text-[#64748b] capitalize">{next.type === "sick" ? "Sick leave" : "Vacation"}</p>
                        </div>
                      ) : pendingForF.length > 0 ? (
                        <span className="text-xs text-amber-600">{pendingForF.length} pending request{pendingForF.length > 1 ? "s" : ""}</span>
                      ) : (
                        <span className="text-xs text-[#94a3b8]">None scheduled</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {onLeave?.notes ? (
                        <p className="text-xs text-[#64748b] italic max-w-[180px] truncate">"{onLeave.notes}"</p>
                      ) : next?.notes ? (
                        <p className="text-xs text-[#94a3b8] italic max-w-[180px] truncate">"{next.notes}"</p>
                      ) : (
                        <span className="text-xs text-[#94a3b8]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-sm font-mono font-semibold text-[#0f172a]">{daysTaken}</span>
                      <span className="text-xs text-[#94a3b8] ml-1">days</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full log */}
      <div className="bg-white rounded-xl border border-[#e2e8f0]">
        <div className="p-5 border-b border-[#f1f5f9]">
          <h3 className="text-sm font-semibold text-[#0f172a]">All Absence Records</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f1f5f9]">
              <th className="text-left text-xs font-medium text-[#64748b] px-5 py-3">Freelancer</th>
              <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Type</th>
              <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Dates</th>
              <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Notes</th>
              <th className="text-left text-xs font-medium text-[#64748b] px-3 py-3">Status</th>
              {role === "owner" && <th className="text-right text-xs font-medium text-[#64748b] px-5 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f8fafc]">
            {allEntries.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).map(e => {
              const f = getFreelancer(e.freelancerId);
              const days = Math.round((new Date(e.endDate).getTime() - new Date(e.startDate).getTime()) / 86400000) + 1;
              return (
                <tr key={e.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={f?.avatar || "??"} size="sm" />
                      <p className="text-sm font-medium text-[#0f172a]">{f?.name}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${e.type === "sick" ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                      {e.type === "sick" ? <HeartPulse className="w-3 h-3" /> : <Plane className="w-3 h-3" />}
                      {e.type === "sick" ? "Sick" : "Vacation"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-sm font-mono text-[#0f172a]">{e.startDate === e.endDate ? e.startDate : `${e.startDate} – ${e.endDate}`}</p>
                    <p className="text-xs text-[#64748b]">{days} day{days !== 1 ? "s" : ""}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs text-[#64748b] max-w-[160px] truncate italic">{e.notes || "—"}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${TO_STATUS[e.status].color}`}>{TO_STATUS[e.status].label}</span>
                  </td>
                  {role === "owner" && (
                    <td className="px-5 py-3 text-right">
                      {e.status === "pending" && (
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => respond(e.id, "approved")} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-colors">Approve</button>
                          <button onClick={() => respond(e.id, "denied")} className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 border border-red-200 transition-colors">Deny</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0f172a] text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
        </div>
      )}
    </div>
  );
}

// ─── PAGE METADATA ────────────────────────────────────────────────────────────

const PAGE_META: Record<View, { title: string; subtitle?: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Overview of operations and activity" },
  "time-register": { title: "Time Register", subtitle: "Track and manage time entries" },
  approvals: { title: "Approvals", subtitle: "Review and approve submitted hours" },
  projects: { title: "Projects", subtitle: "Manage client projects and budgets" },
  freelancers: { title: "Freelancers", subtitle: "Manage your specialist network" },
  reports: { title: "Reports", subtitle: "Analytics and operational insights" },
  payments: { title: "Payments", subtitle: "Track approved costs and settlements" },
  exports: { title: "Exports", subtitle: "Download reports and sync to Google Drive" },
  settings: { title: "Settings", subtitle: "Platform configuration and access control" },
  "my-time": { title: "My Time", subtitle: "Your time entries and history" },
  "my-projects": { title: "My Projects", subtitle: "Projects you are assigned to" },
  "submit-hours": { title: "Submit Hours", subtitle: "Submit pending entries for approval" },
  profile: { title: "Profile", subtitle: "Manage your account details" },
  "time-off": { title: "Time Off", subtitle: "Request vacation or report sick days" },
  availability: { title: "Team Availability", subtitle: "Overview of leave, absences and upcoming time off" },
};

// ─── APP ──────────────────────────────────────────────────────────────────────

// ─── DEMO BANNER ─────────────────────────────────────────────────────────────

function DemoBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
      <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
        <Info className="w-3.5 h-3.5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">You're viewing demo data</p>
        <p className="text-xs text-amber-700 mt-0.5">
          No real data was found in your database yet. Everything you see — projects, freelancers, time entries, approvals — is placeholder content.
          It will be automatically replaced as your team signs in and starts using the platform.
        </p>
        <p className="text-xs text-amber-600 mt-1.5 font-medium">
          Next step: run <span className="font-mono bg-amber-100 px-1 py-0.5 rounded">supabase/schema.sql</span> in your Supabase SQL editor, then invite your team via Authentication → Users.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { session, profile, loading } = useAuth();
  const [view, setView] = useState<View>("dashboard");
  const [dataReady, setDataReady] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoDismissed, setDemoDismissed] = useState(false);

  // Role comes strictly from the database — least privilege fallback
  const role: Role = (profile?.role as Role) ?? "freelancer";

  // Reset to dashboard when role changes
  useEffect(() => { setView("dashboard"); }, [role]);

  // Load all real data from Supabase when session is available
  useEffect(() => {
    if (!session) return;
    loadAllData();
  }, [session?.user.id]);

  async function loadAllData() {
    const [profilesRes, projectsRes, assignmentsRes, entriesRes, timeOffRes] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("project_assignments").select("*"),
      supabase.from("time_entries").select("*").order("date", { ascending: false }),
      supabase.from("time_off").select("*").order("submitted_at", { ascending: false }),
    ]);

    if (profilesRes.data && profilesRes.data.length > 0) {
      const mapped: Freelancer[] = profilesRes.data.map((p: any) => ({
        id: p.id,
        name: p.full_name || p.email.split("@")[0],
        email: p.email,
        role: p.specialisation || (p.role === "freelancer" ? "Freelancer" : p.role),
        hourlyRate: p.hourly_rate ?? 0,
        avatar: p.avatar_initials || p.full_name?.slice(0, 2).toUpperCase() || "??",
        status: p.status ?? "active",
        totalHours: 0,
        pendingHours: 0,
        bankAccount: undefined,
      }));
      FREELANCERS.splice(0, FREELANCERS.length, ...mapped);
    }

    if (projectsRes.data && projectsRes.data.length > 0) {
      const assignments: any[] = assignmentsRes.data ?? [];
      const mapped: Project[] = projectsRes.data.map((p: any) => ({
        id: p.id,
        clientName: p.client_name,
        name: p.name,
        serviceType: p.service_type,
        budget: p.budget,
        status: p.status,
        assignedFreelancers: assignments.filter(a => a.project_id === p.id).map(a => a.user_id),
        approvedCost: 0,
        forecastCost: 0,
        description: p.description,
        startDate: p.start_date ?? "",
        endDate: p.end_date ?? "",
        billable: p.billable ?? true,
        code: p.code ?? "",
        category: (p.category as ProjectCategory) ?? "overhead",
        requiresApproval: p.requires_approval ?? false,
      }));
      PROJECTS.splice(0, PROJECTS.length, ...mapped);
    }

    if (entriesRes.data && entriesRes.data.length > 0) {
      const mapped: TimeEntry[] = entriesRes.data.map((e: any) => ({
        id: e.id,
        freelancerId: e.user_id,
        projectId: e.project_id,
        date: e.date,
        startTime: e.start_time ?? "",
        endTime: e.end_time ?? "",
        hours: e.hours,
        description: e.description,
        status: e.status,
        submittedAt: e.submitted_at?.slice(0, 10),
        approvedAt: e.approved_at?.slice(0, 10),
        approvedBy: e.approved_by,
        amount: e.amount,
      }));
      TIME_ENTRIES.splice(0, TIME_ENTRIES.length, ...mapped);
    }

    if (timeOffRes.data && timeOffRes.data.length > 0) {
      const mapped: TimeOffEntry[] = timeOffRes.data.map((e: any) => ({
        id: e.id,
        freelancerId: e.user_id,
        type: e.type,
        startDate: e.start_date,
        endDate: e.end_date,
        notes: e.notes,
        status: e.status,
        submittedAt: e.submitted_at?.slice(0, 10) ?? TODAY,
        respondedAt: e.responded_at?.slice(0, 10),
        respondedBy: e.responded_by,
      }));
      TIME_OFF_ENTRIES.splice(0, TIME_OFF_ENTRIES.length, ...mapped);
    }

    // Compute derived totals
    const rateMap: Record<string, number> = {};
    FREELANCERS.forEach(f => { rateMap[f.id] = f.hourlyRate; });

    FREELANCERS.forEach(f => {
      const fe = TIME_ENTRIES.filter(e => e.freelancerId === f.id);
      f.totalHours = parseFloat(fe.reduce((s, e) => s + e.hours, 0).toFixed(1));
      f.pendingHours = parseFloat(fe.filter(e => e.status === "submitted").reduce((s, e) => s + e.hours, 0).toFixed(1));
    });

    PROJECTS.forEach(p => {
      const pe = TIME_ENTRIES.filter(e => e.projectId === p.id);
      p.approvedCost = pe.filter(e => ["approved", "paid"].includes(e.status))
        .reduce((s, e) => s + (e.amount ?? e.hours * (rateMap[e.freelancerId] ?? 0)), 0);
      p.forecastCost = pe.filter(e => ["submitted", "approved", "paid"].includes(e.status))
        .reduce((s, e) => s + (e.amount ?? e.hours * (rateMap[e.freelancerId] ?? 0)), 0);
    });

    // If none of the key tables returned real rows, we're in demo mode
    const hasRealData =
      (profilesRes.data?.length ?? 0) > 0 ||
      (projectsRes.data?.length ?? 0) > 0 ||
      (entriesRes.data?.length ?? 0) > 0;
    setDemoMode(!hasRealData);
    setDataReady(r => !r);
  }

  function handleNavigate(v: View) { setView(v); }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // Loading splash
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-[#2563eb] rounded-xl flex items-center justify-center animate-pulse">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-[#64748b]">Loading…</p>
        </div>
      </div>
    );
  }

  // Not logged in → show login screen
  if (!session) return <LoginView />;

  const meta = PAGE_META[view] || { title: "ESTEEM" };

  function renderView() {
    switch (view) {
      case "dashboard": return <DashboardView role={role} />;
      case "time-register":
      case "my-time":
      case "submit-hours": return <TimeRegisterView role={role} userId={session.user.id} onSaved={loadAllData} />;
      case "approvals": return <ApprovalsView role={role} onSaved={loadAllData} />;
      case "projects":
      case "my-projects": return <ProjectsView role={role} />;
      case "freelancers": return <FreelancersView role={role} />;
      case "reports": return <ReportsView role={role} />;
      case "payments": return <PaymentsView role={role} onSaved={loadAllData} />;
      case "exports": return <ExportsView />;
      case "settings": return <SettingsView />;
      case "profile": return <ProfileView profile={profile} />;
      case "time-off": return <TimeOffView role={role} userId={session.user.id} />;
      case "availability": return <TimeOffView role={role} userId={session.user.id} />;
      default: return <DashboardView role={role} />;
    }
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar
        role={role}
        view={view}
        onNavigate={handleNavigate}
        onRoleChange={() => {}}
        profile={profile}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title={meta.title} subtitle={meta.subtitle} role={role} />
        <main className="flex-1 overflow-y-auto p-6">
          <div key={String(dataReady)} className="max-w-6xl mx-auto">
            {demoMode && !demoDismissed && (
              <DemoBanner onDismiss={() => setDemoDismissed(true)} />
            )}
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}
