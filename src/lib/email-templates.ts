export function getWelcomeHtml(name: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding-bottom:24px;">
    <div style="font-size:52px;">🏆</div>
    <h1 style="color:#18181b;font-size:26px;font-weight:800;letter-spacing:-0.5px;margin:8px 0 0;">PRODE MUNDIAL 2026</h1>
    <p style="color:#a1a1aa;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:4px 0 0;">Canadá · México · Estados Unidos</p>
  </td></tr>
  <tr><td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <tr><td style="padding:32px 24px 0;text-align:center;">
        <p style="font-size:28px;margin:0 0 12px;">👋</p>
        <h2 style="color:#18181b;font-size:22px;font-weight:800;margin:0 0 8px;">Bienvenido, ${name}!</h2>
        <p style="color:#71717a;font-size:14px;margin:0;line-height:1.6;">Ya estás adentro del prode más grande del mundial.<br>Es hora de demostrar que sabés de fútbol.</p>
      </td></tr>
      <tr><td style="padding:24px 24px 0;"><div style="height:1px;background:#f4f4f5;"></div></td></tr>
      <tr><td style="padding:24px;">
        <p style="color:#18181b;font-size:15px;font-weight:700;margin:0 0 16px;text-align:center;">Cómo funciona</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td width="48" valign="top" style="padding-right:12px;"><div style="background:#f0fdf4;width:40px;height:40px;border-radius:10px;text-align:center;line-height:40px;font-size:18px;">🎯</div></td><td valign="top" style="padding-bottom:16px;"><p style="color:#18181b;font-size:14px;font-weight:600;margin:0 0 2px;">Cargá tus pronósticos</p><p style="color:#71717a;font-size:12px;margin:0;line-height:1.4;">Predecí el resultado de cada partido antes de que arranque</p></td></tr>
          <tr><td width="48" valign="top" style="padding-right:12px;"><div style="background:#fefce8;width:40px;height:40px;border-radius:10px;text-align:center;line-height:40px;font-size:18px;">⚡</div></td><td valign="top" style="padding-bottom:16px;"><p style="color:#18181b;font-size:14px;font-weight:600;margin:0 0 2px;">Sumá puntos</p><p style="color:#71717a;font-size:12px;margin:0;line-height:1.4;">Los resultados se actualizan en vivo y tus puntos se calculan automáticamente</p></td></tr>
          <tr><td width="48" valign="top" style="padding-right:12px;"><div style="background:#fef2f2;width:40px;height:40px;border-radius:10px;text-align:center;line-height:40px;font-size:18px;">🏆</div></td><td valign="top"><p style="color:#18181b;font-size:14px;font-weight:600;margin:0 0 2px;">Competí con todos</p><p style="color:#71717a;font-size:12px;margin:0;line-height:1.4;">Mirá la tabla de posiciones y demostrá quién sabe más</p></td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 24px;"><div style="height:1px;background:#f4f4f5;"></div></td></tr>
      <tr><td style="padding:24px;text-align:center;">
        <p style="color:#18181b;font-size:15px;font-weight:700;margin:0 0 16px;">Sistema de puntos</p>
        <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
          <td style="padding:0 8px;"><div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 24px;text-align:center;"><p style="color:#22c55e;font-size:28px;font-weight:800;margin:0;">+3</p><p style="color:#15803d;font-size:11px;font-weight:600;margin:4px 0 0;">Resultado exacto</p></div></td>
          <td style="padding:0 8px;"><div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:16px 24px;text-align:center;"><p style="color:#eab308;font-size:28px;font-weight:800;margin:0;">+1</p><p style="color:#a16207;font-size:11px;font-weight:600;margin:4px 0 0;">Acertar ganador</p></div></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 24px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:12px;"><tr>
          <td width="33%" style="padding:16px;text-align:center;border-right:1px solid #f4f4f5;"><p style="color:#22c55e;font-size:24px;font-weight:800;margin:0;">48</p><p style="color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:2px 0 0;">Selecciones</p></td>
          <td width="33%" style="padding:16px;text-align:center;border-right:1px solid #f4f4f5;"><p style="color:#22c55e;font-size:24px;font-weight:800;margin:0;">12</p><p style="color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:2px 0 0;">Grupos</p></td>
          <td width="33%" style="padding:16px;text-align:center;"><p style="color:#22c55e;font-size:24px;font-weight:800;margin:0;">104</p><p style="color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:2px 0 0;">Partidos</p></td>
        </tr></table>
      </td></tr>
      <tr><td align="center" style="padding:0 24px 24px;"><a href="https://prode-vamo-arriba.vercel.app" style="display:block;background:#22c55e;color:white;padding:16px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:700;text-align:center;">Empezar a cargar pronósticos →</a></td></tr>
      <tr><td style="background:#18181b;padding:20px 24px;text-align:center;"><p style="color:#a1a1aa;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">El mundial arranca el</p><p style="color:#ffffff;font-size:20px;font-weight:800;margin:0;">11 de junio de 2026</p><p style="color:#22c55e;font-size:12px;font-weight:600;margin:4px 0 0;">Cargá tus pronósticos antes!</p></td></tr>
    </table>
  </td></tr>
  <tr><td align="center" style="padding-top:24px;"><p style="color:#a1a1aa;font-size:11px;margin:0;">Prode Mundial 2026 · Predecí · Competí · Demostrá que sabés</p></td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export function getReminderHtml(
  homeTeam: { name: string; flag_emoji: string },
  awayTeam: { name: string; flag_emoji: string }
) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding-bottom:24px;">
    <div style="font-size:44px;">⚽</div>
    <h1 style="color:#18181b;font-size:22px;font-weight:800;letter-spacing:-0.5px;margin:8px 0 0;">PRODE MUNDIAL 2026</h1>
  </td></tr>
  <tr><td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <tr><td style="padding:28px 24px 20px;">
        <p style="text-align:center;color:#a1a1aa;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 20px;">Próximo partido</p>
        <p style="text-align:center;margin:0 0 8px;"><span style="font-size:32px;">${homeTeam.flag_emoji}</span></p>
        <p style="text-align:center;color:#18181b;font-size:22px;font-weight:800;margin:0 0 16px;">${homeTeam.name}</p>
        <p style="text-align:center;color:#a1a1aa;font-size:13px;font-weight:700;margin:0 0 16px;">VS</p>
        <p style="text-align:center;margin:0 0 8px;"><span style="font-size:32px;">${awayTeam.flag_emoji}</span></p>
        <p style="text-align:center;color:#18181b;font-size:22px;font-weight:800;margin:0 0 24px;">${awayTeam.name}</p>
      </td></tr>
      <tr><td style="padding:0 24px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;text-align:center;"><span style="color:#dc2626;font-size:15px;font-weight:700;">⏱ Arranca en 10 minutos!</span></td></tr></table>
      </td></tr>
      <tr><td style="padding:0 24px;"><div style="height:1px;background:#f4f4f5;"></div></td></tr>
      <tr><td style="padding:24px;text-align:center;">
        <p style="font-size:24px;margin:0 0 8px;">🚨</p>
        <p style="color:#18181b;font-size:17px;font-weight:700;margin:0 0 6px;">Loco, no cargaste tu pronóstico!</p>
        <p style="color:#71717a;font-size:13px;margin:0;line-height:1.5;">Si no lo cargás antes del pitazo,<br>perdés la chance de sumar puntos</p>
      </td></tr>
      <tr><td align="center" style="padding:0 24px 28px;"><a href="https://prode-vamo-arriba.vercel.app" style="display:inline-block;background:#22c55e;color:white;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;">Cargar pronóstico ahora →</a></td></tr>
      <tr><td style="background:#fafafa;padding:16px 24px;text-align:center;border-top:1px solid #f4f4f5;">
        <span style="display:inline-block;background:#fefce8;color:#a16207;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;margin:0 3px;">+1 ganador</span>
        <span style="display:inline-block;background:#f0fdf4;color:#15803d;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;margin:0 3px;">+3 exacto</span>
      </td></tr>
    </table>
  </td></tr>
  <tr><td align="center" style="padding-top:24px;"><p style="color:#a1a1aa;font-size:11px;margin:0;">Prode Mundial 2026 · Predecí · Competí · Demostrá que sabés</p></td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
