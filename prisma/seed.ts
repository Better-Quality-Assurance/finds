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
    prisma.user.create({
      data: {
        email: 'reviewer@finds.ro',
        name: 'Finds Reviewer',
        passwordHash,
        role: Role.REVIEWER,
        biddingEnabled: false,
        emailVerified: new Date(),
        preferredLanguage: 'en',
        termsAcceptedAt: new Date(),
      },
    }),
  ])

  const [andrei, mihai, elena, pierre, hans, maria, findsReviewer] = users

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
      title: '1990 Mercedes-Benz S124 300TD - Bordeaux Red (Vișiniu) - Estate Classic',
      description: `The ultimate classic Mercedes estate - the W124 platform in long-roof form with the legendary OM603 inline-6 diesel. Finished in stunning Bordeaux Red (Vișiniu - code 572), one of the most elegant colors offered on the W124.

**Highlights:**
- 3.0L OM603 inline-6 turbo diesel - 147 HP
- 4-speed automatic transmission
- 7-seat configuration (rear-facing third row)
- Original MB-Tex interior in Mushroom/Cream
- Self-leveling rear suspension (SLS)
- Heated front seats
- Rear headrests
- Original Becker Grand Prix radio/cassette

**The W124 Legend:**
Considered by many to be the last "over-engineered" Mercedes. Built to a standard, not a price. The W124 was developed with a 500,000 km design life - and this OM603 diesel regularly exceeds that figure. The estate variant (S124) is increasingly sought after by collectors and practical enthusiasts alike.

**Paint & Body:**
The Bordeaux Red metallic (Almandinrot 572) is in excellent condition with deep shine. No rust, no filler, no respray. Original factory paint verified with paint depth gauge. The color shifts beautifully from deep burgundy to rich cherry depending on light.

**Mechanical Condition:**
- Rust-free example, originally from Spain (dry climate)
- Recent timing chain service at 255,000 km
- New Garrett turbo fitted at 240,000 km (original failed)
- Gearbox serviced with fresh ATF and filter
- New vacuum pump and all vacuum lines replaced
- Fuel injection pump rebuilt by Bosch specialist
- Air suspension spheres replaced - rides like new

**Interior:**
The cream MB-Tex interior is in remarkable condition with no tears or significant wear. All electrics work including the rear-facing child seats, rear window blind, and central locking. Wood trim has minor patina but no cracks.

**Documentation:**
- Spanish registration documents (libreta)
- Full service history folder
- Romanian registration since 2019
- Fresh ITP valid 2 years

**Odometer shows 260,000 km** - these engines regularly exceed 500,000 km with proper maintenance. This one drives like it has half the miles. The turbodiesel pulls strongly from 2,000 rpm and returns 8-9L/100km on the highway.

Perfect for the enthusiast who needs to carry family, dogs, antiques, or all three in comfort and style.`,
      category: VehicleCategory.CLASSIC_CAR,
      make: 'Mercedes-Benz',
      model: '300TD (S124)',
      year: 1990,
      mileage: 260000,
      vin: 'WDB1240881F123456',
      registrationCountry: 'ES',
      conditionRating: 4,
      conditionNotes: 'Good condition. Well maintained. Bordeaux Red original paint.',
      knownIssues: 'Usual W124 items: one window regulator slow, minor oil weep from valve cover gasket',
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

  // Mock comments for each listing - Platform reviews and user Q&A
  type MockComment = {
    content: string
    isReview?: boolean
    isPinned?: boolean
    authorType?: 'seller' | 'buyer'
    daysAgo?: number
  }

  const mockComments: MockComment[][] = [
    // 0: Audi S4 B5 Avant
    [
      {
        content: `**Finds Platform Review**

We inspected this Audi S4 B5 Avant on-site in București. Here's what we found:

✅ **Verified:** VIN matches documentation, matching numbers confirmed
✅ **Exterior:** Imola Yellow paint is original and in excellent condition. Minor stone chips on hood as described.
✅ **Mechanical:** Started immediately, turbo spooling healthy, no smoke. Test drive confirmed strong performance.
✅ **Interior:** Recaro seats show minimal wear, all electronics functional.
⚠️ **Note:** AC compressor engages but doesn't cool - needs regas as seller stated.

**Overall Assessment:** This is a genuine, well-maintained example of an increasingly rare performance wagon. The Imola Yellow color and manual transmission make this particularly desirable. Recommended for serious collectors.

*Inspection performed by Finds team on ${new Date().toLocaleDateString('en-GB')}*`,
        isReview: true,
        isPinned: true,
        daysAgo: 5,
      },
      {
        content: 'Has the timing belt been done? The 2.7T is known for expensive timing belt services.',
        authorType: 'buyer',
        daysAgo: 4,
      },
      {
        content: 'Yes, timing belt, water pump, thermostat, and all rollers were replaced at 85,000 km by an Audi specialist. I have the invoice and can share photos of the parts. Next service is due at 145,000 km.',
        authorType: 'seller',
        daysAgo: 4,
      },
      {
        content: 'What\'s the turbo condition? Any wastegate rattle or boost leaks?',
        authorType: 'buyer',
        daysAgo: 3,
      },
      {
        content: 'Turbos are healthy - no wastegate rattle, holds boost perfectly. The K03s were checked during the last service. I have a VCDS log showing proper boost levels if you want to see it.',
        authorType: 'seller',
        daysAgo: 3,
      },
    ],

    // 1: Peugeot 106 GTI
    [
      {
        content: `**Finds Platform Review**

Inspected this Peugeot 106 GTI in Cluj-Napoca:

✅ **Engine:** Rebuilt 1.6L 16V runs sweetly, pulls hard to redline
✅ **Chassis:** Bilstein B8 dampers fitted, handles exceptionally well
✅ **Bodywork:** Light surface rust on rear arches as noted - surface only, no structural concerns
✅ **Documentation:** Service history present, two owners confirmed

**Track Potential:** With the rebuilt engine and upgraded suspension, this is ready for spirited use. Perfect weekend/track car.

*Inspected by Finds team*`,
        isReview: true,
        isPinned: true,
        daysAgo: 5,
      },
      {
        content: 'What work was done in the engine rebuild? Forged internals for boost potential?',
        authorType: 'buyer',
        daysAgo: 3,
      },
      {
        content: 'The rebuild included forged pistons (Wiseco), H-beam rods, ARP bolts, and a mild port work. Head gasket is a Cometic MLS. It was built to handle a future turbo kit but currently runs naturally aspirated.',
        authorType: 'seller',
        daysAgo: 3,
      },
    ],

    // 2: Peugeot 106 S16
    [
      {
        content: `**Finds Platform Review**

This is an exceptional example of a time-warp 106 S16:

✅ **Originality:** 100% factory specification, never modified
✅ **Documentation:** Complete service book with stamps, every ITP certificate from new
✅ **Condition:** Possibly the cleanest 106 S16 we've seen - exceptional care throughout
✅ **Provenance:** French delivery, one family owned until 2020

**Collector Note:** Unmodified S16s in this condition are extremely rare. Most have been modified or poorly maintained. This represents a museum-quality opportunity.

*Finds verification complete*`,
        isReview: true,
        isPinned: true,
        daysAgo: 5,
      },
      {
        content: 'Is this the TU5J4 engine or the later TU5JP4? Important for parts compatibility.',
        authorType: 'buyer',
        daysAgo: 4,
      },
      {
        content: 'This is the TU5J4 (1997 model year). Engine code visible on the block. It\'s the preferred version among enthusiasts.',
        authorType: 'seller',
        daysAgo: 4,
      },
    ],

    // 3: Peugeot 405 MI16
    [
      {
        content: `**Finds Platform Review**

We inspected this 405 MI16 with rally heritage in Brașov:

✅ **Engine:** The XU9J4 16V pulls strongly, characteristic 205 GTI/405 MI16 exhaust note
✅ **Transmission:** Close-ratio box shifts precisely, LSD confirmed working
✅ **Suspension:** Recent Koni/Eibach setup transforms the handling
✅ **History:** Previous owner was a rally co-driver - car was maintained to competition standards

**Driving Impression:** This MI16 drives significantly better than stock. The suspension refresh and stainless exhaust make it a joy on mountain roads.

*Finds team test drive completed*`,
        isReview: true,
        isPinned: true,
        daysAgo: 5,
      },
      {
        content: 'Beautiful car! Is the LSD original or aftermarket? And what ratio?',
        authorType: 'buyer',
        daysAgo: 2,
      },
      {
        content: 'It\'s the original Peugeot LSD fitted to MI16 models. Works perfectly - you can feel it pulling you out of corners. Factory ratio.',
        authorType: 'seller',
        daysAgo: 2,
      },
    ],

    // 4: MINI Cooper S JCW
    [
      {
        content: `**Finds Platform Review**

Factory JCW verification completed on this R53 MINI:

✅ **JCW Authenticity:** Confirmed factory JCW package - not an aftermarket kit
✅ **Supercharger:** Recently serviced, whine is healthy and boost is strong
✅ **Brakes:** JCW 4-pot calipers in excellent condition
✅ **Interior:** Rare Recaro Sportster CS seats in perfect condition

**Performance Check:** 0-100 km/h achieved in approximately 6.5 seconds - consistent with factory specs. Supercharger showing no signs of wear.

**Verdict:** Pampered, low-km factory JCW. These are appreciating as the best R53s become collectible.

*Full inspection by Finds team*`,
        isReview: true,
        isPinned: true,
        daysAgo: 5,
      },
      {
        content: 'Has the supercharger been rebuilt or just serviced?',
        authorType: 'buyer',
        daysAgo: 3,
      },
      {
        content: 'Serviced only - oil change and coupler check. The supercharger has never been rebuilt as it\'s never needed it. No bearing noise, no issues. These Eaton M45 units are very reliable when maintained.',
        authorType: 'seller',
        daysAgo: 3,
      },
      {
        content: 'Interested! Can you arrange viewing this weekend?',
        authorType: 'buyer',
        daysAgo: 1,
      },
    ],

    // 5: Mercedes 300TD S124 (Bordeaux Red)
    [
      {
        content: `**Finds Platform Review**

Full inspection of this Bordeaux Red S124 300TD in Constanța:

✅ **Paint:** Original Almandinrot 572 verified with paint gauge - no respray, no filler
✅ **Rust:** Completely rust-free - Spanish origin confirmed. Underside is clean.
✅ **OM603 Engine:** Starts instantly, no smoke, pulls strongly. Turbo rebuilt at 240k km.
✅ **Transmission:** 4-speed auto shifts smoothly, no slipping or harsh shifts
✅ **Interior:** MB-Tex in cream is excellent - these were built to last
✅ **SLS:** Self-leveling suspension works perfectly, rear rises with load

**Driving Impression:** This W124 estate drives remarkably well for its mileage. The OM603 is the best diesel Mercedes ever made - and this one has been maintained to that standard. The Bordeaux Red color is stunning in person.

**Documentation:** Spanish libreta, full service folder, Romanian papers in order.

*Comprehensive inspection by Finds team - recommended*`,
        isReview: true,
        isPinned: true,
        daysAgo: 5,
      },
      {
        content: 'Superb color! Does the third row fold flat? And how is the cargo area condition?',
        authorType: 'buyer',
        daysAgo: 4,
      },
      {
        content: 'Yes, both rear-facing seats fold completely flat into the floor. The cargo area is in excellent condition - original carpet, no tears. The cargo cover and net are also present.',
        authorType: 'seller',
        daysAgo: 4,
      },
      {
        content: 'What fuel consumption can I expect? I\'d use this for long trips.',
        authorType: 'buyer',
        daysAgo: 3,
      },
      {
        content: 'Highway driving at 120-130 km/h gives you about 8-9 L/100km. Mixed driving is around 10-11 L/100km. The OM603 is very efficient for its size and performance.',
        authorType: 'seller',
        daysAgo: 3,
      },
      {
        content: 'Vă rog, mașina poate fi văzută și în weekend? Vin din București.',
        authorType: 'buyer',
        daysAgo: 1,
      },
      {
        content: 'Da, desigur! Weekend-ul acesta sunt disponibil. Vă rog să mă contactați pentru a stabili ora exactă.',
        authorType: 'seller',
        daysAgo: 1,
      },
    ],

    // 6: Mercedes E320 Cabriolet A124
    [
      {
        content: `**Finds Platform Review**

Elegant A124 Cabriolet inspected in București:

✅ **Soft Top:** Excellent condition, no tears, clear rear window, operates smoothly
✅ **Hydraulics:** New rams fitted - roof opens/closes in approximately 30 seconds
✅ **M104 Engine:** Silky smooth inline-6, no issues
✅ **Body:** Chassis rigidity excellent - no scuttle shake

**Driving Experience:** The A124 is the best open-top W124 experience. The extensive chassis bracing means it drives nearly as solid as the coupe. The M104 provides effortless power.

**Condition Note:** Minor lacquer peel on front bumper as disclosed - an easy cosmetic fix.

*Finds team verification complete*`,
        isReview: true,
        isPinned: true,
        daysAgo: 5,
      },
      {
        content: 'How does it handle in rain with the soft top? Any leaks?',
        authorType: 'buyer',
        daysAgo: 3,
      },
      {
        content: 'No leaks at all. The soft top seals were replaced when the hydraulic rams were done. I\'ve driven in heavy rain without any water ingress.',
        authorType: 'seller',
        daysAgo: 3,
      },
    ],

    // 7: Mercedes E420 W210
    [
      {
        content: `**Finds Platform Review**

V8 W210 E420 inspected in Iași:

✅ **M119 V8:** The quad-cam V8 runs beautifully. No timing chain noise.
✅ **Transmission:** 5-speed auto is smooth and responsive
✅ **Rust:** Rear arches treated (common W210 issue) - currently solid
✅ **Designo Interior:** Rare two-tone specification in excellent condition

**Performance:** The M119 V8 offers genuine effortless performance. 279 HP feels like more due to the torque delivery.

**Recommendation:** This is a well-specified example with the desirable Designo interior. W210s with the M119 are becoming collectible.

*Finds inspection completed*`,
        isReview: true,
        isPinned: true,
        daysAgo: 5,
      },
      {
        content: 'How extensive was the rust treatment on the rear arches?',
        authorType: 'buyer',
        daysAgo: 4,
      },
      {
        content: 'The rust was caught early - just surface bubbles. It was sanded, treated with rust converter, primed, and painted. No welding required. I have photos of the process.',
        authorType: 'seller',
        daysAgo: 4,
      },
    ],

    // 8: BMW E30 325i
    [
      {
        content: `**Finds Platform Review**

E30 325i Sport Package verified in Sibiu:

✅ **Sport Package:** LSD, sport suspension, and sport seats confirmed present
✅ **M20B25:** The inline-6 runs smoothly with characteristic E30 character
✅ **Rust:** Completely rust-free - this is increasingly rare for E30s
✅ **Originality:** Matching numbers, original 15" BBS wheels

**Market Context:** Clean, rust-free E30 325is with Sport Package are highly sought after. Values have increased significantly in recent years.

**Condition:** Excellent driver quality. The headliner issue is minor and can be addressed easily.

*Verified by Finds team*`,
        isReview: true,
        isPinned: true,
        daysAgo: 5,
      },
      {
        content: 'Is the dogleg first gear gearbox original? Those are desirable.',
        authorType: 'buyer',
        daysAgo: 3,
      },
      {
        content: 'Yes, it\'s the original Getrag 260/5 dogleg box. Works perfectly, no synchro issues. First gear is slightly left and back, second is straight up.',
        authorType: 'seller',
        daysAgo: 3,
      },
      {
        content: 'Beautiful car. What\'s your reserve?',
        authorType: 'buyer',
        daysAgo: 2,
      },
      {
        content: 'This is a no-reserve auction - it will sell to the highest bidder!',
        authorType: 'seller',
        daysAgo: 2,
      },
    ],

    // 9: VW Golf GTI Mk2
    [
      {
        content: `**Finds Platform Review**

Mk2 Golf GTI inspected in Oradea:

✅ **Factory GTI:** Confirmed genuine GTI, not a conversion
✅ **8V Engine:** The bulletproof 1.8 8V runs sweetly
✅ **Bodywork:** Rust-free original panels - very rare for Mk2
✅ **Interior:** Tartan seats in good condition, dashboard has typical cracks

**Authenticity:** Original Pirelli P-slot wheels and Blaupunkt stereo add to the period correctness. This is how a Mk2 GTI left the factory.

**Investment Potential:** Clean, unmodified Mk2 GTIs are becoming scarce. This is a solid example with honest wear.

*Finds verification complete*`,
        isReview: true,
        isPinned: true,
        daysAgo: 5,
      },
      {
        content: 'Is this the big bumper or small bumper model?',
        authorType: 'buyer',
        daysAgo: 4,
      },
      {
        content: 'This is a 1991, so it has the big bumpers (post-facelift). The headlights are the later single-unit design.',
        authorType: 'seller',
        daysAgo: 4,
      },
    ],

    // 10: Alfa Romeo 156 GTA
    [
      {
        content: `**Finds Platform Review**

Busso V6 GTA inspected in Arad:

✅ **Busso V6:** The legendary 3.2L V6 sounds magnificent. Recent timing belt service.
✅ **Q-System:** LSD works correctly - confirmed during test drive
✅ **Condition:** Well maintained with full history
⚠️ **Note:** Minor rust bubbles on rear arches as disclosed - typical Alfa issue

**Driving Experience:** The Busso V6 is one of the greatest engines ever made. It pulls hard to 7,000 rpm with an incredible soundtrack. The GTA chassis upgrades make this a genuine driver's car.

**Critical:** Timing belt service documentation verified - essential for Busso engines.

*Enthusiast-approved by Finds team*`,
        isReview: true,
        isPinned: true,
        daysAgo: 5,
      },
      {
        content: 'How many km on the current timing belt?',
        authorType: 'buyer',
        daysAgo: 3,
      },
      {
        content: 'The timing belt was done at 118,000 km, so there\'s about 6,000 km on it. Full service with belt, tensioners, water pump, and auxiliary belts. Next service at 178,000 km or 5 years.',
        authorType: 'seller',
        daysAgo: 3,
      },
      {
        content: 'That Busso sound is addictive! GLWS, beautiful spec.',
        authorType: 'buyer',
        daysAgo: 2,
      },
    ],

    // 11: Lancia Delta HF Integrale (Barn Find)
    [
      {
        content: `**Finds Platform Review - BARN FIND**

We visited this Integrale in Sighișoara. Here's the honest assessment:

✅ **Authenticity:** Genuine HF Integrale - VIN verified, original engine/transmission
✅ **Completeness:** All major components present including turbos
✅ **Body:** Solid structure with only minor surface rust
⚠️ **Condition:** Non-running - stored since 2001
⚠️ **Needs:** Fuel system service, probable turbo rebuild, interior restoration

**Included:** Box of spare parts, original service book, period rally photos

**Restoration Estimate:** A specialist estimated €15,000-25,000 to bring this to driving condition, or €40,000+ for concours restoration.

**Investment Case:** Restored Integrales sell for €80,000-150,000. This is a genuine project with strong upside potential for the right buyer.

**Sold as-is.** We strongly recommend viewing before bidding.

*Finds on-site inspection completed*`,
        isReview: true,
        isPinned: true,
        daysAgo: 5,
      },
      {
        content: 'Does the engine turn over by hand? Any signs of seizure?',
        authorType: 'buyer',
        daysAgo: 4,
      },
      {
        content: 'Yes, the engine turns freely. I removed the spark plugs and put oil in the cylinders before storage. It cranks on the starter but doesn\'t fire - I believe it\'s a fuel system issue, possibly the injectors.',
        authorType: 'seller',
        daysAgo: 4,
      },
      {
        content: 'What condition are the body panels in? Any accident damage?',
        authorType: 'buyer',
        daysAgo: 3,
      },
      {
        content: 'No accident damage. All panels are straight, original, and numbers matching. The Martini livery is a later addition but was done professionally. Underneath, the floor and sills are solid.',
        authorType: 'seller',
        daysAgo: 3,
      },
      {
        content: 'This is exactly what I\'m looking for! Serious buyer here.',
        authorType: 'buyer',
        daysAgo: 1,
      },
    ],
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

    // Create placeholder media (using Unsplash with car-related keywords)
    const mediaCategories = ['exterior', 'exterior', 'interior', 'engine', 'detail']
    const carKeywords = ['classic-car', 'vintage-car', 'car-interior', 'car-engine', 'car-detail']
    const listingSeed = listing.id.slice(-8) // Use last 8 chars as unique sig
    await Promise.all(
      mediaCategories.map((category, index) =>
        prisma.listingMedia.create({
          data: {
            listingId: listing.id,
            type: 'PHOTO',
            storagePath: `listings/${listing.id}/${index}.jpg`,
            publicUrl: `https://source.unsplash.com/800x600/?${carKeywords[index]}&sig=${listingSeed}${index}`,
            thumbnailUrl: `https://source.unsplash.com/400x300/?${carKeywords[index]}&sig=${listingSeed}${index}`,
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

    // Add comments - Platform review and user questions
    const commentsForListing = mockComments[i] || []
    for (const comment of commentsForListing) {
      const commentAuthor = comment.isReview ? findsReviewer :
        comment.authorType === 'seller' ? users.find(u => u.id === car.sellerId)! :
        [pierre, hans, maria][Math.floor(Math.random() * 3)]

      await prisma.comment.create({
        data: {
          listingId: listing.id,
          authorId: commentAuthor.id,
          content: comment.content,
          isPinned: comment.isPinned || false,
          createdAt: new Date(now.getTime() - (comment.daysAgo || 3) * 24 * 60 * 60 * 1000),
        },
      })
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
