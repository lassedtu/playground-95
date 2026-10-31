import type { Metadata } from "next";

// Order matters: layers.css declares the cascade layer order and must load first.
import "./layers.css";
import "@react95/core/GlobalStyle";
import "@react95/core/themes/win95.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Playground 95",
  description: "A Windows 95-like playground of small interactive programs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
