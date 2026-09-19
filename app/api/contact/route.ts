import { NextResponse } from 'next/server'
import { sendContactEmail } from '@/lib/auth/email'

export const runtime = 'nodejs'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = clean(body.name, 160)
    const email = clean(body.email, 254)
    const role = clean(body.role, 120)
    const inquiry = clean(body.inquiry, 120)
    const message = clean(body.message, 5_000)

    const fieldErrors: Record<string, string> = {}
    if (!email) fieldErrors.email = 'Email Address is required.'
    else if (!emailPattern.test(email)) fieldErrors.email = 'Please provide a valid email address.'
    if (!message) fieldErrors.message = 'Message / Feedback is required.'
    if (Object.keys(fieldErrors).length) {
      return NextResponse.json({ error: 'Please check the required fields.', fieldErrors }, { status: 400 })
    }

    const sent = await sendContactEmail({ name, email, role: role || 'Not specified', inquiry: inquiry || 'Not specified', message })
    if (!sent) {
      return NextResponse.json({ error: 'Email delivery is not configured yet. Please email info@joeyclub.com.au directly.' }, { status: 503 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Contact form delivery failed', error)
    return NextResponse.json({ error: 'We could not send your message. Please try again or email info@joeyclub.com.au directly.' }, { status: 500 })
  }
}
