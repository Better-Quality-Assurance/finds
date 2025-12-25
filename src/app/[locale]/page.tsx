import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { ArrowRight, Car, Shield, Clock } from 'lucide-react'

export default function HomePage() {
  const t = useTranslations()

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary/5 to-background py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              {t('common.appName')}
            </h1>
            <p className="mt-4 text-xl text-muted-foreground md:text-2xl">
              {t('common.tagline')}
            </p>
            <p className="mt-6 text-lg text-muted-foreground">
              The curated auction platform for classic cars, retro vehicles,
              barn finds, and project cars. Based in Romania, serving
              collectors across Europe.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/auctions">
                  {t('nav.auctions')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/sell">{t('nav.sell')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Curated Listings</h3>
              <p className="mt-2 text-muted-foreground">
                Every vehicle is reviewed and approved by our team. No
                mass-market listings, only quality collector vehicles.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Car className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">For Enthusiasts</h3>
              <p className="mt-2 text-muted-foreground">
                Classic cars, retro vehicles, barn finds, and project cars.
                Built for collectors who appreciate automotive history.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Fair Auctions</h3>
              <p className="mt-2 text-muted-foreground">
                Anti-sniping protection, transparent bidding, and a 5% buyer
                fee. No hidden costs, no surprises.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold">How It Works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                1
              </div>
              <h3 className="mt-4 font-semibold">Browse Auctions</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Explore curated listings of classic and collector vehicles
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                2
              </div>
              <h3 className="mt-4 font-semibold">Place Your Bid</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Bid on vehicles you love with transparent, real-time updates
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                3
              </div>
              <h3 className="mt-4 font-semibold">Win the Auction</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                If you win, pay the hammer price plus a 5% buyer fee
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                4
              </div>
              <h3 className="mt-4 font-semibold">Collect Your Car</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Arrange transport and enjoy your new classic vehicle
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold">Ready to Sell Your Classic?</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Submit your vehicle for review. Our curated approach means your
              listing reaches serious collectors who appreciate quality.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/sell">
                {t('nav.sell')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
