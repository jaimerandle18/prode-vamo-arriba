import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mail";
import { getWelcomeHtml } from "@/lib/email-templates";

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    await sendEmail({
      to: email,
      subject: "🏆 Bienvenido al Prode Mundial 2026!",
      html: getWelcomeHtml(name || "Crack"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Welcome email error:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
