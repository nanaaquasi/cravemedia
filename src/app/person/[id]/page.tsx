import { redirect } from "next/navigation";
import {
  getPersonDetails,
  getPersonCombinedCredits,
} from "@/lib/tmdb";
import PersonDetailClient from "./PersonDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) return { title: "Person" };

  const person = await getPersonDetails(idNum);
  if (!person) return { title: "Person" };

  return {
    title: `${person.name} — Craveo`,
    description: person.biography?.slice(0, 160) ?? undefined,
    openGraph: {
      title: `${person.name} — Craveo`,
      images: person.profileUrl ? [{ url: person.profileUrl }] : undefined,
    },
  };
}

export default async function PersonPage({ params }: PageProps) {
  const { id } = await params;

  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) {
    redirect("/");
  }

  const [person, credits] = await Promise.all([
    getPersonDetails(idNum),
    getPersonCombinedCredits(idNum),
  ]);

  if (!person) {
    redirect("/");
  }

  return (
    <PersonDetailClient
      person={person}
      credits={credits}
    />
  );
}
