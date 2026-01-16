import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Car, Mail, MapPin, ArrowUpRight } from 'lucide-react'

export function Footer() {
  const t = useTranslations()

  const currentYear = new Date().getFullYear()

  return (
    <footer
      className="relative overflow-hidden border-t border-border/50 bg-gradient-to-b from-muted/30 to-muted/50"
      role="contentinfo"
    >
      {/* Decorative top gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" aria-hidden="true" />

      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-30 pattern-lines" aria-hidden="true" />

      {/* Main footer content */}
      <div className="container relative mx-auto px-4 py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          {/* Brand column - wider */}
          <div className="md:col-span-5 lg:col-span-4">
            <Link
              href="/"
              className="group inline-flex items-center gap-3"
              aria-label="Finds home"
            >
              {/* Logo mark */}
              <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-gradient-premium shadow-lg shadow-primary/20 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/30">
                <Car className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
              </span>
              {/* Wordmark */}
              <div className="flex flex-col">
                <span className="font-heading text-2xl font-bold tracking-tight">Finds</span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Est. 2024
                </span>
              </div>
            </Link>

            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t('common.tagline')}
            </p>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground/80">
              Romania-based, serving collectors across Europe with curated classic car auctions.
            </p>

            {/* Contact info */}
            <div className="mt-8 space-y-3">
              <a
                href="mailto:contact@finds.ro"
                className="group flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-primary"
                aria-label="Email us at contact@finds.ro"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Mail className="h-4 w-4 text-primary" />
                </span>
                contact@finds.ro
              </a>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
                  <MapPin className="h-4 w-4 text-secondary" />
                </span>
                Cluj-Napoca, Romania
              </div>
            </div>
          </div>

          {/* Navigation columns */}
          <div className="grid gap-8 sm:grid-cols-3 md:col-span-7 lg:col-span-8">
            {/* Platform */}
            <nav aria-label="Platform navigation">
              <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-foreground">
                Platform
              </h3>
              <ul className="space-y-3">
                {[
                  { href: '/auctions', label: t('nav.auctions') },
                  { href: '/recent-sales', label: t('nav.recentSales') },
                  { href: '/blog', label: t('nav.blog') },
                  { href: '/sell', label: t('nav.sell') },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {item.label}
                      <ArrowUpRight className="h-3 w-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Legal */}
            <nav aria-label="Legal information">
              <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-foreground">
                Legal
              </h3>
              <ul className="space-y-3">
                {[
                  { href: '/legal/terms', label: t('legal.terms') },
                  { href: '/legal/privacy', label: t('legal.privacy') },
                  { href: '/legal/cookies', label: t('legal.cookies') },
                  { href: '/legal/buyer-terms', label: t('legal.buyerTerms') },
                  { href: '/legal/seller-terms', label: t('legal.sellerTerms') },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {item.label}
                      <ArrowUpRight className="h-3 w-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Newsletter / CTA */}
            <div className="sm:col-span-1">
              <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-foreground">
                For collectors
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Join our community of classic car enthusiasts and discover your next automotive treasure.
              </p>
              <Link
                href="/register"
                className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/20"
              >
                Create account
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-border/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            {/* Copyright */}
            <div className="flex flex-col items-center gap-1 md:items-start">
              <p className="text-sm text-muted-foreground">
                &copy; {currentYear} Finds. All rights reserved.
              </p>
              <p className="text-xs text-muted-foreground/70">
                {t('blog.betterQA.badge')} ·{' '}
                <a
                  href="https://betterqa.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-primary"
                >
                  betterqa.co
                </a>
              </p>
            </div>

            {/* Tagline */}
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="hidden h-px w-8 bg-gradient-to-r from-transparent to-gold/50 sm:block" />
              Built for collectors, by collectors
              <span className="hidden h-px w-8 bg-gradient-to-l from-transparent to-gold/50 sm:block" />
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
