const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const FROM = process.env.EMAIL_FROM ?? 'AccIQ <noreply@step2dev.com>'

interface Mail { to: string; subject: string; html: string; text: string }

export async function sendEmail(mail: Mail) {
  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { error } = await resend.emails.send({ from: FROM, ...mail })
      if (error) throw new Error(error.message)
      return
    }

    if (process.env.SMTP_HOST) {
      const nodemailer = await import('nodemailer')
      const t = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
      await t.sendMail({ from: FROM, ...mail })
      return
    }

    // Dev fallback — print to terminal
    console.log('\n━━━━━━━━━━━━━━━━ 📧 EMAIL (dev mode) ━━━━━━━━━━━━━━━━')
    console.log('To:', mail.to)
    console.log('Subject:', mail.subject)
    console.log('Body:', mail.text)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  } catch (e) {
    console.error('Email send failed:', e)
  }
}

export function verifyEmailTemplate(name: string, token: string) {
  const link = `${APP_URL}/auth/verify-email?token=${token}`
  return {
    subject: 'Verify your AccIQ account',
    html: `
<div style="background:#080c10;padding:48px 24px;font-family:monospace;color:#e6edf3;min-height:100vh">
  <div style="max-width:480px;margin:0 auto;background:#0d1117;border:1px solid #30363d;border-radius:16px;padding:48px 40px">
    <h1 style="font-size:32px;font-weight:900;margin:0 0 32px;letter-spacing:-1px">Step2Dev</h1>
    <p style="margin:0 0 8px;font-size:15px">Hey <strong>${name}</strong>,</p>
    <p style="color:#7d8590;font-size:14px;line-height:1.7;margin:0 0 32px">
      Click the button below to verify your email and activate your account.
    </p>
    <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:16px 36px;border-radius:10px">
      VERIFY EMAIL
    </a>
    <p style="color:#7d8590;font-size:12px;margin:32px 0 0">
      Link expires in 24 hours.<br>
      Or copy: <a href="${link}" style="color:#3b82f6">${link}</a>
    </p>
  </div>
</div>`,
    text: `Step2Dev\n\nHey ${name},\n\nVerify your email:\n${link}\n\nExpires in 24 hours.`,
  }
}
