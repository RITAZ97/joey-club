interface EmailMessage {
  to: string
  subject: string
  html: string
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    console.warn(`Transactional email is not configured. Email link for ${message.to}: ${message.html.match(/https?:\/\/[^"<]+/)?.[0] ?? 'unavailable'}`)
    return false
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html }),
  })
  if (!response.ok) throw new Error('The verification email could not be sent.')
  return true
}

export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  const verifyUrl = `${appUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`
  return sendEmail({
    to: email,
    subject: 'Verify your JoeyClub email',
    html: `<p>Welcome to JoeyClub.</p><p><a href="${verifyUrl}">Verify your email address</a> to finish securing your account.</p>`,
  })
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const resetUrl = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`
  return sendEmail({
    to: email,
    subject: 'Reset your JoeyClub password',
    html: `<p>We received a request to reset your JoeyClub password.</p><p><a href="${resetUrl}">Choose a new password</a>. This link expires in one hour.</p>`,
  })
}
