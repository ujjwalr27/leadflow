import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LeadFlow",
  description: "Track leads, log every discussion, and never miss a follow-up.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
