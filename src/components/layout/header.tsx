'use client'

import { useTranslations } from 'next-intl'
import { useSession, signOut } from 'next-auth/react'
import { Link, usePathname } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { Menu, User, LogOut, Settings, Heart, Gavel, Car, X, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function Header() {
  const t = useTranslations('nav')
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Track scroll for header blur effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navigation = [
    { name: t('auctions'), href: '/auctions' },
    { name: t('recentSales'), href: '/recent-sales' },
    { name: t('blog'), href: '/blog' },
    { name: t('sell'), href: '/sell' },
  ]

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500',
        scrolled
          ? 'border-b border-border/50 bg-background/95 backdrop-blur-xl shadow-sm'
          : 'bg-transparent'
      )}
    >
      {/* Decorative top line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      <nav
        className="container mx-auto flex h-18 items-center justify-between px-4 py-4"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3" aria-label="Finds home">
          {/* Logo mark */}
          <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-premium shadow-lg shadow-primary/20 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/30">
            <Car className="h-5 w-5 text-primary-foreground transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
            {/* Shine effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </span>
          {/* Wordmark */}
          <div className="flex flex-col">
            <span className="font-heading text-xl font-bold tracking-tight">Finds</span>
            <span className="hidden text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:block">
              Est. 2024
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center space-x-1 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300',
                pathname === item.href
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.name}
              {/* Active indicator */}
              {pathname === item.href && (
                <span className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-primary to-gold" />
              )}
            </Link>
          ))}
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-3">
          <LanguageSwitcher />

          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full border border-border/50 p-0 transition-all duration-300 hover:border-primary/30 hover:shadow-md"
                  aria-label={`User menu for ${session.user.name || 'user'}`}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={session.user.image || undefined}
                      alt={session.user.name || 'User'}
                    />
                    <AvatarFallback className="bg-gradient-premium text-primary-foreground font-semibold">
                      {session.user.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-60 rounded-xl border-border/50 bg-card/95 p-2 backdrop-blur-xl"
                align="end"
                forceMount
              >
                <div className="flex items-center gap-3 px-3 py-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={session.user.image || undefined}
                      alt={session.user.name || 'User'}
                    />
                    <AvatarFallback className="bg-gradient-premium text-primary-foreground font-semibold">
                      {session.user.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    {session.user.name && (
                      <p className="font-semibold">{session.user.name}</p>
                    )}
                    {session.user.email && (
                      <p className="truncate text-xs text-muted-foreground">
                        {session.user.email}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator className="my-2 bg-border/50" />
                <DropdownMenuItem asChild className="rounded-lg">
                  <Link href="/account" className="flex items-center gap-3 px-3 py-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {t('account')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg">
                  <Link href="/account/watchlist" className="flex items-center gap-3 px-3 py-2">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    {t('watchlist')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg">
                  <Link href="/account/bids" className="flex items-center gap-3 px-3 py-2">
                    <Gavel className="h-4 w-4 text-muted-foreground" />
                    {t('myBids')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg">
                  <Link href="/account/listings" className="flex items-center gap-3 px-3 py-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    {t('myListings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-2 bg-border/50" />
                <DropdownMenuItem asChild className="rounded-lg">
                  <Link href="/account/settings" className="flex items-center gap-3 px-3 py-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    {t('settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-2 bg-border/50" />
                <DropdownMenuItem
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-destructive focus:text-destructive"
                  onSelect={() => signOut()}
                >
                  <LogOut className="h-4 w-4" />
                  {t('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center space-x-3 md:flex">
              <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
                <Link href="/login">{t('login')}</Link>
              </Button>
              <Button
                asChild
                className="rounded-xl bg-gradient-premium px-5 font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
              >
                <Link href="/register" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {t('register')}
                </Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="relative md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <span className={cn(
              'absolute inset-0 flex items-center justify-center transition-all duration-300',
              mobileMenuOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
            )}>
              <Menu className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className={cn(
              'absolute inset-0 flex items-center justify-center transition-all duration-300',
              mobileMenuOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
            )}>
              <X className="h-5 w-5" aria-hidden="true" />
            </span>
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        className={cn(
          'absolute inset-x-0 top-full border-b border-border/50 bg-background/98 backdrop-blur-xl transition-all duration-300 md:hidden',
          mobileMenuOpen
            ? 'visible translate-y-0 opacity-100'
            : 'invisible -translate-y-4 opacity-0'
        )}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="container mx-auto space-y-1 px-4 py-6">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-xl px-4 py-3 text-base font-medium transition-all duration-300',
                pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.name}
            </Link>
          ))}

          {!session?.user && (
            <>
              <div className="my-4 h-px bg-border/50" />
              <Link
                href="/login"
                className="flex items-center rounded-xl px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('login')}
              </Link>
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-premium px-4 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Sparkles className="h-4 w-4" />
                {t('register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
