import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { League } from "@/lib/types";
import PublicLeaguePicker from "@/components/PublicLeaguePicker";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If logged in and in one league, go directly there
  if (user) {
    const { data: memberships } = await supabase
      .from("league_members")
      .select("league_id")
      .eq("user_id", user.id);

    const leagues = memberships?.map((m) => m.league_id) ?? [];

    if (leagues.length === 1) {
      redirect(`/liga/${leagues[0]}`);
    }
  }

  const { data: leagues } = await supabase
    .from("leagues")
    .select("*")
    .returns<League[]>();

  return <PublicLeaguePicker leagues={leagues ?? []} isLoggedIn={!!user} />;
}
