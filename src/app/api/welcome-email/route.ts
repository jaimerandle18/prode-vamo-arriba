import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/mail";
import { getWelcomeHtml } from "@/lib/email-templates";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const name =
      user.user_metadata?.full_name || user.user_metadata?.name || "Crack";

    await sendEmail({
      to: user.email,
      subject: "🏆 Bienvenido al Prode Mundial 2026!",
      html: getWelcomeHtml(name),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Welcome email error:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
