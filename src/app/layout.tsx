import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/labels";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Collect recipes, plan meals, and build shopping lists together",
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
