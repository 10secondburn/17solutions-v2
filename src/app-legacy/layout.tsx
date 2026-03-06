import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "17solutions — SDG Innovation Engine",
  description: "Turn any brand into an SDG innovation story. 11 strategic steps from insight to pitch.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
