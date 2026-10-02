import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lucky Break",
  description: "Pick the NBA player who leads the category. One wrong answer ends your streak.",
  openGraph: {
    title: "Lucky Break",
    description: "How long can you stay alive?",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}