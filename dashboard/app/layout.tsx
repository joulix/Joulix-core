import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Joulix Dashboard",
  description: "Green energy certificates marketplace (Polygon Amoy)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
