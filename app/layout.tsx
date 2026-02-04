import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Sora } from "next/font/google";

import { SiteNavbar } from "@/components/navigation/site-navbar";
import { AuthProvider } from "@/components/providers/session-provider";
import "./globals.css";

const sora = Sora({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
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
      <body className={`${sora.variable} ${fraunces.variable} ${jetBrainsMono.variable} antialiased`}>
        <AuthProvider>
          <SiteNavbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
