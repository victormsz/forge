import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteNavbar } from "@/components/navigation/site-navbar";
import { AuthProvider } from "@/components/providers/session-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ForgeSheet | D&D 5.5 Maker",
  description:
    "Forge heroic D&D 5.5 characters, manage spells, and export polished mobile-first sheets with PDF-ready layouts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <SiteNavbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
