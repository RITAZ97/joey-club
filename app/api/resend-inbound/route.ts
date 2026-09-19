import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sendDirectEmailAcknowledgement } from '@/lib/auth/email'

export const runtime = 'nodejs'

type ReceivedEmailEvent = {
  type?: string
  data?: {
    from?: string
    to?: string[]
    subject?: string
    message_id?: string
  }
}

function senderEmail(value: string): string {
  return (value.match(/<([^>]+)>/)?.[1] ?? value).trim().toLowerCase()
}

function verifyWebhook(rawBody: string, headers: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  const id = headers.get('svix-id')
  const timestamp = headers.get('svix-timestamp')
  const signatures = headers.get('svix-signature')
  if (!secret || !id || !timestamp || !signatures) return false

  const timestampMs = Number(timestamp) * 1_000
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1_000) return false

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', secretBytes).update(`${id}.${timestamp}.${rawBody}`).digest('base64')
  return signatures.split(' ').some((entry) => {
    const [, signature] = entry.split(',', 2)
    if (!signature) return false
    const actualBytes = Buffer.from(signature)
    const expectedBytes = Buffer.from(expected)
    return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
  })
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  if (!verifyWebhook(rawBody, request.headers)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 })
  }

  try {
    const event = JSON.parse(rawBody) as ReceivedEmailEvent
    if (event.type !== 'email.received') return NextResponse.json({ ok: true, ignored: true })

    const data = event.data
    const from = data?.from ? senderEmail(data.from) : ''
    const sentToInfo = data?.to?.some((address) => address.trim().toLowerCase() === 'info@joeyclub.com.au')
    if (!from || from === 'noreply@joeyclub.com.au' || !sentToInfo) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    await sendDirectEmailAcknowledgement({ email: from, subject: data?.subject, messageId: data?.message_id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Inbound email acknowledgement failed', error)
    return NextResponse.json({ error: 'Unable to process inbound email.' }, { status: 500 })
  }
}
