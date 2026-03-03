import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin de Landing Pages",
  description: "Administração de landing pages com A/B test e Supabase"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-brand-navy text-brand-white antialiased">
        {children}
      </body>
    </html>
  );
}

