import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Car } from 'lucide-react'

export function Footer() {
  const t = useTranslations()

  return (
    <footer
      className="relative border-t border-border/50 bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-xl"
      role="contentinfo"
    >
      {/* Subtle decorative gradient overlay */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" aria-hidden="true" />

      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link
              href="/"
              className="group inline-flex items-center gap-2.5"
              aria-label="Finds home"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 transition-all group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/30">
                <Car className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
              </span>
              <span className="font-heading text-2xl font-bold tracking-tight">Finds</span>
            </Link>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              {t('common.tagline')}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Romania-based, serving collectors across Europe.
            </p>
          </div>

          {/* Navigation */}
          <nav aria-label="Footer navigation">
            <h3 className="font-heading text-sm font-semibold tracking-wide">Platform</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link
                  href="/auctions"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {t('nav.auctions')}
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {t('nav.blog')}
                </Link>
              </li>
              <li>
                <Link
                  href="/sell"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {t('nav.sell')}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Legal */}
          <nav aria-label="Legal information">
            <h3 className="font-heading text-sm font-semibold tracking-wide">Legal</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link
                  href="/legal/terms"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {t('legal.terms')}
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {t('legal.privacy')}
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/cookies"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {t('legal.cookies')}
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/buyer-terms"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {t('legal.buyerTerms')}
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/seller-terms"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {t('legal.sellerTerms')}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Contact */}
          <nav aria-label="Contact information">
            <h3 className="font-heading text-sm font-semibold tracking-wide">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a
                  href="mailto:contact@finds.ro"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  aria-label="Email us at contact@finds.ro"
                >
                  contact@finds.ro
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-16 border-t border-border/50 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex flex-col items-center gap-2 md:items-start">
              <p className="text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} Finds. All rights reserved.
              </p>
              <p className="text-xs text-muted-foreground/70">
                {t('blog.betterQA.badge')} ·{' '}
                <a
                  href="https://betterqa.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  betterqa.co
                </a>
              </p>
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Built for collectors, by collectors.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
