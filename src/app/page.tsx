import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import MainTabs from "@/components/MainTabs";
import { Profile, Team, Match, Prediction } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: profile },
    { data: profiles },
    { data: teams },
    { data: matches },
    { data: predictions },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>(),
    supabase
      .from("profiles")
      .select("*")
      .order("total_points", { ascending: false })
      .returns<Profile[]>(),
    supabase.from("teams").select("*").returns<Team[]>(),
    supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: true })
      .returns<Match[]>(),
    supabase
      .from("predictions")
      .select("*")
      .eq("user_id", user.id)
      .returns<Prediction[]>(),
  ]);

  return (
    <>
      <Header user={profile ?? null} />
      <main className="max-w-lg sm:max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1 w-full">
        <MainTabs
          matches={matches ?? []}
          teams={teams ?? []}
          predictions={predictions ?? []}
          profiles={profiles ?? []}
          userId={user.id}
        />
        <footer className="text-center text-[10px] sm:text-xs text-muted mt-6 sm:mt-8 pb-4">
          Los partidos se irán cargando a medida que se jueguen
        </footer>
      </main>
    </>
  );
}
