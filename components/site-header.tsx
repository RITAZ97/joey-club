'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type ReactElement } from 'react'
import { ChevronDown, Menu, UserRound, X } from 'lucide-react'
import { AuthModal } from '@/components/auth-modal'
import { type AuthMode, type AuthUser, useAuth } from '@/components/auth-context'
import { useResourceSearch } from '@/components/resource-search-context'

interface NavigationLink {
  label: string
  href: string
}

const navLinks: NavigationLink[] = [
  { label: 'Resources', href: '#early-years-explorer' },
  { label: 'Why JoeyClub', href: '#why-joeyclub' },
  { label: 'eSafety', href: '#safe-ideas' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '/#contact' },
]

export function SiteHeader(): ReactElement {
  const { userMode, setUserMode } = useResourceSearch()
  const { isLoading, logout, user } = useAuth()
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const [mobileGuestMenuOpen, setMobileGuestMenuOpen] = useState<boolean>(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState<boolean>(false)
  const [navigationOpen, setNavigationOpen] = useState<boolean>(false)
  const headerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const onPointerDown = (event: MouseEvent): void => {
      if (headerRef.current !== null && !headerRef.current.contains(event.target as Node)) {
        setMobileGuestMenuOpen(false); setRoleMenuOpen(false); setNavigationOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const openAuth = (mode: AuthMode): void => {
    setMobileGuestMenuOpen(false); setRoleMenuOpen(false); setNavigationOpen(false)
    setAuthMode(mode)
  }

  const toggleRoleMenu = (): void => { setRoleMenuOpen((open) => !open); setMobileGuestMenuOpen(false); setNavigationOpen(false) }
  const toggleNavigation = (): void => { setNavigationOpen((open) => !open); setMobileGuestMenuOpen(false); setRoleMenuOpen(false) }
  const toggleGuestMenu = (): void => { setMobileGuestMenuOpen((open) => !open); setNavigationOpen(false); setRoleMenuOpen(false) }

  return (
    <header ref={headerRef} className="mx-auto w-full">
      <div className="hidden w-[95%] max-w-[1400px] items-center gap-4 px-5 py-5 lg:mx-auto lg:flex lg:px-10 lg:py-7">
        <a href="#" className="flex shrink-0 items-end"><span className="relative block h-11 w-9 shrink-0 -translate-y-0.5 overflow-hidden"><Image src="/joey-logo.png" alt="JoeyClub logo" fill className="object-contain" priority /></span><span className="font-display text-[1.8rem] font-bold leading-none tracking-tight text-brand-dark">JoeyClub</span></a>
        <div className="ml-4 flex items-center rounded-full border border-border bg-card p-1">{(['parent', 'educator'] as const).map((role) => <button key={role} type="button" onClick={() => setUserMode(role)} className={`rounded-full px-5 py-1.5 text-sm font-semibold capitalize transition-colors ${userMode === role ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{role}</button>)}</div>
        <nav className="mx-auto flex items-center gap-7">{navLinks.map((link) => <a key={link.label} href={link.href} className="relative py-1 text-[0.95rem] font-medium text-foreground/80 transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-[#7A997D] after:transition-transform after:duration-300 hover:text-foreground hover:after:scale-x-100">{link.label}</a>)}</nav>
        {!isLoading && user === null && <><div className="hidden items-center gap-4 xl:flex"><button type="button" onClick={() => openAuth('login')} className="text-sm font-bold text-foreground/80 transition-colors hover:text-primary">Log in</button><button type="button" onClick={() => openAuth('signup')} className="rounded-full border border-primary px-5 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground">Join Us</button></div><div className="relative xl:hidden"><button type="button" onClick={toggleGuestMenu} className="inline-flex size-9 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-muted" aria-label="Open account options" aria-expanded={mobileGuestMenuOpen}><UserRound className="size-4" /></button>{mobileGuestMenuOpen && <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-32 rounded-lg border border-border bg-card p-1.5 shadow-lg"><button type="button" onClick={() => openAuth('login')} className="w-full rounded-md px-2.5 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted">Log in</button><button type="button" onClick={() => openAuth('signup')} className="w-full rounded-md px-2.5 py-2 text-left text-sm font-semibold text-primary hover:bg-muted">Join us</button></div>}</div></>}
        {!isLoading && user !== null && <><button type="button" onClick={() => { void logout() }} className="mr-3 text-sm font-bold text-foreground/80 transition-colors hover:text-primary">Log out</button><AccountMenu user={user} onSignOut={() => { void logout() }} /></>}
      </div>
      <div className="flex w-full items-center gap-2 px-4 py-4 sm:px-5 sm:py-5 lg:hidden">
        <a href="#" className="flex shrink-0 items-end gap-1 sm:gap-1"><Image src="/joey-logo.png" alt="JoeyClub logo" width={44} height={48} className="h-8 w-auto -translate-y-px object-contain sm:-mr-1 sm:h-9 sm:-translate-y-0.5" priority /><span className="font-display text-[1.16rem] font-bold leading-none tracking-tight text-brand-dark sm:text-[1.5rem]">JoeyClub</span></a>
        <div className="relative ml-3 max-[360px]:ml-2 sm:hidden"><button type="button" onClick={toggleRoleMenu} className="inline-flex h-8 items-center gap-1 rounded-md border border-primary bg-primary px-2 text-[0.75rem] font-semibold text-primary-foreground transition-colors hover:bg-brand-dark" aria-label="Choose your role" aria-expanded={roleMenuOpen}>{userMode === 'educator' ? 'Educator' : 'Parent'} <ChevronDown className="size-3" /></button>{roleMenuOpen && <div className="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-32 rounded-lg border border-border bg-card p-1 shadow-lg"><button type="button" onClick={() => { setUserMode('educator'); setRoleMenuOpen(false) }} className="w-full rounded-md px-2.5 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted">Educator</button><button type="button" onClick={() => { setUserMode('parent'); setRoleMenuOpen(false) }} className="w-full rounded-md px-2.5 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted">Parent</button></div>}</div>
        <div className="ml-1 hidden items-center rounded-full border border-border bg-card p-1 sm:ml-4 sm:flex">{(['parent', 'educator'] as const).map((role) => <button key={role} type="button" onClick={() => setUserMode(role)} className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${userMode === role ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{role}</button>)}</div>
        <div className="ml-auto flex items-center gap-1.5"><div className="relative"><button type="button" onClick={toggleNavigation} className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:border-primary hover:text-primary sm:size-9" aria-label={navigationOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={navigationOpen}>{navigationOpen ? <X className="size-4" /> : <Menu className="size-4" />}</button>{navigationOpen && <nav className="absolute right-0 top-[calc(100%+0.4rem)] z-50 flex w-44 flex-col rounded-lg border border-border bg-card p-1.5 shadow-lg">{navLinks.map((link) => <a key={link.label} href={link.href} onClick={() => setNavigationOpen(false)} className="rounded-md px-3 py-2 text-sm font-semibold text-foreground/80 hover:bg-muted hover:text-primary">{link.label}</a>)}</nav>}</div>
          {!isLoading && user === null && <div className="relative"><button type="button" onClick={toggleGuestMenu} className="inline-flex size-8 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-muted sm:size-9" aria-label="Open account options" aria-expanded={mobileGuestMenuOpen}><UserRound className="size-4" /></button>{mobileGuestMenuOpen && <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-32 rounded-lg border border-border bg-card p-1.5 shadow-lg"><button type="button" onClick={() => openAuth('login')} className="w-full rounded-md px-2.5 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted">Log in</button><button type="button" onClick={() => openAuth('signup')} className="w-full rounded-md px-2.5 py-2 text-left text-sm font-semibold text-primary hover:bg-muted">Join us</button></div>}</div>}
          {!isLoading && user !== null && <AccountMenu user={user} onSignOut={() => { void logout() }} />}</div>
      </div>
      {authMode !== null && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} />}
    </header>
  )
}

interface AccountMenuProps {
  user: AuthUser
  onSignOut: () => void
}

function AccountMenu({ user, onSignOut }: AccountMenuProps): ReactElement {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const clearCloseTimer = (): void => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }
  const scheduleDesktopClose = (): void => {
    if (window.matchMedia('(min-width: 768px)').matches) {
      clearCloseTimer()
      timeoutRef.current = window.setTimeout(() => setIsOpen(false), 5000)
    }
  }

  useEffect(() => {
    const onPointerDown = (event: MouseEvent): void => {
      if (menuRef.current !== null && !menuRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      clearCloseTimer()
    }
  }, [])

  const closeMenu = (): void => { clearCloseTimer(); setIsOpen(false) }
  const toggleMenu = (): void => {
    setIsOpen((current) => {
      const next = !current
      if (next) scheduleDesktopClose()
      else clearCloseTimer()
      return next
    })
  }

  return <div ref={menuRef} className="relative" onMouseEnter={() => { if (window.matchMedia('(min-width: 768px)').matches) { setIsOpen(true); clearCloseTimer() } }} onMouseLeave={scheduleDesktopClose}>
    <button type="button" onClick={toggleMenu} className="flex size-8 items-center justify-center rounded-full bg-primary font-sans text-[1.1rem] font-medium text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5" aria-label="Open account menu" aria-expanded={isOpen}>{user.firstName.charAt(0).toUpperCase()}</button>
    {isOpen && <div className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-60 rounded-2xl border border-border bg-card p-2 shadow-[0_14px_34px_rgba(44,64,46,0.18)]">
      <div className="border-b border-border px-3 py-2.5"><p className="truncate font-display text-[1rem] font-bold text-brand-dark">{user.firstName}{user.lastName ? ` ${user.lastName}` : ''}</p><p className="mt-0.5 truncate text-[0.76rem] text-muted-foreground">{user.email}</p></div>
      <a href="/folders" onClick={closeMenu} className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-foreground/80 hover:bg-muted hover:text-primary">My Folders</a>
      <a href="/#contact" onClick={closeMenu} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-foreground/80 hover:bg-muted hover:text-primary">Contact</a>
      <button type="button" onClick={() => { closeMenu(); onSignOut() }} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#A85C4D] hover:bg-[#F7E3DC]">Sign Out</button>
    </div>}
  </div>
}
