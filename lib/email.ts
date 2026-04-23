import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'GLOMMENS MUAY THAI <noreply@glommensmuaythai.com>'

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Återställ ditt lösenord – GLOMMENS MUAY THAI',
    html: `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#18181b;border:1px solid #27272a;border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);padding:32px 32px 24px;text-align:center;">
              <p style="margin:0 0 8px;color:#fca5a5;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;">Glommens Muay Thai</p>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:1px;">ÅTERSTÄLL LÖSENORD</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#a1a1aa;font-size:15px;line-height:1.6;">
                Vi fick en förfrågan om att återställa lösenordet för ditt konto. Klicka på knappen nedan för att välja ett nytt lösenord.
              </p>
              <p style="margin:0 0 28px;color:#71717a;font-size:13px;line-height:1.6;">
                Länken är giltig i <strong style="color:#a1a1aa;">1 timme</strong>. Om du inte begärde detta kan du ignorera detta mejl.
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}"
                       style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:1px;padding:14px 36px;border-radius:8px;text-transform:uppercase;">
                      Återställ lösenord
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback URL -->
              <p style="margin:28px 0 0;color:#52525b;font-size:12px;line-height:1.6;">
                Fungerar inte knappen? Kopiera denna länk:<br />
                <a href="${resetUrl}" style="color:#dc2626;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #27272a;text-align:center;">
              <p style="margin:0;color:#52525b;font-size:11px;">
                © ${new Date().getFullYear()} GLOMMENS MUAY THAI · Falkenberg
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  })
}
