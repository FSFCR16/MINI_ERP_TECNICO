import { Geist, Geist_Mono } from "next/font/google";
import { Inter } from "next/font/google";
import "./globals.css";
import { GuardaSesion } from "@/Components/GuardaSesion.jsx";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MINI ERP",
  description: "Panel de gestión de técnicos",
};

const inter = Inter({
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.className} antialiased bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100`}
      >
        <GuardaSesion>{children}</GuardaSesion>
      </body>
    </html>
  );
}
