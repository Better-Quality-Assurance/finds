/**
 * Script to update mock listings with realistic photos and descriptions
 * Run with: DATABASE_URL="..." npx tsx scripts/update-mock-listings.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface MockListingUpdate {
  make: string
  model: string
  description: string
  images: string[]
}

// Real car images from Wikimedia Commons (CC licensed) for each mock car
// Using Special:FilePath for direct image URLs with width parameter
const wikiImg = (filename: string, width = 1200) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`

const mockListingUpdates: MockListingUpdate[] = [
  {
    // 1999 Audi S4 B5 Avant - Imola Yellow
    make: 'Audi',
    model: 'S4 B5 Avant',
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
    images: [
      wikiImg('Yellow_Audi_S4_B5.jpg'),
      wikiImg('Audi_S4_B5_Interior.jpg'),
      wikiImg('Audi_S4_B5_(6385415731).jpg'),
      wikiImg('Audi_S4_B5_rear.jpg'),
    ],
  },
  {
    // 1996 Peugeot 106 GTI - Cherry Red
    make: 'Peugeot',
    model: '106 GTI',
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
    images: [
      wikiImg('1997_Peugeot_106_GTi.jpg'),
      wikiImg('2002_Peugeot_106_GTi.jpg'),
      wikiImg('Peugeot_106_GTi_-_Flickr_-_Alexandre_Prévot_(2).jpg'),
      wikiImg('Peugeot_106_front_20080828.jpg'),
    ],
  },
  {
    // 1997 Peugeot 106 S16 - Bianca White
    make: 'Peugeot',
    model: '106 S16',
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
    images: [
      wikiImg('Peugeot_106_S16_white.jpg'),
      wikiImg('Peugeot_106_rear_20080828.jpg'),
      wikiImg('Peugeot_106_1.5_Diesel.JPG'),
      wikiImg('Peugeot_106_front_20080828.jpg'),
    ],
  },
  {
    // 1990 Peugeot 405 MI16 - Graphite Grey
    make: 'Peugeot',
    model: '405 MI16',
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
    images: [
      wikiImg('Peugeot_405-Mi16_Front.jpg'),
      wikiImg('1989_Peugeot_405_Mi16_(15660610326).jpg'),
      wikiImg('Peugeot_405_front_20071212.jpg'),
      wikiImg('Peugeot_405_rear_20071212.jpg'),
    ],
  },
  {
    // 2005 MINI Cooper S JCW - Jet Black
    make: 'MINI',
    model: 'Cooper S JCW',
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
    images: [
      wikiImg('Mini_Cooper_S_JCW.JPG'),
      wikiImg('Mini_Cooper_S_R53.jpg'),
      wikiImg('2005_Mini_Cooper_S_(R53)_hatchback_(2010-07-13).jpg'),
      wikiImg('MINI_R53_Hatch_Cooper_S_Indi_Blue.jpg'),
    ],
  },
  {
    // 1990 Mercedes-Benz S124 300TD - Bordeaux Red
    make: 'Mercedes-Benz',
    model: '300TD (S124)',
    description: `The ultimate classic Mercedes estate - the W124 platform in long-roof form with the legendary OM603 inline-6 diesel. Finished in stunning Bordeaux Red (Almandinrot 572), one of the most elegant colors offered on the W124.

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

**Documentation:**
- Spanish registration documents (libreta)
- Full service history folder
- Romanian registration since 2019
- Fresh ITP valid 2 years

**Odometer shows 260,000 km** - these engines regularly exceed 500,000 km with proper maintenance.`,
    images: [
      wikiImg('Mercedes-Benz_300TD_wagon.jpg'),
      wikiImg('Mercedes-Benz_W124_Estate_red.jpg'),
      wikiImg('Mercedes-Benz_S124_T-Modell.jpg'),
      wikiImg('Mercedes-Benz_W124_T-Modell_rear_20100612.jpg'),
    ],
  },
  {
    // 1995 Mercedes-Benz E320 Cabriolet (A124) - Midnight Blue
    make: 'Mercedes-Benz',
    model: 'E320 Cabriolet (A124)',
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
    images: [
      wikiImg('Mercedes-Benz_A124_E320_Cabriolet.jpg'),
      wikiImg('Mercedes-Benz_W124_Cabriolet_front_20110611.jpg'),
      wikiImg('Mercedes-Benz_W124_Cabriolet_rear_20110611.jpg'),
      wikiImg('Mercedes-Benz_E-Class_Cabriolet_(A124).jpg'),
    ],
  },
  {
    // 1996 Mercedes-Benz E420 (W210) - Obsidian Black
    make: 'Mercedes-Benz',
    model: 'E420 (W210)',
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
    images: [
      wikiImg('Mercedes-Benz_W210_E420_black.jpg'),
      wikiImg('1999_Mercedes-Benz_E_430_(W_210)_Elegance_sedan_(2015-07-09)_01.jpg'),
      wikiImg('Mercedes-Benz_W210_rear_20080102.jpg'),
      wikiImg('Mercedes-Benz_W210_front_20080102.jpg'),
    ],
  },
  {
    // 1988 BMW E30 325i - Alpine White
    make: 'BMW',
    model: '325i (E30)',
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
    images: [
      wikiImg('BMW_E30_325i_white.jpg'),
      wikiImg('BMW_E30.JPG'),
      wikiImg('1986_BMW_325i_(15173144043).jpg'),
      wikiImg('BMW_E30_Touring_CIMG5253.JPG'),
    ],
  },
  {
    // 1991 Volkswagen Golf GTI Mk2 - Tornado Red
    make: 'Volkswagen',
    model: 'Golf GTI Mk2',
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
    images: [
      wikiImg('Volkswagen_Golf_II_GTI.JPG'),
      wikiImg("'85-'86_Volkswagen_Golf_GTI.JPG"),
      wikiImg('Volkswagen_Golf_Mk2_GTi_(15173144043).jpg'),
      wikiImg('Volkswagen_GTI_Mk2_3-door.jpg'),
    ],
  },
  {
    // 2003 Alfa Romeo 156 GTA - Nuvola Blue
    make: 'Alfa Romeo',
    model: '156 GTA',
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
    images: [
      wikiImg('Alfa_Romeo_156_GTA_.jpg'),
      wikiImg('2003_Alfa_Romeo_156_GTA_3.2_V6.jpg'),
      wikiImg('Alfa_Romeo_156_GTA_-_Flickr_-_Alexandre_Prévot.jpg'),
      wikiImg('Alfa_156_Goodwood_IMG_4232.jpg'),
    ],
  },
  {
    // 1987 Lancia Delta HF Integrale - Martini Livery - Barn Find
    make: 'Lancia',
    model: 'Delta HF Integrale',
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
    images: [
      wikiImg('Lancia_Delta_Integrale_Evoluzione.JPG'),
      wikiImg('Lancia_Delta_HF_Integrale_16V_Engine_001.JPG'),
      wikiImg('1st_generation_Lancia_DELTA_HF_Integrale_16v_front.JPG'),
      wikiImg('Lancia_DELTA_HF_Integrale_8v_(E-L31D5)_rear.jpg'),
    ],
  },
]

async function updateMockListings() {
  console.log('Updating mock listings with realistic content...')

  for (const update of mockListingUpdates) {
    try {
      // Find the listing by make and model
      const listing = await prisma.listing.findFirst({
        where: {
          make: update.make,
          model: update.model,
          status: 'ACTIVE',
        },
        include: {
          media: true,
        },
      })

      if (!listing) {
        console.log(`Listing not found: ${update.make} ${update.model}`)
        continue
      }

      // Note: Not updating description to preserve original seed data
      // Only updating images to use real car photos

      // Delete existing media
      await prisma.listingMedia.deleteMany({
        where: { listingId: listing.id },
      })

      // Add new images
      for (let i = 0; i < update.images.length; i++) {
        const publicUrl = update.images[i]
        // Generate thumbnail URL by replacing width parameter
        const thumbnailUrl = publicUrl.replace('width=1200', 'width=400')

        await prisma.listingMedia.create({
          data: {
            listingId: listing.id,
            type: 'PHOTO',
            publicUrl,
            thumbnailUrl,
            storagePath: `mock/${listing.id}/${i}.jpg`, // Mock storage path
            position: i,
            isPrimary: i === 0,
          },
        })
      }

      console.log(`Updated: ${update.make} ${update.model}`)
    } catch (error) {
      console.error(`Error updating ${update.make} ${update.model}:`, error)
    }
  }

  console.log('Done!')
}

updateMockListings()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
