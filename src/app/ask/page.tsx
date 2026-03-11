import { redirect } from "next/navigation";

interface AskPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AskPage({ searchParams }: AskPageProps) {
  const params = await searchParams;
  const q = params.q;
  const url = q ? `/?q=${encodeURIComponent(q)}` : "/";
  redirect(url);
}
