'use client'

import Image from 'next/image'
import { useEffect, useState, type FormEvent, type ReactElement, type ReactNode } from 'react'
import { ChevronDown, Eye, EyeOff, X } from 'lucide-react'
import { type AuthMode, type Occupation, type YearLevel, useAuth } from '@/components/auth-context'

interface AuthModalProps { initialMode: AuthMode; onClose: () => void }
type ModalStep = AuthMode | 'onboarding' | 'forgot-password'

const australianLocations = [
  'Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland',
  'South Australia', 'Tasmania', 'Victoria', 'Western Australia', 'Out of Australia',
] as const

export function AuthModal({ initialMode, onClose }: AuthModalProps): ReactElement {
  const { completeOnboarding, login, register, requestPasswordReset, skipOnboarding } = useAuth()
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
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  useEffect(() => { setStep(initialMode); setError(''); setForgotSent(false) }, [initialMode])

  const submitCredentials = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); setError(''); setIsSubmitting(true)
    try {
      if (step === 'signup') { await register({ firstName, lastName, email, password }); setStep('onboarding') }
      else { const user = await login({ email, password }); if (user.onboardingComplete) onClose(); else setStep('onboarding') }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again.') } finally { setIsSubmitting(false) }
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
      {step === 'onboarding' ? <OnboardingForm occupation={occupation} yearLevel={yearLevel} location={location} otherCountry={otherCountry} error={error} isSubmitting={isSubmitting} onOccupation={setOccupation} onYearLevel={setYearLevel} onLocation={setLocation} onCountry={setOtherCountry} onSubmit={submitOnboarding} /> : step === 'forgot-password' ? <ForgotPasswordForm email={email} error={error} sent={forgotSent} isSubmitting={isSubmitting} onEmail={setEmail} onSubmit={submitForgotPassword} onBack={() => { setStep('login'); setError(''); setForgotSent(false) }} /> : <CredentialsForm mode={step} firstName={firstName} lastName={lastName} email={email} password={password} passwordVisible={passwordVisible} error={error} isSubmitting={isSubmitting} onFirstName={setFirstName} onLastName={setLastName} onEmail={setEmail} onPassword={setPassword} onPasswordVisible={() => setPasswordVisible((visible) => !visible)} onSubmit={submitCredentials} onForgot={() => { setStep('forgot-password'); setError('') }} onToggleMode={() => { setStep(step === 'signup' ? 'login' : 'signup'); setError('') }} />}
    </section>
  </div>
}

interface OnboardingFormProps { occupation: Occupation; yearLevel: YearLevel; location: (typeof australianLocations)[number]; otherCountry: string; error: string; isSubmitting: boolean; onOccupation: (value: Occupation) => void; onYearLevel: (value: YearLevel) => void; onLocation: (value: (typeof australianLocations)[number]) => void; onCountry: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }
function OnboardingForm(props: OnboardingFormProps): ReactElement { return <form className="mt-4" onSubmit={props.onSubmit}><p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-primary">A few quick details</p><h1 id="auth-title" className="mt-1 font-display text-[1.75rem] font-bold leading-tight text-brand-dark">About you</h1><p className="mt-1.5 text-[0.92rem] text-muted-foreground">So we can recommend more relevant early-learning resources.</p><div className="mt-5 grid gap-4"><SelectField label="Occupation" value={props.occupation} onChange={(value) => props.onOccupation(value as Occupation)}><option value="teacher">Teacher</option><option value="parent">Parent</option><option value="other">Other</option></SelectField><SelectField label="Year level" value={props.yearLevel} onChange={(value) => props.onYearLevel(value as YearLevel)}><option value="0-3">0-3</option><option value="3-5">3-5</option></SelectField><SelectField label="State or territory" value={props.location} onChange={(value) => props.onLocation(value as (typeof australianLocations)[number])}>{australianLocations.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>{props.location === 'Out of Australia' && <Field label="Country (optional)"><input value={props.otherCountry} onChange={(event) => props.onCountry(event.target.value)} className="auth-field" autoComplete="country-name" placeholder="Your country" /></Field>}</div><Feedback error={props.error} /><button type="submit" disabled={props.isSubmitting} className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-[0.98rem] font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">{props.isSubmitting ? 'Saving…' : 'Save and continue'}</button></form> }

interface ForgotPasswordFormProps { email: string; error: string; sent: boolean; isSubmitting: boolean; onEmail: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onBack: () => void }
function ForgotPasswordForm(props: ForgotPasswordFormProps): ReactElement { return <form className="mt-4" onSubmit={props.onSubmit}><h1 id="auth-title" className="font-display text-[1.9rem] font-bold leading-tight text-brand-dark">Reset your password</h1><p className="mt-1.5 text-[0.92rem] text-muted-foreground">Enter your email and we’ll send you a secure reset link.</p><div className="mt-5"><Field label="Email *"><input required type="email" value={props.email} onChange={(event) => props.onEmail(event.target.value)} className="auth-field" autoComplete="email" /></Field></div>{props.sent && <p className="mt-4 rounded-xl bg-[#E6EDE3] px-3 py-2 text-sm font-semibold text-brand-dark">If an account uses that email, a reset link is on its way.</p>}<Feedback error={props.error} /><button type="submit" disabled={props.isSubmitting} className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-[0.98rem] font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">{props.isSubmitting ? 'Sending…' : 'Send reset link'}</button><button type="button" onClick={props.onBack} className="mt-3 w-full text-sm font-bold text-primary underline underline-offset-4">Back to log in</button></form> }

interface CredentialsFormProps { mode: AuthMode; firstName: string; lastName: string; email: string; password: string; passwordVisible: boolean; error: string; isSubmitting: boolean; onFirstName: (value: string) => void; onLastName: (value: string) => void; onEmail: (value: string) => void; onPassword: (value: string) => void; onPasswordVisible: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onForgot: () => void; onToggleMode: () => void }
function CredentialsForm(props: CredentialsFormProps): ReactElement { const isSignUp = props.mode === 'signup'; return <form className="mt-4" onSubmit={props.onSubmit}><h1 id="auth-title" className="font-display text-[1.9rem] font-bold leading-tight text-brand-dark">{isSignUp ? 'Create your account' : 'Welcome back'}</h1><p className="mt-1.5 text-[0.92rem] text-muted-foreground">{isSignUp ? 'Already have an account?' : 'New to JoeyClub?'} <button type="button" onClick={props.onToggleMode} className="font-bold text-primary underline underline-offset-4">{isSignUp ? 'Log in' : 'Join us'}</button></p><div className="mt-5 grid gap-4">{isSignUp && <div className="grid gap-4 sm:grid-cols-2"><Field label="First name *"><input required value={props.firstName} onChange={(event) => props.onFirstName(event.target.value)} className="auth-field" autoComplete="given-name" /></Field><Field label="Last name"><input value={props.lastName} onChange={(event) => props.onLastName(event.target.value)} className="auth-field" autoComplete="family-name" /></Field></div>}<Field label="Email *"><input required type="email" value={props.email} onChange={(event) => props.onEmail(event.target.value)} className="auth-field" autoComplete="email" /></Field><Field label="Password *"><PasswordInput value={props.password} visible={props.passwordVisible} onChange={props.onPassword} onToggle={props.onPasswordVisible} autoComplete={isSignUp ? 'new-password' : 'current-password'} /></Field></div>{!isSignUp && <button type="button" onClick={props.onForgot} className="mt-2 text-sm font-semibold text-primary underline underline-offset-4 hover:text-brand-dark">Forgot password?</button>}<Feedback error={props.error} /><button type="submit" disabled={props.isSubmitting} className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-[0.98rem] font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">{props.isSubmitting ? 'Please wait…' : isSignUp ? 'Create account' : 'Log in'}</button></form> }

function BrandLockup(): ReactElement { return <div className="flex items-end gap-1"><Image src="/joey-logo.png" alt="JoeyClub" width={44} height={48} className="h-10 w-auto object-contain" /><span className="font-display text-[1.35rem] font-bold leading-none text-brand-dark">JoeyClub</span></div> }
interface FieldProps { label: string; children: ReactNode }
function Field({ label, children }: FieldProps): ReactElement { return <label className="grid gap-1.5 text-[0.86rem] font-bold text-brand-dark"><span>{label}</span>{children}</label> }
interface SelectFieldProps { label: string; value: string; onChange: (value: string) => void; children: ReactNode }
function SelectField({ label, value, onChange, children }: SelectFieldProps): ReactElement { return <label className="relative grid gap-1.5 text-[0.86rem] font-bold text-brand-dark"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="auth-field appearance-none pr-11">{children}</select><ChevronDown className="pointer-events-none absolute bottom-3.5 right-5 size-4 text-muted-foreground" /></label> }
interface PasswordInputProps { value: string; visible: boolean; onChange: (value: string) => void; onToggle: () => void; autoComplete: string }
function PasswordInput({ value, visible, onChange, onToggle, autoComplete }: PasswordInputProps): ReactElement { return <span className="relative block"><input required type={visible ? 'text' : 'password'} minLength={8} value={value} onChange={(event) => onChange(event.target.value)} className="auth-field pr-12" autoComplete={autoComplete} /><button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-primary" aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span> }
function Feedback({ error }: { error: string }): ReactElement | null { return error ? <p className="mt-4 rounded-xl bg-[#F7E3DC] px-3 py-2 text-sm font-semibold text-[#9D4E3C]">{error}</p> : null }
