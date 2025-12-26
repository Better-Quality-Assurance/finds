import { PrismaClient, VehicleCategory, ListingStatus, AuctionStatus, Role } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Clean up existing data (in reverse order of dependencies)
  console.log('🧹 Cleaning up existing data...')
  await prisma.bid.deleteMany()
  await prisma.watchlist.deleteMany()
  await prisma.bidDeposit.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.auction.deleteMany()
  await prisma.listingMedia.deleteMany()
  await prisma.listing.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany({ where: { email: { contains: 'mock' } } })

  // Create mock users
  console.log('👥 Creating mock users...')
  const passwordHash = await hash('MockPassword123!', 12)

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'andrei.mock@finds.ro',
        name: 'Andrei Popescu',
        passwordHash,
        role: Role.SELLER,
        biddingEnabled: true,
        emailVerified: new Date(),
        preferredLanguage: 'ro',
        termsAcceptedAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'mihai.mock@finds.ro',
        name: 'Mihai Ionescu',
        passwordHash,
        role: Role.SELLER,
        biddingEnabled: true,
        emailVerified: new Date(),
        preferredLanguage: 'ro',
        termsAcceptedAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'elena.mock@finds.ro',
        name: 'Elena Dumitrescu',
        passwordHash,
        role: Role.SELLER,
        biddingEnabled: true,
        emailVerified: new Date(),
        preferredLanguage: 'en',
        termsAcceptedAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'pierre.mock@finds.ro',
        name: 'Pierre Dubois',
        passwordHash,
        role: Role.USER,
        biddingEnabled: true,
        emailVerified: new Date(),
        preferredLanguage: 'en',
        termsAcceptedAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'hans.mock@finds.ro',
        name: 'Hans Mueller',
        passwordHash,
        role: Role.USER,
        biddingEnabled: true,
        emailVerified: new Date(),
        preferredLanguage: 'en',
        termsAcceptedAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'maria.mock@finds.ro',
        name: 'Maria Constantinescu',
        passwordHash,
        role: Role.USER,
        biddingEnabled: true,
        emailVerified: new Date(),
        preferredLanguage: 'ro',
        termsAcceptedAt: new Date(),
      },
    }),
  ])

  const [andrei, mihai, elena, pierre, hans, maria] = users

  // Mock car data
  const mockCars = [
    {
      sellerId: andrei.id,
      title: '1999 Audi S4 B5 Avant - Imola Yellow - 90,000 km',
      description: `Rare opportunity to own an iconic Audi S4 B5 Avant in stunning Imola Yellow. This twin-turbo V6 quattro wagon is a true unicorn in the classic car world.

**Highlights:**
- Original Imola Yellow paint in excellent condition
- 2.7L Twin-Turbo V6 producing 265 HP
- Quattro all-wheel drive
- 6-speed manual transmission
- Recaro sport seats
- Full service history with Audi specialist

**Condition:**
The car has been well maintained and driven regularly. Recent service includes timing belt, water pump, and all fluids changed. The turbos are healthy with no signs of failure.

**Known Issues:**
- Minor stone chips on hood (touched up)
- Small dent on rear bumper
- AC needs regas

This is a matching numbers car with all original documentation. Perfect for the enthusiast who appreciates German engineering and rare colors.`,
      category: VehicleCategory.CLASSIC_CAR,
      make: 'Audi',
      model: 'S4 B5 Avant',
      year: 1999,
      mileage: 90000,
      vin: 'WAUZZZ8DZWA123456',
      registrationCountry: 'RO',
      conditionRating: 4,
      conditionNotes: 'Excellent condition for age. Well maintained.',
      knownIssues: 'AC needs regas, minor cosmetic imperfections',
      isRunning: true,
      locationCountry: 'RO',
      locationCity: 'București',
      locationRegion: 'Ilfov',
      startingPrice: 18000,
      reservePrice: 25000,
      hasReserve: true,
    },
    {
      sellerId: mihai.id,
      title: '1996 Peugeot 106 GTI - Cherry Red - Track Ready',
      description: `The legendary pocket rocket! This Peugeot 106 GTI is ready for spirited driving on road or track.

**Highlights:**
- 1.6L 16V engine producing 120 HP
- Only 1,020 kg kerb weight
- Original GTI interior with bucket seats
- Short-shift gear linkage
- Bilstein B8 dampers
- Fresh MOT/ITP

**History:**
Two owners from new, always garaged. Engine rebuilt 15,000 km ago with forged internals.

This is the perfect entry into classic hot hatch ownership. Light, nimble, and incredibly fun to drive.`,
      category: VehicleCategory.RETRO_CAR,
      make: 'Peugeot',
      model: '106 GTI',
      year: 1996,
      mileage: 142000,
      vin: 'VF31CNFX000123456',
      registrationCountry: 'RO',
      conditionRating: 4,
      conditionNotes: 'Very good condition. Engine rebuilt.',
      knownIssues: 'Light surface rust on rear wheel arches',
      isRunning: true,
      locationCountry: 'RO',
      locationCity: 'Cluj-Napoca',
      locationRegion: 'Cluj',
      startingPrice: 8000,
      reservePrice: null,
      hasReserve: false,
    },
    {
      sellerId: elena.id,
      title: '1997 Peugeot 106 S16 - Bianca White - Unmodified',
      description: `Completely original Peugeot 106 S16 in factory specification. The S16 was the top-spec hot hatch version sold in continental Europe.

**Highlights:**
- 1.6L 16V TU5J4 engine - 118 HP
- Original 14" Speedline wheels
- Factory half-leather interior
- Air conditioning (working!)
- Electric windows and mirrors
- All books and service history

**Condition:**
This is a time warp example. Never modified, always serviced at Peugeot dealers until 2015, then with specialist.

**Documentation:**
- Original purchase invoice
- Complete service book
- Every MOT certificate from new
- Two keys

A rare opportunity for collectors seeking an unmolested example.`,
      category: VehicleCategory.RETRO_CAR,
      make: 'Peugeot',
      model: '106 S16',
      year: 1997,
      mileage: 89000,
      vin: 'VF31CNFX000234567',
      registrationCountry: 'FR',
      conditionRating: 5,
      conditionNotes: 'Exceptional original condition.',
      knownIssues: 'None',
      isRunning: true,
      locationCountry: 'RO',
      locationCity: 'Timișoara',
      locationRegion: 'Timiș',
      startingPrice: 12000,
      reservePrice: 15000,
      hasReserve: true,
    },
    {
      sellerId: andrei.id,
      title: '1990 Peugeot 405 MI16 - Graphite Grey - Rally Heritage',
      description: `The legendary 405 MI16 - developed with motorsport DNA and winner of multiple touring car championships.

**Highlights:**
- 1.9L XU9J4 16-valve engine - 160 HP
- Close-ratio 5-speed manual
- Limited slip differential
- BBS alloy wheels
- Recaro front seats
- Sunroof delete (factory option)

**Motorsport Heritage:**
The 405 MI16 was Peugeot's Group A homologation special. This example was owned by a former rally co-driver who maintained it meticulously.

**Recent Work:**
- Full suspension refresh (Koni dampers, Eibach springs)
- Stainless exhaust system
- New clutch at 145,000 km

The car drives beautifully and turns heads at every classic car meet.`,
      category: VehicleCategory.CLASSIC_CAR,
      make: 'Peugeot',
      model: '405 MI16',
      year: 1990,
      mileage: 156000,
      vin: 'VF315BD0000345678',
      registrationCountry: 'RO',
      conditionRating: 4,
      conditionNotes: 'Very good driver condition. Mechanically excellent.',
      knownIssues: 'Original paint showing age in places',
      isRunning: true,
      locationCountry: 'RO',
      locationCity: 'Brașov',
      locationRegion: 'Brașov',
      startingPrice: 9500,
      reservePrice: null,
      hasReserve: false,
    },
    {
      sellerId: mihai.id,
      title: '2005 MINI Cooper S JCW - Jet Black - 80,000 km',
      description: `John Cooper Works tuned MINI Cooper S - the ultimate R53 specification with supercharged performance.

**Highlights:**
- 1.6L Supercharged engine with JCW kit - 210 HP
- JCW aerodynamic body kit
- JCW 18" wheels
- JCW brakes (4-pot front)
- JCW exhaust system
- Recaro Sportster CS seats

**Specification:**
This is a factory JCW car, not an aftermarket conversion. Full JCW specification from new including:
- Chili Pack
- Visibility Pack
- Chrome Line exterior
- Harman Kardon audio

**Condition:**
Pampered example with full service history. Recently had supercharger service and new drive belts. MOT until December 2025.

The perfect modern classic that's usable every day but exciting when you want it to be.`,
      category: VehicleCategory.RETRO_CAR,
      make: 'MINI',
      model: 'Cooper S JCW',
      year: 2005,
      mileage: 80000,
      vin: 'WMWRE33455TC12345',
      registrationCountry: 'DE',
      conditionRating: 5,
      conditionNotes: 'Excellent throughout. Pampered example.',
      knownIssues: 'None - recently serviced',
      isRunning: true,
      locationCountry: 'RO',
      locationCity: 'București',
      locationRegion: 'București',
      startingPrice: 15000,
      reservePrice: 19000,
      hasReserve: true,
    },
    {
      sellerId: elena.id,
      title: '1990 Mercedes-Benz S124 300TD - Silver/Blue - Estate Classic',
      description: `The ultimate classic Mercedes estate - the W124 platform in long-roof form with the legendary OM603 inline-6 diesel.

**Highlights:**
- 3.0L OM603 inline-6 turbo diesel - 147 HP
- 4-speed automatic transmission
- 7-seat configuration
- Original MB-Tex interior in blue
- Self-leveling rear suspension
- Heated front seats

**The W124 Legend:**
Considered by many to be the last "over-engineered" Mercedes. Built to a standard, not a price. This estate variant (S124) is increasingly sought after.

**Condition:**
- Rust-free example from southern Europe
- Recent timing chain service
- New turbo fitted at 280,000 km
- Gearbox serviced with fresh ATF

**Odometer shows 312,000 km** - these engines regularly exceed 500,000 km with proper maintenance. Drives like it has half the miles.`,
      category: VehicleCategory.CLASSIC_CAR,
      make: 'Mercedes-Benz',
      model: '300TD (S124)',
      year: 1990,
      mileage: 312000,
      vin: 'WDB1240881F123456',
      registrationCountry: 'ES',
      conditionRating: 4,
      conditionNotes: 'Good condition. High mileage but well maintained.',
      knownIssues: 'Usual W124 items: window regulators, vacuum lines',
      isRunning: true,
      locationCountry: 'RO',
      locationCity: 'Constanța',
      locationRegion: 'Constanța',
      startingPrice: 8500,
      reservePrice: null,
      hasReserve: false,
    },
    {
      sellerId: andrei.id,
      title: '1995 Mercedes-Benz E320 Cabriolet (A124) - Midnight Blue',
      description: `Elegant open-top motoring in the most refined W124 variant - the A124 Cabriolet with the silky M104 inline-6.

**Highlights:**
- 3.2L M104 24-valve inline-6 - 220 HP
- 5-speed automatic
- Power soft top (fully functional)
- Full leather interior in Mushroom
- Heated seats
- Electric windows, mirrors, and seats
- Genuine BBS wheels

**Cabriolet Specific:**
The A124 featured extensive chassis reinforcement and the famous "tennis ball test" build quality. Soft top is in excellent condition with clear rear window.

**History:**
Originally delivered to Germany, brought to Romania in 2018. Two owners in Romania, both enthusiasts. Full service history available.

**Recent Investment:**
- Complete soft top service
- New hydraulic rams
- Full fluid change
- Comprehensive detail

A sophisticated grand tourer perfect for European road trips.`,
      category: VehicleCategory.CLASSIC_CAR,
      make: 'Mercedes-Benz',
      model: 'E320 Cabriolet (A124)',
      year: 1995,
      mileage: 178000,
      vin: 'WDB1240661F234567',
      registrationCountry: 'DE',
      conditionRating: 4,
      conditionNotes: 'Very good condition. Soft top excellent.',
      knownIssues: 'Minor lacquer peel on front bumper',
      isRunning: true,
      locationCountry: 'RO',
      locationCity: 'București',
      locationRegion: 'București',
      startingPrice: 22000,
      reservePrice: 28000,
      hasReserve: true,
    },
    {
      sellerId: mihai.id,
      title: '1996 Mercedes-Benz E420 (W210) - Obsidian Black - V8 Luxury',
      description: `The V8-powered W210 E-Class - effortless performance wrapped in subtle luxury. The E420 was the last naturally-aspirated V8 E-Class.

**Highlights:**
- 4.2L M119 V8 - 279 HP
- 5-speed automatic
- AMG Monoblock wheels (18")
- Full Designo leather interior
- COMAND navigation (period correct)
- Xenon headlights
- Parktronic

**The M119 Engine:**
The M119 is Mercedes' legendary quad-cam V8, also found in the 500E and various AMG models. Known for reliability and a wonderful exhaust note.

**Specification:**
This is a highly optioned Elegance model with every available extra from the period. The Designo interior in two-tone grey/black is particularly rare.

**Condition:**
Excellent example showing genuine 156,000 km. Recent service includes spark plugs, coil packs, and transmission service.

For the buyer who wants V8 smoothness without the complexity of later models.`,
      category: VehicleCategory.CLASSIC_CAR,
      make: 'Mercedes-Benz',
      model: 'E420 (W210)',
      year: 1996,
      mileage: 156000,
      vin: 'WDB2100721A345678',
      registrationCountry: 'RO',
      conditionRating: 4,
      conditionNotes: 'Very good throughout. Well specified.',
      knownIssues: 'Typical W210 rust starting at rear wheel arches - treated',
      isRunning: true,
      locationCountry: 'RO',
      locationCity: 'Iași',
      locationRegion: 'Iași',
      startingPrice: 11000,
      reservePrice: 14000,
      hasReserve: true,
    },
    {
      sellerId: elena.id,
      title: '1988 BMW E30 325i - Alpine White - Sport Package',
      description: `The definitive sports sedan of the 1980s - BMW E30 325i with the desirable Sport Package.

**Highlights:**
- 2.5L M20B25 inline-6 - 171 HP
- 5-speed Getrag manual (dogleg first)
- Sport Package: LSD, sport suspension, sport seats
- Original 15" BBS basketweave wheels
- Electric sunroof
- Onboard computer

**E30 Excellence:**
The E30 3-Series set the template for the modern sports sedan. This 325i combines the perfect engine with lightweight construction.

**Documented History:**
- Original German delivery paperwork
- Service stamps through 2019
- Previous owner was BMW Classic member
- Timing belt done at 185,000 km

**Condition:**
Excellent driver quality. Some stone chips and age-appropriate wear but no rust and never welded. Interior is remarkably preserved.

These are appreciating rapidly - don't miss this opportunity.`,
      category: VehicleCategory.CLASSIC_CAR,
      make: 'BMW',
      model: '325i (E30)',
      year: 1988,
      mileage: 198000,
      vin: 'WBAAB510X0EC12345',
      registrationCountry: 'DE',
      conditionRating: 4,
      conditionNotes: 'Very good driver quality. No rust.',
      knownIssues: 'Headliner sagging slightly',
      isRunning: true,
      locationCountry: 'RO',
      locationCity: 'Sibiu',
      locationRegion: 'Sibiu',
      startingPrice: 16000,
      reservePrice: null,
      hasReserve: false,
    },
    {
      sellerId: andrei.id,
      title: '1991 Volkswagen Golf GTI Mk2 - Tornado Red - 8V Classic',
      description: `The people's sports car - Golf GTI Mk2 in iconic Tornado Red with the bulletproof 8-valve engine.

**Highlights:**
- 1.8L 8V engine - 112 HP
- 5-speed manual
- GTI interior with tartan seats
- Steel sunroof
- Original Pirelli P-slot wheels
- Period-correct Blaupunkt stereo

**GTI Heritage:**
The Mk2 GTI refined everything the Mk1 started. More refined, more capable, yet still analogue and engaging to drive.

**This Example:**
Factory GTI from new, not a conversion. Never modified, always maintained to schedule. Recent cambelt and water pump service.

**Bodywork:**
Rust-free thanks to careful ownership. Original paint with only minor touch-ups. All original panels, numbers matching throughout.

An increasingly rare opportunity to own a definitive 1980s hot hatch icon.`,
      category: VehicleCategory.CLASSIC_CAR,
      make: 'Volkswagen',
      model: 'Golf GTI Mk2',
      year: 1991,
      mileage: 167000,
      vin: 'WVWZZZ1GZLW123456',
      registrationCountry: 'RO',
      conditionRating: 4,
      conditionNotes: 'Very good original condition.',
      knownIssues: 'Dashboard has minor cracks (common)',
      isRunning: true,
      locationCountry: 'RO',
      locationCity: 'Oradea',
      locationRegion: 'Bihor',
      startingPrice: 14000,
      reservePrice: 18000,
      hasReserve: true,
    },
    {
      sellerId: mihai.id,
      title: '2003 Alfa Romeo 156 GTA - Nuvola Blue - V6 Busso',
      description: `The last hurrah of Alfa's legendary Busso V6 - the 156 GTA represents peak naturally-aspirated performance.

**Highlights:**
- 3.2L Busso V6 - 250 HP @ 6,200 rpm
- 6-speed manual (Getrag)
- Q-System limited slip differential
- 17" GTA alloy wheels
- Leather/Alcantara Recaro seats
- BOSE sound system

**The Busso V6:**
Giuseppe Busso's masterpiece - this 24-valve V6 has one of the finest soundtracks of any production engine. It revs to 7,000 rpm and sounds magnificent doing it.

**GTA Specific:**
The 156 GTA received extensive chassis modifications:
- 50% stiffer springs
- Larger anti-roll bars
- 305mm front brakes
- Unique steering rack

**Condition:**
Well-maintained example with full service history. Recent timing belt service (the critical item on Busso engines). Drives beautifully with no faults.

For the enthusiast who prioritizes driving experience above all else.`,
      category: VehicleCategory.RETRO_CAR,
      make: 'Alfa Romeo',
      model: '156 GTA',
      year: 2003,
      mileage: 124000,
      vin: 'ZAR93200000456789',
      registrationCountry: 'IT',
      conditionRating: 4,
      conditionNotes: 'Good condition. Well serviced.',
      knownIssues: 'Typical Alfa rust bubbles on rear arches (minor)',
      isRunning: true,
      locationCountry: 'RO',
      locationCity: 'Arad',
      locationRegion: 'Arad',
      startingPrice: 18500,
      reservePrice: 23000,
      hasReserve: true,
    },
    {
      sellerId: elena.id,
      title: '1987 Lancia Delta HF Integrale - Martini Livery - Barn Find',
      description: `A true barn find - Lancia Delta HF Integrale in period-correct Martini racing livery, discovered in a rural garage in Transylvania.

**The Discovery:**
Found in a barn near Sighișoara, this Integrale had been stored since 2001. The previous owner was a rally enthusiast who intended to restore it but never completed the project.

**Current Condition:**
- Engine turns over but doesn't start (fuel system needs attention)
- Interior is complete but needs restoration
- Bodywork is solid with only minor rust
- All mechanical components present
- Original turbocharged engine and transmission

**What's Included:**
- Complete car as found
- Box of spare parts (turbo, injectors, belts)
- Original Lancia service book
- Period photos of the car at rallies

**Restoration Potential:**
This is a genuine restoration project, not a parts car. With the Integrale market values strong, this represents an excellent opportunity for the dedicated enthusiast.

**Sold as-is, where-is.** Viewing highly recommended.`,
      category: VehicleCategory.BARN_FIND,
      make: 'Lancia',
      model: 'Delta HF Integrale',
      year: 1987,
      mileage: 89000,
      vin: 'ZLA831AB000567890',
      registrationCountry: 'RO',
      conditionRating: 2,
      conditionNotes: 'Barn find condition. Complete but needs restoration.',
      knownIssues: 'Non-running. Fuel system, possible turbo rebuild, interior restoration needed.',
      isRunning: false,
      locationCountry: 'RO',
      locationCity: 'Sighișoara',
      locationRegion: 'Mureș',
      startingPrice: 25000,
      reservePrice: null,
      hasReserve: false,
    },
  ]

  // Calculate auction times - spread them across different end times
  const now = new Date()
  const getAuctionTimes = (index: number) => {
    const daysOffset = Math.floor(index / 3) // Group auctions
    const hoursOffset = (index % 3) * 4 + 2 // Stagger within groups

    const startTime = new Date(now)
    startTime.setDate(startTime.getDate() - 5) // Started 5 days ago

    const endTime = new Date(now)
    endTime.setDate(endTime.getDate() + daysOffset)
    endTime.setHours(18 + hoursOffset, 0, 0, 0) // Evening times

    return { startTime, endTime }
  }

  console.log('🚗 Creating listings and auctions...')

  for (let i = 0; i < mockCars.length; i++) {
    const car = mockCars[i]
    const { startTime, endTime } = getAuctionTimes(i)

    // Create listing
    const listing = await prisma.listing.create({
      data: {
        sellerId: car.sellerId,
        title: car.title,
        description: car.description,
        category: car.category,
        make: car.make,
        model: car.model,
        year: car.year,
        mileage: car.mileage,
        vin: car.vin,
        registrationCountry: car.registrationCountry,
        conditionRating: car.conditionRating,
        conditionNotes: car.conditionNotes,
        knownIssues: car.knownIssues,
        isRunning: car.isRunning,
        locationCountry: car.locationCountry,
        locationCity: car.locationCity,
        locationRegion: car.locationRegion,
        startingPrice: car.startingPrice,
        reservePrice: car.reservePrice,
        currency: 'EUR',
        status: ListingStatus.ACTIVE,
        submittedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        approvedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      },
    })

    // Create placeholder media (using placeholder images)
    const mediaCategories = ['exterior', 'exterior', 'interior', 'engine', 'detail']
    await Promise.all(
      mediaCategories.map((category, index) =>
        prisma.listingMedia.create({
          data: {
            listingId: listing.id,
            type: 'PHOTO',
            storagePath: `listings/${listing.id}/${index}.jpg`,
            publicUrl: `https://placehold.co/800x600/1a1a2e/eaeaea?text=${encodeURIComponent(car.make + ' ' + car.model)}`,
            thumbnailUrl: `https://placehold.co/400x300/1a1a2e/eaeaea?text=${encodeURIComponent(car.make)}`,
            position: index,
            isPrimary: index === 0,
            category,
          },
        })
      )
    )

    // Determine auction status based on end time
    const isEnded = endTime < now
    const status = isEnded
      ? (car.hasReserve ? AuctionStatus.NO_SALE : AuctionStatus.SOLD)
      : AuctionStatus.ACTIVE

    // Generate random bid activity
    const bidCount = Math.floor(Math.random() * 15) + 3 // 3-17 bids
    let currentBid = car.startingPrice
    const bidIncrement = currentBid < 10000 ? 100 : currentBid < 20000 ? 250 : 500

    // Create auction
    const auction = await prisma.auction.create({
      data: {
        listingId: listing.id,
        startTime,
        originalEndTime: endTime,
        currentEndTime: endTime,
        antiSnipingEnabled: true,
        startingPrice: car.startingPrice,
        reservePrice: car.reservePrice,
        reserveMet: car.hasReserve ? currentBid >= (car.reservePrice ?? 0) : false,
        currentBid: currentBid + (bidCount * bidIncrement),
        bidIncrement,
        bidCount,
        status,
        currency: 'EUR',
      },
    })

    // Create bids for this auction
    const bidders = [pierre, hans, maria].filter(b => b.id !== car.sellerId)
    const bidTimes: Date[] = []

    for (let b = 0; b < bidCount; b++) {
      // Spread bids across the auction duration
      const bidTime = new Date(startTime.getTime() + ((endTime.getTime() - startTime.getTime()) * (b + 1)) / (bidCount + 1))
      bidTimes.push(bidTime)
      currentBid += bidIncrement

      const bidder = bidders[b % bidders.length]

      await prisma.bid.create({
        data: {
          auctionId: auction.id,
          bidderId: bidder.id,
          amount: currentBid,
          currency: 'EUR',
          isWinning: b === bidCount - 1, // Last bid is winning
          isValid: true,
          triggeredExtension: false,
          createdAt: bidTime,
        },
      })
    }

    // Update auction with final bid amount
    const finalBid = car.startingPrice + (bidCount * bidIncrement)
    const reserveMet = !car.hasReserve || finalBid >= (car.reservePrice ?? 0)

    await prisma.auction.update({
      where: { id: auction.id },
      data: {
        currentBid: finalBid,
        reserveMet,
        bidCount,
      },
    })

    // Add some watchlist entries
    const watchUsers = [pierre, hans, maria].slice(0, Math.floor(Math.random() * 3) + 1)
    for (const watchUser of watchUsers) {
      if (watchUser.id !== car.sellerId) {
        await prisma.watchlist.create({
          data: {
            userId: watchUser.id,
            auctionId: auction.id,
            notifyOnBid: true,
            notifyOnEnd: true,
          },
        })
      }
    }

    console.log(`  ✅ Created: ${car.title}`)
  }

  console.log('\n✨ Seed completed successfully!')
  console.log(`   - ${users.length} users created`)
  console.log(`   - ${mockCars.length} listings created`)
  console.log(`   - ${mockCars.length} auctions created`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
