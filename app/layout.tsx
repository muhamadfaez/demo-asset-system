import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IIUM Kulliyyah Asset Management System",
  description: "Role-based asset register, borrowing, maintenance, verification, disposal, reporting, and audit trail for IIUM Kulliyyah assets."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
