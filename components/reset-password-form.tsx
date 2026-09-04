'use client'

import Image from 'next/image'
import { useState, type FormEvent, type ReactElement } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface ResetPasswordFormProps { token: string }

export function ResetPasswordForm({ token }: ResetPasswordFormProps): ReactElement {
  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [visible, setVisible] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); setError(''); setMessage('')
    if (password !== confirmPassword) { setError('The passwords do not match.'); return }
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/password-reset/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) })
      const payload = await response.json() as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? 'We could not reset your password.')
      setMessage('Your password has been reset. You can now return to JoeyClub and log in.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again.') } finally { setIsSubmitting(false) }
  }
  return <main className="flex min-h-svh items-center justify-center overflow-x-hidden bg-[#FDFAF6] p-4 sm:p-6"><section className="mx-auto w-full max-w-[500px] rounded-2xl border border-border bg-card p-5 shadow-[0_24px_80px_rgba(44,64,46,0.12)] sm:rounded-3xl sm:p-7"><div className="flex items-end gap-1"><Image src="/joey-logo.png" alt="JoeyClub" width={44} height={48} className="h-10 w-auto object-contain" /><span className="font-display text-[1.35rem] font-bold leading-none text-brand-dark">JoeyClub</span></div><h1 className="mt-4 font-display text-[1.9rem] font-bold text-brand-dark">Choose a new password</h1><p className="mt-1.5 text-[0.92rem] text-muted-foreground">Use at least 8 characters to keep your account secure.</p>{!token ? <p className="mt-5 rounded-xl bg-[#F7E3DC] px-3 py-2 text-sm font-semibold text-[#9D4E3C]">This reset link is incomplete. Please request a new one.</p> : <form className="mt-5 grid gap-4" onSubmit={submit}><PasswordField label="New password" value={password} onChange={setPassword} visible={visible} onToggle={() => setVisible((current) => !current)} /><PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} visible={visible} onToggle={() => setVisible((current) => !current)} />{error && <p className="rounded-xl bg-[#F7E3DC] px-3 py-2 text-sm font-semibold text-[#9D4E3C]">{error}</p>}{message && <p className="rounded-xl bg-[#E6EDE3] px-3 py-2 text-sm font-semibold text-brand-dark">{message}</p>}{message ? <a href="/" className="mt-1 block rounded-full bg-primary px-6 py-3 text-center font-bold text-primary-foreground transition-colors hover:bg-brand-dark">Return to JoeyClub</a> : <button type="submit" disabled={isSubmitting} className="mt-1 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground disabled:opacity-60">{isSubmitting ? 'Saving…' : 'Reset password'}</button>}</form>}</section></main>
}

interface PasswordFieldProps { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }
function PasswordField({ label, value, onChange, visible, onToggle }: PasswordFieldProps): ReactElement { return <label className="grid gap-1.5 text-[0.86rem] font-bold text-brand-dark"><span>{label}</span><span className="relative"><input required minLength={8} type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} className="auth-field pr-12" autoComplete="new-password" /><button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-primary" aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></label> }
