import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cami's Meal Planner",
  description: "Shared meal and snack planner for Cami",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
