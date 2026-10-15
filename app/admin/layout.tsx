import type { Metadata } from "next";
import { messages } from "@/lib/i18n";

export const metadata: Metadata = {
  title: { default: messages.admin.panelTitle, template: `%s | ${messages.admin.title}` },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
