import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Car } from 'lucide-react'

export function Footer() {
  const t = useTranslations()

  return (
    <footer className="border-t bg-muted/50" role="contentinfo">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center space-x-2" aria-label="Finds home">
              <Car className="h-6 w-6" aria-hidden="true" />
              <span className="text-xl font-bold">Finds</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              {t('common.tagline')}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Romania-based, serving collectors across Europe.
            </p>
          </div>

          {/* Navigation */}
          <nav aria-label="Footer navigation">
            <h3 className="font-semibold">Platform</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/auctions" className="hover:text-primary">
                  {t('nav.auctions')}
                </Link>
              </li>
              <li>
                <Link href="/sell" className="hover:text-primary">
                  {t('nav.sell')}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Legal */}
          <nav aria-label="Legal information">
            <h3 className="font-semibold">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/legal/terms" className="hover:text-primary">
                  {t('legal.terms')}
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-primary">
                  {t('legal.privacy')}
                </Link>
              </li>
              <li>
                <Link href="/legal/cookies" className="hover:text-primary">
                  {t('legal.cookies')}
                </Link>
              </li>
              <li>
                <Link href="/legal/buyer-terms" className="hover:text-primary">
                  {t('legal.buyerTerms')}
                </Link>
              </li>
              <li>
                <Link href="/legal/seller-terms" className="hover:text-primary">
                  {t('legal.sellerTerms')}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Contact */}
          <nav aria-label="Contact information">
            <h3 className="font-semibold">Contact</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="mailto:contact@finds.ro"
                  className="hover:text-primary"
                  aria-label="Email us at contact@finds.ro"
                >
                  contact@finds.ro
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Finds. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Built for collectors, by collectors.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
