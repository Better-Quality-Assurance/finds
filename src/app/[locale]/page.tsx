import { useTranslations } from 'next-intl'
import type { Metadata } from 'next'
import { Link } from '@/i18n/routing'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Shield, Clock, CheckCircle, Sparkles, Trophy, Users, Gauge } from 'lucide-react'
import { LatestBidsSection } from '@/components/home/latest-bids-section'
import { RecentSalesSection } from '@/components/home/recent-sales-section'
import { PlatformStats } from '@/components/stats/platform-stats'
import { ScrollSpy } from '@/components/ui/scroll-spy'
import { BackToTop } from '@/components/ui/back-to-top'
import { SectionDivider } from '@/components/ui/section-divider'

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
  const tSections = useTranslations('sections')

  const homeSections = [
    { id: 'hero', label: tSections('hero') },
    { id: 'stats', label: tSections('stats') },
    { id: 'features', label: tSections('features') },
    { id: 'how-it-works', label: tSections('howItWorks') },
    { id: 'live-bids', label: tSections('liveBids') },
    { id: 'recent-sales', label: tSections('recentSales') },
    { id: 'sell-cta', label: tSections('sell') },
  ]

  return (
    <div className="flex flex-col">
      {/* Scroll Navigation */}
      <ScrollSpy sections={homeSections} />
      <BackToTop />

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO SECTION - Cinematic & Dramatic
          ═══════════════════════════════════════════════════════════════════════ */}
      <section id="hero" className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Layered background with depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />

        {/* Decorative geometric pattern - Art Deco inspired */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 pattern-lines" />
        </div>

        {/* Ambient glow orbs */}
        <div className="absolute -right-40 top-20 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute -left-40 bottom-20 h-[500px] w-[500px] rounded-full bg-secondary/10 blur-[100px]" />
        <div className="absolute left-1/3 top-1/3 h-[400px] w-[400px] rounded-full bg-gold/5 blur-[80px]" />

        {/* Decorative lines - racing heritage */}
        <div className="absolute left-0 top-1/2 h-px w-1/4 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute right-0 top-1/2 h-px w-1/4 bg-gradient-to-l from-transparent via-secondary/20 to-transparent" />

        <div className="container relative mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-5xl text-center">
            {/* Premium badge with gold accent */}
            <div className="mb-10 inline-flex animate-fade-in-down items-center gap-2.5 rounded-full border border-gold/30 bg-gold/5 px-5 py-2.5 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-gold" />
              <span className="text-sm font-semibold tracking-wide text-gold">
                Curated classic car auctions
              </span>
            </div>

            {/* Main headline - dramatic typography */}
            <h1 className="animate-fade-in font-heading text-display-lg md:text-display-xl lg:text-display-2xl">
              <span className="text-gradient-hero">Discover your next</span>
              <br />
              <span className="text-gradient">automotive treasure</span>
            </h1>

            {/* Tagline */}
            <p className="mx-auto mt-8 max-w-2xl animate-fade-in-up text-xl text-muted-foreground md:text-2xl [animation-delay:200ms]">
              {t('common.tagline')}
            </p>

            {/* Subtitle with location */}
            <p className="mx-auto mt-6 max-w-xl animate-fade-in-up text-base text-muted-foreground/80 [animation-delay:300ms]">
              The curated auction platform for classic cars, retro vehicles,
              barn finds, and project cars. Based in Romania, serving
              collectors across Europe.
            </p>

            {/* CTAs with premium styling */}
            <div className="mt-14 flex animate-fade-in-up flex-col justify-center gap-5 sm:flex-row [animation-delay:400ms]">
              <Link
                href="/auctions"
                className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-premium px-10 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-500 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
              >
                <span className="relative z-10">{t('nav.auctions')}</span>
                <ArrowRight className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                {/* Hover shine effect */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </Link>

              <Link
                href="/sell"
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-secondary/30 bg-secondary/5 px-10 text-lg font-semibold text-secondary transition-all duration-300 hover:border-secondary/50 hover:bg-secondary/10"
              >
                {t('nav.sell')}
                <ArrowRight className="h-5 w-5 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
              </Link>
            </div>

            {/* Trust indicators - refined layout */}
            <div className="mt-20 animate-fade-in-up [animation-delay:500ms]">
              <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-5">
                {[
                  { icon: CheckCircle, text: '100% verified sellers' },
                  { icon: Shield, text: 'Transparent 5% buyer fee' },
                  { icon: Clock, text: 'Anti-sniping protection' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
                      <Icon className="h-4 w-4 text-success" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-muted/50 to-transparent" />
      </section>

      {/* Section Divider */}
      <SectionDivider />

      {/* Platform Stats */}
      <PlatformStats />

      {/* Section Divider */}
      <SectionDivider />

      {/* ═══════════════════════════════════════════════════════════════════════
          FEATURES SECTION - Premium Card Grid
          ═══════════════════════════════════════════════════════════════════════ */}
      <section id="features" className="relative py-24 md:py-32">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-30 pattern-chevron" />

        <div className="container relative mx-auto px-4">
          {/* Section header */}
          <div className="mb-20 text-center">
            <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-widest text-gold">
              Why choose Finds
            </span>
            <h2 className="font-heading text-display-sm md:text-display-md">
              A premium marketplace built for
              <br />
              <span className="text-gradient">discerning collectors</span>
            </h2>
          </div>

          {/* Feature cards */}
          <div className="grid gap-8 md:grid-cols-3">
            {/* Card 1: Curated Listings */}
            <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary/20 hover:shadow-elevated-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <CardContent className="relative flex flex-col items-center p-8 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-inner-glow transition-transform duration-500 group-hover:scale-110">
                  <Shield className="h-10 w-10 text-primary" />
                </div>
                <h3 className="mb-4 font-heading text-xl font-semibold">
                  Curated listings
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Every vehicle is reviewed and approved by our team. No
                  mass-market listings, only quality collector vehicles.
                </p>
              </CardContent>
            </Card>

            {/* Card 2: For Enthusiasts */}
            <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-secondary/20 hover:shadow-elevated-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <CardContent className="relative flex flex-col items-center p-8 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/25 to-secondary/5 shadow-inner-glow transition-transform duration-500 group-hover:scale-110">
                  <Trophy className="h-10 w-10 text-secondary" />
                </div>
                <h3 className="mb-4 font-heading text-xl font-semibold">
                  For enthusiasts
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Classic cars, retro vehicles, barn finds, and project cars.
                  Built for collectors who appreciate automotive history.
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Fair Auctions */}
            <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-gold/20 hover:shadow-elevated-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <CardContent className="relative flex flex-col items-center p-8 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/25 to-gold/5 shadow-inner-glow transition-transform duration-500 group-hover:scale-110">
                  <Gauge className="h-10 w-10 text-gold" />
                </div>
                <h3 className="mb-4 font-heading text-xl font-semibold">
                  Fair auctions
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Anti-sniping protection, transparent bidding, and a 5% buyer
                  fee. No hidden costs, no surprises.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          HOW IT WORKS - Refined Steps
          ═══════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative overflow-hidden py-24 md:py-32">
        {/* Background treatment */}
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30" />

        <div className="container relative mx-auto px-4">
          {/* Section header */}
          <div className="mb-20 text-center">
            <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-widest text-secondary">
              Simple process
            </span>
            <h2 className="font-heading text-display-sm md:text-display-md">
              Four steps to your
              <br />
              <span className="text-gradient">next classic car</span>
            </h2>
          </div>

          {/* Steps grid */}
          <div className="grid gap-8 md:grid-cols-4">
            {[
              {
                step: 1,
                title: 'Browse auctions',
                desc: 'Explore curated listings of classic and collector vehicles',
                icon: '01',
              },
              {
                step: 2,
                title: 'Place your bid',
                desc: 'Bid on vehicles you love with transparent, real-time updates',
                icon: '02',
              },
              {
                step: 3,
                title: 'Win the auction',
                desc: 'If you win, pay the hammer price plus a 5% buyer fee',
                icon: '03',
              },
              {
                step: 4,
                title: 'Collect your car',
                desc: 'Arrange transport and enjoy your new classic vehicle',
                icon: '04',
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="group relative text-center">
                {/* Connection line */}
                {step < 4 && (
                  <div className="absolute left-[60%] top-10 hidden h-0.5 w-[80%] bg-gradient-to-r from-primary/30 to-transparent md:block" />
                )}

                {/* Step number */}
                <div className="relative mx-auto mb-8">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-card shadow-elevated transition-all duration-500 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-card-hover">
                    <span className="font-mono text-2xl font-bold text-primary">
                      {icon}
                    </span>
                  </div>
                </div>

                <h3 className="mb-3 font-heading text-lg font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <SectionDivider />

      {/* Latest Bids Section */}
      <LatestBidsSection />

      {/* Section Divider */}
      <SectionDivider />

      {/* Recent Sales Section */}
      <RecentSalesSection />

      {/* Section Divider */}
      <SectionDivider />

      {/* ═══════════════════════════════════════════════════════════════════════
          CTA SECTION - Premium Finish
          ═══════════════════════════════════════════════════════════════════════ */}
      <section id="sell-cta" className="relative overflow-hidden py-24 md:py-32">
        {/* Background with subtle pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="absolute inset-0 opacity-50 pattern-lines" />

        <div className="container relative mx-auto px-4">
          <Card className="relative mx-auto max-w-4xl overflow-hidden border-border/50 bg-card/90 backdrop-blur-xl">
            {/* Decorative corner accents */}
            <div className="deco-corner absolute inset-0 pointer-events-none" />

            <CardContent className="relative p-10 text-center md:p-16">
              {/* Icon */}
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-cognac shadow-lg shadow-secondary/20">
                <Users className="h-10 w-10 text-secondary-foreground" />
              </div>

              <h2 className="font-heading text-display-sm md:text-display-md">
                Ready to sell
                <br />
                <span className="text-gradient">your classic?</span>
              </h2>

              <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
                Submit your vehicle for review. Our curated approach means your
                listing reaches serious collectors who appreciate quality.
              </p>

              <Link
                href="/sell"
                className="group relative mt-10 inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-cognac px-12 text-lg font-semibold text-secondary-foreground shadow-lg shadow-secondary/20 transition-all duration-500 hover:shadow-xl hover:shadow-secondary/30 active:scale-[0.98]"
              >
                <span className="relative z-10">Start selling</span>
                <ArrowRight className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </Link>

              {/* Trust badge */}
              <p className="mt-8 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">No seller commission</span>
                {' '}— only buyers pay a transparent 5% fee
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
