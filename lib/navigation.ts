import type { ComponentType } from "react";
import type { RoleName } from "@prisma/client";
import { Bell, Boxes, ClipboardCheck, FileBarChart, LayoutDashboard, MapPin, QrCode, ScanLine, Settings, ShieldCheck, Users } from "lucide-react";

export const navSections = ["Overview", "Asset operations", "Insights", "Administration"] as const;
type NavSection = (typeof navSections)[number];
type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }>; roles: RoleName[]; section: NavSection };

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["SUPERADMIN", "ASSET_LIAISON", "USER"], section: "Overview" },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: ["SUPERADMIN", "ASSET_LIAISON", "USER"], section: "Overview" },
  { href: "/assets", label: "Assets", icon: Boxes, roles: ["SUPERADMIN", "ASSET_LIAISON", "USER"], section: "Asset operations" },
  { href: "/qr-scanner", label: "Scan Asset", icon: ScanLine, roles: ["SUPERADMIN"], section: "Asset operations" },
  { href: "/borrowings", label: "Borrowing", icon: ClipboardCheck, roles: ["SUPERADMIN", "ASSET_LIAISON", "USER"], section: "Asset operations" },
  { href: "/transfers", label: "Transfers", icon: ClipboardCheck, roles: ["SUPERADMIN", "ASSET_LIAISON", "USER"], section: "Asset operations" },
  { href: "/maintenance", label: "Maintenance", icon: ClipboardCheck, roles: ["SUPERADMIN", "ASSET_LIAISON", "USER"], section: "Asset operations" },
  { href: "/verification", label: "Verification", icon: QrCode, roles: ["SUPERADMIN", "ASSET_LIAISON"], section: "Asset operations" },
  { href: "/incidents", label: "Incidents", icon: ClipboardCheck, roles: ["SUPERADMIN", "ASSET_LIAISON", "USER"], section: "Asset operations" },
  { href: "/disposal", label: "Disposal", icon: ClipboardCheck, roles: ["SUPERADMIN", "ASSET_LIAISON"], section: "Asset operations" },
  { href: "/reports", label: "Reports", icon: FileBarChart, roles: ["SUPERADMIN", "ASSET_LIAISON"], section: "Insights" },
  { href: "/audit-logs", label: "Audit Logs", icon: ShieldCheck, roles: ["SUPERADMIN"], section: "Insights" },
  { href: "/users", label: "Users", icon: Users, roles: ["SUPERADMIN"], section: "Administration" },
  { href: "/locations", label: "Locations", icon: MapPin, roles: ["SUPERADMIN"], section: "Administration" },
  { href: "/master-data", label: "Master Data", icon: Boxes, roles: ["SUPERADMIN"], section: "Administration" },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["SUPERADMIN"], section: "Administration" }
];

