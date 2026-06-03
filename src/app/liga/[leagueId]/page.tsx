import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import MainTabs from "@/components/MainTabs";
import { Profile, Team, Match, Prediction, League, LeagueMember } from "@/lib/types";

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify league exists
  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", leagueId)
    .single<League>();

  if (!league) {
    redirect("/");
  }

  // Get league members
  const { data: members } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId)
    .returns<LeagueMember[]>();

  const memberIds = members?.map((m) => m.user_id) ?? [];

  // Check if user is member, if not redirect to picker
  if (!memberIds.includes(user.id)) {
    redirect("/");
  }

  const [
    { data: profile },
    { data: allProfiles },
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
      .in("id", memberIds)
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
      <Header user={profile ?? null} league={league} />
      <main className="max-w-lg sm:max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1 w-full">
        <MainTabs
          matches={matches ?? []}
          teams={teams ?? []}
          predictions={predictions ?? []}
          profiles={allProfiles ?? []}
          userId={user.id}
          leagueId={leagueId}
        />
        <footer className="text-center text-[10px] sm:text-xs text-muted mt-6 sm:mt-8 pb-4">
          Los partidos se irán cargando a medida que se jueguen
        </footer>
      </main>
    </>
  );
}
