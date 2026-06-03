import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LeaguePicker from "@/components/LeaguePicker";
import { League, LeagueMember } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: leagues }, { data: memberships }] = await Promise.all([
    supabase.from("leagues").select("*").returns<League[]>(),
    supabase
      .from("league_members")
      .select("league_id")
      .eq("user_id", user.id)
      .returns<LeagueMember[]>(),
  ]);

  const userLeagues = memberships?.map((m) => m.league_id) ?? [];

  // If user is only in one league, go directly there
  if (userLeagues.length === 1) {
    redirect(`/liga/${userLeagues[0]}`);
  }

  return (
    <LeaguePicker
      leagues={leagues ?? []}
      userId={user.id}
      userLeagues={userLeagues}
    />
  );
}
