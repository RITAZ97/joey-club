interface EmailMessage {
  to: string
  subject: string
  html: string
  replyTo?: string
  from?: string
  headers?: Record<string, string>
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
    body: JSON.stringify({ from: message.from ?? from, to: [message.to], subject: message.subject, html: message.html, ...(message.replyTo ? { reply_to: message.replyTo } : {}), ...(message.headers ? { headers: message.headers } : {}) }),
  })
  if (!response.ok) {
    const details = await response.text()
    console.error('Resend email delivery failed', { status: response.status, details })
    throw new Error('The email could not be sent.')
  }
  return true
}

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Your JoeyClub verification code',
    html: `<p>Welcome to JoeyClub.</p><p>Enter this code to verify your email and activate your 10 free beta credits:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;">${code}</p><p>This code expires in 15 minutes.</p>`,
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

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)
}

export async function sendContactEmail(input: { name: string; email: string; role: string; inquiry: string; message: string }): Promise<boolean> {
  const name = escapeHtml(input.name)
  const role = escapeHtml(input.role)
  const inquiry = escapeHtml(input.inquiry)
  const message = escapeHtml(input.message).replace(/\r?\n/g, '<br />')
  const senderEmail = input.email.trim()

  const sentToTeam = await sendEmail({
    to: 'info@joeyclub.com.au',
    replyTo: senderEmail,
    subject: `JoeyClub contact: ${input.inquiry}`,
    html: `<h1>New JoeyClub contact message</h1><p><strong>Name:</strong> ${name}</p><p><strong>I’m a:</strong> ${role}</p><p><strong>Inquiry type:</strong> ${inquiry}</p><p><strong>Message:</strong><br />${message}</p><hr /><p><strong>Reply to:</strong> <a href="mailto:${escapeHtml(senderEmail)}">${escapeHtml(senderEmail)}</a></p>`,
  })
  if (!sentToTeam) return false

  await sendAcknowledgementEmail({
    to: senderEmail,
    greeting: input.name.trim() ? `Hi ${name},` : 'Hi there,',
  })
  return true
}

async function sendAcknowledgementEmail(input: { to: string; greeting: string; subject?: string; inReplyTo?: string }): Promise<boolean> {
  return sendEmail({
    from: 'JoeyClub <noreply@joeyclub.com.au>',
    to: input.to,
    subject: input.subject ?? 'We’ve received your JoeyClub message',
    html: `<p>${input.greeting}</p><p>Thanks for getting in touch with JoeyClub.</p><p>We’ve received your message and will review your enquiry or feedback. We’ll get back to you within 3 to 5 business days.</p><p>Please don’t reply to this email, as this inbox isn’t monitored.</p><p>Warmly,<br />The JoeyClub Team</p>`,
    ...(input.inReplyTo ? { headers: { 'In-Reply-To': input.inReplyTo, References: input.inReplyTo } } : {}),
  })
}

export async function sendDirectEmailAcknowledgement(input: { email: string; subject?: string; messageId?: string }): Promise<boolean> {
  return sendAcknowledgementEmail({
    to: input.email,
    greeting: 'Hi,',
    subject: input.subject ? `Re: ${input.subject}` : undefined,
    inReplyTo: input.messageId,
  })
}
