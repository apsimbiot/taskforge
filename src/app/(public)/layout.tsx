import { QueryProvider } from "@/components/query-provider"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <QueryProvider>{children}</QueryProvider>
}
