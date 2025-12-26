import { useTranslations } from 'next-intl'
import type { Metadata } from 'next'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Car, Shield, Clock, CheckCircle, Sparkles } from 'lucide-react'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Finds - Classic & Collector Car Auctions in Europe',
    description: 'Curated online auction platform for classic cars, retro vehicles, barn finds, and project cars. Romania-based, serving collectors across Europe. 5% buyer fee, no seller commission.',
    keywords: [
      'classic car auction',
      'retro car auction',
      'barn find',
      'project car',
      'vintage car auction',
      'collector car',
      'Romania car auction',
      'EU car auction',
      'European classic cars',
    ],
    openGraph: {
      title: 'Finds - Classic & Collector Car Auctions',
      description: 'Curated online auction platform for classic cars, retro vehicles, barn finds, and project cars.',
      type: 'website',
    },
  }
}

export default function HomePage() {
  const t = useTranslations()

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-24 md:py-40">
        {/* Decorative blur orbs */}
        <div className="absolute -right-20 -top-20 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-secondary/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />

        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            {/* Premium badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              Curated Classic Car Auctions
            </div>

            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
              <span className="text-gradient">{t('common.appName')}</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl md:text-2xl lg:text-3xl">
              {t('common.tagline')}
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:mt-8 sm:text-lg">
              The curated auction platform for classic cars, retro vehicles,
              barn finds, and project cars. Based in Romania, serving
              collectors across Europe.
            </p>

            {/* CTAs */}
            <div className="mt-12 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/auctions" className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-premium px-6 text-base font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:bg-gradient-premium-hover active:scale-[0.98] sm:h-14 sm:px-10 sm:text-lg">
                {t('nav.auctions')}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/sell" className="inline-flex h-12 items-center justify-center rounded-xl border-2 border-primary bg-background px-6 text-base font-medium text-primary transition-all hover:bg-primary/5 hover:border-primary/80 sm:h-14 sm:px-10 sm:text-lg">
                {t('nav.sell')}
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>100% Verified Sellers</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>Transparent 5% Buyer Fee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>Anti-Sniping Protection</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
              Why Choose Finds?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A premium marketplace built for discerning collectors
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card variant="premium" className="p-2">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <Shield className="h-10 w-10 text-primary" />
                </div>
                <h3 className="mt-6 font-heading text-xl font-semibold">Curated Listings</h3>
                <p className="mt-3 text-muted-foreground">
                  Every vehicle is reviewed and approved by our team. No
                  mass-market listings, only quality collector vehicles.
                </p>
              </CardContent>
            </Card>

            <Card variant="premium" className="p-2">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10">
                  <Car className="h-10 w-10 text-secondary" />
                </div>
                <h3 className="mt-6 font-heading text-xl font-semibold">For Enthusiasts</h3>
                <p className="mt-3 text-muted-foreground">
                  Classic cars, retro vehicles, barn finds, and project cars.
                  Built for collectors who appreciate automotive history.
                </p>
              </CardContent>
            </Card>

            <Card variant="premium" className="p-2">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10">
                  <Clock className="h-10 w-10 text-accent-foreground" />
                </div>
                <h3 className="mt-6 font-heading text-xl font-semibold">Fair Auctions</h3>
                <p className="mt-3 text-muted-foreground">
                  Anti-sniping protection, transparent bidding, and a 5% buyer
                  fee. No hidden costs, no surprises.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-gradient-to-br from-muted/50 to-muted/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Four simple steps to your next classic car
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: 1, title: 'Browse Auctions', desc: 'Explore curated listings of classic and collector vehicles' },
              { step: 2, title: 'Place Your Bid', desc: 'Bid on vehicles you love with transparent, real-time updates' },
              { step: 3, title: 'Win the Auction', desc: 'If you win, pay the hammer price plus a 5% buyer fee' },
              { step: 4, title: 'Collect Your Car', desc: 'Arrange transport and enjoy your new classic vehicle' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="group text-center">
                <div className="relative mx-auto mb-6">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 font-mono text-2xl font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform group-hover:scale-110">
                    {step}
                  </div>
                  {step < 4 && (
                    <div className="absolute left-full top-1/2 hidden h-0.5 w-full -translate-y-1/2 bg-gradient-to-r from-primary/30 to-transparent md:block" />
                  )}
                </div>
                <h3 className="font-heading text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-24">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />

        <div className="container relative mx-auto px-4">
          <Card variant="glass" className="mx-auto max-w-3xl overflow-hidden">
            <CardContent className="p-12 text-center">
              <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
                Ready to Sell Your Classic?
              </h2>
              <p className="mt-6 text-lg text-muted-foreground">
                Submit your vehicle for review. Our curated approach means your
                listing reaches serious collectors who appreciate quality.
              </p>
              <Link href="/sell" className="group mt-10 inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-gradient-cognac px-10 text-lg font-medium text-secondary-foreground shadow-lg shadow-secondary/25 transition-all hover:shadow-xl hover:shadow-secondary/30 active:scale-[0.98]">
                Start Selling
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
