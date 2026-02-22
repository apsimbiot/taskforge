import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskForge — Open Source Project Management",
  description:
    "An open-source alternative to ClickUp. Manage tasks, sprints, and projects with your team.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
