'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type FormEvent, type ReactElement, type ReactNode } from 'react'
import { ChevronDown, Eye, EyeOff, X } from 'lucide-react'
import { type AuthMode, type Occupation, type YearLevel, useAuth } from '@/components/auth-context'

interface AuthModalProps { initialMode: AuthMode | 'verify-email'; onClose: () => void }
type ModalStep = AuthMode | 'onboarding' | 'forgot-password' | 'verify-email'

const australianLocations = [
  'Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland',
  'South Australia', 'Tasmania', 'Victoria', 'Western Australia', 'Out of Australia',
] as const

export function AuthModal({ initialMode, onClose }: AuthModalProps): ReactElement {
  const { completeOnboarding, login, register, requestPasswordReset, resendVerificationCode, skipOnboarding, verifyEmail } = useAuth()
  const [step, setStep] = useState<ModalStep>(initialMode)
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false)
  const [occupation, setOccupation] = useState<Occupation>('teacher')
  const [yearLevel, setYearLevel] = useState<YearLevel>('3-5')
  const [location, setLocation] = useState<(typeof australianLocations)[number]>('New South Wales')
  const [otherCountry, setOtherCountry] = useState<string>('')
  const [forgotSent, setForgotSent] = useState<boolean>(false)
  const [verificationCode, setVerificationCode] = useState<string>('')
  const [resendMessage, setResendMessage] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  useEffect(() => { setStep(initialMode); setError(''); setForgotSent(false) }, [initialMode])

  const submitCredentials = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); setError(''); setIsSubmitting(true)
    try {
      if (step === 'signup') { await register({ firstName, lastName, email, password }); setStep('verify-email') }
      else { const user = await login({ email, password }); if (user.onboardingComplete) onClose(); else setStep(user.emailVerified ? 'onboarding' : 'verify-email') }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again.') } finally { setIsSubmitting(false) }
  }

  const submitVerification = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); setError(''); setIsSubmitting(true)
    try { await verifyEmail(verificationCode); setStep('onboarding') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again.') } finally { setIsSubmitting(false) }
  }

  const resendCode = async (): Promise<void> => {
    setError(''); setResendMessage(''); setIsSubmitting(true)
    try { await resendVerificationCode(); setResendMessage('A new code is on its way to your inbox.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again.') } finally { setIsSubmitting(false) }
  }

  const submitOnboarding = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); setError(''); setIsSubmitting(true)
    try { await completeOnboarding({ occupation, yearLevel, stateTerritory: location, country: location === 'Out of Australia' ? otherCountry : '' }); onClose() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again.') } finally { setIsSubmitting(false) }
  }

  const submitForgotPassword = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); setError(''); setIsSubmitting(true)
    try { await requestPasswordReset(email); setForgotSent(true) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again.') } finally { setIsSubmitting(false) }
  }

  const skipQuickQuestions = async (): Promise<void> => {
    setError(''); setIsSubmitting(true)
    try { await skipOnboarding(); onClose() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again.') } finally { setIsSubmitting(false) }
  }

  const canClose = step !== 'onboarding'
  return <div className="fixed inset-0 z-[100] flex min-h-svh items-center justify-center overflow-x-hidden bg-brand-dark/25 p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => { if (event.target === event.currentTarget && canClose) onClose() }}>
    <section className="relative mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-[500px] overflow-x-hidden overflow-y-auto rounded-2xl border border-border bg-[#FDFAF6] p-5 shadow-[0_24px_80px_rgba(44,64,46,0.22)] sm:max-h-[92dvh] sm:rounded-3xl sm:p-7">
      {canClose && <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-brand-dark" aria-label="Close authentication"><X className="size-5" /></button>}
      {step === 'onboarding' && <button type="button" onClick={() => { void skipQuickQuestions() }} disabled={isSubmitting} className="absolute right-5 top-5 text-sm font-semibold text-primary underline underline-offset-4 hover:text-brand-dark disabled:opacity-60">Skip</button>}
      <BrandLockup />
      {step === 'onboarding' ? <OnboardingForm occupation={occupation} yearLevel={yearLevel} location={location} otherCountry={otherCountry} error={error} isSubmitting={isSubmitting} onOccupation={setOccupation} onYearLevel={setYearLevel} onLocation={setLocation} onCountry={setOtherCountry} onSubmit={submitOnboarding} /> : step === 'verify-email' ? <VerificationForm email={email} code={verificationCode} error={error} resendMessage={resendMessage} isSubmitting={isSubmitting} onCode={setVerificationCode} onSubmit={submitVerification} onResend={() => { void resendCode() }} onSkip={() => { setError(''); setStep('onboarding') }} /> : step === 'forgot-password' ? <ForgotPasswordForm email={email} error={error} sent={forgotSent} isSubmitting={isSubmitting} onEmail={setEmail} onSubmit={submitForgotPassword} onBack={() => { setStep('login'); setError(''); setForgotSent(false) }} /> : <CredentialsForm mode={step} firstName={firstName} lastName={lastName} email={email} password={password} passwordVisible={passwordVisible} error={error} isSubmitting={isSubmitting} onFirstName={setFirstName} onLastName={setLastName} onEmail={setEmail} onPassword={setPassword} onPasswordVisible={() => setPasswordVisible((visible) => !visible)} onSubmit={submitCredentials} onForgot={() => { setStep('forgot-password'); setError('') }} onToggleMode={() => { setStep(step === 'signup' ? 'login' : 'signup'); setError('') }} />}
    </section>
  </div>
}

const occupationOptions: Array<{ value: Occupation; label: string }> = [{ value: 'teacher', label: 'Teacher' }, { value: 'parent', label: 'Parent' }, { value: 'other', label: 'Other' }]
const yearLevelOptions: Array<{ value: YearLevel; label: string }> = [{ value: '0-3', label: '0-3' }, { value: '3-5', label: '3-5' }]

interface OnboardingFormProps { occupation: Occupation; yearLevel: YearLevel; location: (typeof australianLocations)[number]; otherCountry: string; error: string; isSubmitting: boolean; onOccupation: (value: Occupation) => void; onYearLevel: (value: YearLevel) => void; onLocation: (value: (typeof australianLocations)[number]) => void; onCountry: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }
function OnboardingForm(props: OnboardingFormProps): ReactElement { return <form className="mt-4" onSubmit={props.onSubmit}><p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-primary">A few quick details</p><h1 id="auth-title" className="mt-1 font-display text-[1.75rem] font-bold leading-tight text-brand-dark">About you</h1><p className="mt-1.5 text-[0.92rem] text-muted-foreground">So we can recommend more relevant early-learning resources.</p><div className="mt-5 grid gap-4"><Field label="Occupation"><Dropdown value={props.occupation} options={occupationOptions} onChange={(value) => props.onOccupation(value as Occupation)} /></Field><Field label="Year level"><Dropdown value={props.yearLevel} options={yearLevelOptions} onChange={(value) => props.onYearLevel(value as YearLevel)} /></Field><Field label="State or territory"><Dropdown value={props.location} options={australianLocations.map((item) => ({ value: item, label: item }))} onChange={(value) => props.onLocation(value as (typeof australianLocations)[number])} /></Field>{props.location === 'Out of Australia' && <Field label="Country (optional)"><input value={props.otherCountry} onChange={(event) => props.onCountry(event.target.value)} className="auth-field" autoComplete="country-name" placeholder="Your country" /></Field>}</div><Feedback error={props.error} /><button type="submit" disabled={props.isSubmitting} className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-[0.98rem] font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">{props.isSubmitting ? 'Saving…' : 'Save and continue'}</button></form> }

interface VerificationFormProps { email: string; code: string; error: string; resendMessage: string; isSubmitting: boolean; onCode: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onResend: () => void; onSkip: () => void }
function VerificationForm(props: VerificationFormProps): ReactElement {
  return <form className="mt-4" onSubmit={props.onSubmit}>
    <h1 id="auth-title" className="font-display text-[1.9rem] font-bold leading-tight text-brand-dark">Check your inbox</h1>
    <p className="mt-1.5 text-[0.92rem] text-muted-foreground">{props.email ? <>We sent a 6-digit code to <span className="font-bold text-brand-dark">{props.email}</span>.</> : 'We sent a 6-digit code to your email.'} Enter it below to activate your 10 free beta credits.</p>
    <div className="mt-5"><Field label="Verification code *"><input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" value={props.code} onChange={(event) => props.onCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="auth-field text-center text-lg font-bold tracking-[0.5em]" placeholder="••••••" /></Field></div>
    {props.resendMessage && <p className="mt-4 rounded-xl bg-[#E6EDE3] px-3 py-2 text-sm font-semibold text-brand-dark">{props.resendMessage}</p>}
    <Feedback error={props.error} />
    <button type="submit" disabled={props.isSubmitting || props.code.length !== 6} className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-[0.98rem] font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">{props.isSubmitting ? 'Verifying…' : 'Verify email'}</button>
    <div className="mt-4 flex items-center justify-between text-sm font-semibold"><button type="button" onClick={props.onResend} disabled={props.isSubmitting} className="text-primary underline underline-offset-4 hover:text-brand-dark disabled:opacity-60">Resend code</button><button type="button" onClick={props.onSkip} disabled={props.isSubmitting} className="text-muted-foreground underline underline-offset-4 hover:text-brand-dark disabled:opacity-60">I'll do this later</button></div>
  </form>
}

interface ForgotPasswordFormProps { email: string; error: string; sent: boolean; isSubmitting: boolean; onEmail: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onBack: () => void }
function ForgotPasswordForm(props: ForgotPasswordFormProps): ReactElement { return <form className="mt-4" onSubmit={props.onSubmit}><h1 id="auth-title" className="font-display text-[1.9rem] font-bold leading-tight text-brand-dark">Reset your password</h1><p className="mt-1.5 text-[0.92rem] text-muted-foreground">Enter your email and we’ll send you a secure reset link.</p><div className="mt-5"><Field label="Email *"><input required type="email" value={props.email} onChange={(event) => props.onEmail(event.target.value)} className="auth-field" autoComplete="email" /></Field></div>{props.sent && <p className="mt-4 rounded-xl bg-[#E6EDE3] px-3 py-2 text-sm font-semibold text-brand-dark">If an account uses that email, a reset link is on its way.</p>}<Feedback error={props.error} /><button type="submit" disabled={props.isSubmitting} className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-[0.98rem] font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">{props.isSubmitting ? 'Sending…' : 'Send reset link'}</button><button type="button" onClick={props.onBack} className="mt-3 w-full text-sm font-bold text-primary underline underline-offset-4">Back to log in</button></form> }

interface CredentialsFormProps { mode: AuthMode; firstName: string; lastName: string; email: string; password: string; passwordVisible: boolean; error: string; isSubmitting: boolean; onFirstName: (value: string) => void; onLastName: (value: string) => void; onEmail: (value: string) => void; onPassword: (value: string) => void; onPasswordVisible: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onForgot: () => void; onToggleMode: () => void }
function CredentialsForm(props: CredentialsFormProps): ReactElement { const isSignUp = props.mode === 'signup'; return <form className="mt-4" onSubmit={props.onSubmit}><h1 id="auth-title" className="font-display text-[1.9rem] font-bold leading-tight text-brand-dark">{isSignUp ? 'Create your account' : 'Welcome back'}</h1><p className="mt-1.5 text-[0.92rem] text-muted-foreground">{isSignUp ? 'Already have an account?' : 'New to JoeyClub?'} <button type="button" onClick={props.onToggleMode} className="font-bold text-primary underline underline-offset-4">{isSignUp ? 'Log in' : 'Join us'}</button></p><div className="mt-5 grid gap-4">{isSignUp && <div className="grid gap-4 sm:grid-cols-2"><Field label="First name *"><input required value={props.firstName} onChange={(event) => props.onFirstName(event.target.value)} className="auth-field" autoComplete="given-name" /></Field><Field label="Last name"><input value={props.lastName} onChange={(event) => props.onLastName(event.target.value)} className="auth-field" autoComplete="family-name" /></Field></div>}<Field label="Email *"><input required type="email" value={props.email} onChange={(event) => props.onEmail(event.target.value)} className="auth-field" autoComplete="email" /></Field><Field label="Password *"><PasswordInput value={props.password} visible={props.passwordVisible} onChange={props.onPassword} onToggle={props.onPasswordVisible} autoComplete={isSignUp ? 'new-password' : 'current-password'} /></Field></div>{!isSignUp && <button type="button" onClick={props.onForgot} className="mt-2 text-sm font-semibold text-primary underline underline-offset-4 hover:text-brand-dark">Forgot password?</button>}<Feedback error={props.error} /><button type="submit" disabled={props.isSubmitting} className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-[0.98rem] font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">{props.isSubmitting ? 'Please wait…' : isSignUp ? 'Create account' : 'Log in'}</button></form> }

function BrandLockup(): ReactElement { return <div className="flex items-end gap-1"><Image src="/joey-logo.png" alt="JoeyClub" width={44} height={48} className="h-10 w-auto object-contain" /><span className="font-display text-[1.35rem] font-bold leading-none text-brand-dark">JoeyClub</span></div> }
interface FieldProps { label: string; children: ReactNode }
function Field({ label, children }: FieldProps): ReactElement { return <label className="grid gap-1.5 text-[0.86rem] font-bold text-brand-dark"><span>{label}</span>{children}</label> }
interface DropdownProps { value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }
function Dropdown({ value, options, onChange }: DropdownProps): ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (event: MouseEvent): void => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const label = options.find((option) => option.value === value)?.label ?? value
  return <div ref={ref} className="relative">
    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="flex h-11 w-full items-center justify-between rounded-lg border border-primary bg-card px-4 text-left text-sm font-semibold text-brand-dark"><span className="truncate">{label}</span><ChevronDown className={`ml-3 size-4 shrink-0 text-primary transition-transform ${open ? 'rotate-180' : ''}`} /></button>
    {open && <div className="absolute left-0 right-0 z-30 mt-2 max-h-60 overflow-auto rounded-lg border border-border bg-card p-1.5 shadow-[0_18px_38px_-20px_rgba(63,81,54,0.55)]">{options.map((option) => <button key={option.value} type="button" onClick={() => { onChange(option.value); setOpen(false) }} className={`block w-full rounded-md px-4 py-2.5 text-left text-sm hover:bg-[#EDF3E8] ${option.value === value ? 'bg-[#DCE8D2] font-semibold text-brand-dark' : 'text-brand-dark'}`}>{option.label}</button>)}</div>}
  </div>
}
interface PasswordInputProps { value: string; visible: boolean; onChange: (value: string) => void; onToggle: () => void; autoComplete: string }
function PasswordInput({ value, visible, onChange, onToggle, autoComplete }: PasswordInputProps): ReactElement { return <span className="relative block"><input required type={visible ? 'text' : 'password'} minLength={8} value={value} onChange={(event) => onChange(event.target.value)} className="auth-field pr-12" autoComplete={autoComplete} /><button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-primary" aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span> }
function Feedback({ error }: { error: string }): ReactElement | null { return error ? <p className="mt-4 rounded-xl bg-[#F7E3DC] px-3 py-2 text-sm font-semibold text-[#9D4E3C]">{error}</p> : null }
