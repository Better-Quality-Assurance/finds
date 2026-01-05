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

// Realistic descriptions and image URLs for each mock car
const mockListingUpdates: MockListingUpdate[] = [
  {
    make: 'Alfa Romeo',
    model: '156 GTA',
    description: `This Alfa Romeo 156 GTA is a striking example of the Italian performance sedan, powered by the legendary 3.2-litre 'Busso' V6 engine producing 247bhp. The car features a six-speed manual gearbox and a Quaife limited-slip differential, offering an engaging driving experience.

Finished in Rosso Alfa over black leather interior with contrasting red stitching, this GTA shows well throughout. The Busso V6 is renowned for its sonorous exhaust note and high-revving character, making this one of the most desirable modern Alfas.

Recent maintenance includes timing belt service, new spark plugs, and fresh brake pads all round. The car comes with full service history and original toolkit. A perfect weekend driver for the enthusiast who appreciates Italian engineering at its finest.`,
    images: [
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1200&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=80',
      'https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200&q=80',
    ],
  },
  {
    make: 'Audi',
    model: 'S4 B5 Avant',
    description: `This 1999 Audi S4 Avant represents the pinnacle of the B5 platform - a twin-turbocharged 2.7-litre V6 producing 265bhp in estate form. Finished in Nogaro Blue, one of the most iconic colors for this model.

The quattro all-wheel-drive system provides exceptional traction in all conditions, while the Tiptronic automatic transmission offers smooth power delivery. Interior is trimmed in black leather with Alcantara inserts, showing minimal wear.

Modifications include an uprated exhaust, stage 1 ECU tune, and lowered suspension on quality coilovers. Recent service includes new turbos, timing belt, and water pump. All receipts included. A practical yet rapid family hauler that's become a modern classic.`,
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&q=80',
      'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=1200&q=80',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80',
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&q=80',
    ],
  },
  {
    make: 'BMW',
    model: '325i (E30)',
    description: `This E30-generation BMW 325i is a timeless modern classic, representing everything that made BMW's "Ultimate Driving Machine" slogan ring true in the 1980s. Powered by the smooth 2.5-litre M20 inline-six producing 168bhp.

Finished in Alpinweiss II over Sport seats in anthracite cloth, this example features the sought-after M-Technic I bodykit. The car has been meticulously maintained with comprehensive service records from BMW specialists.

Recent work includes a full suspension refresh with Bilstein dampers, new cooling system components, and a rebuild of the Getrag 260 five-speed manual gearbox. Original toolkit and documentation included. An increasingly collectible E30 in excellent driver-quality condition.`,
    images: [
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=80',
      'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=1200&q=80',
      'https://images.unsplash.com/photo-1520050206757-06d6bfd18bfc?w=1200&q=80',
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200&q=80',
    ],
  },
  {
    make: 'Lancia',
    model: 'Delta HF Integrale',
    description: `This Lancia Delta HF Integrale is a genuine homologation special, one of the rally-bred road cars that dominated Group A rallying in the late 1980s. The 2.0-litre turbocharged four-cylinder produces 185bhp sent through a permanent four-wheel-drive system.

Presented in Rosso Monza over Alcantara/leather interior, this Integrale shows the characteristic wide arches and aggressive stance that made these cars so desirable. The car has been dry-stored for several years and recently recommissioned.

Recent mechanical work includes a full service, new cambelt, water pump, and clutch. The turbocharger has been rebuilt and the exhaust system renewed. A rare opportunity to acquire one of rally's most iconic road cars in excellent, usable condition. Italian registration documents present.`,
    images: [
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1200&q=80',
      'https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=80',
    ],
  },
  {
    make: 'Mercedes-Benz',
    model: '300TD (S124)',
    description: `This Mercedes-Benz 300TD represents the pinnacle of German estate car engineering from the golden era. The turbodiesel inline-six engine is renowned for reliability, with many examples exceeding 500,000 miles.

Finished in elegant Smoke Silver Metallic over Palomino MB-Tex interior, this W124 estate shows the quality construction that Mercedes was famous for. Third-row rear-facing seats make this a true seven-seater.

The car benefits from a recent full service including new glow plugs, injectors overhauled, and a complete brake system refresh. Air conditioning converted to R134a and working well. Self-leveling rear suspension functions correctly. A practical classic that improves with every mile.`,
    images: [
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&q=80',
      'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200&q=80',
      'https://images.unsplash.com/photo-1622194993920-c329e8952bc6?w=1200&q=80',
      'https://images.unsplash.com/photo-1549927681-0b673b8243ab?w=1200&q=80',
    ],
  },
  {
    make: 'Mercedes-Benz',
    model: 'E320 Cabriolet (A124)',
    description: `This Mercedes-Benz E320 Cabriolet is one of the last hand-built convertibles from the Stuttgart manufacturer. The naturally aspirated 3.2-litre inline-six produces a refined 217bhp, perfectly suited to relaxed open-top cruising.

Presented in Brilliantsilber over Mushroom leather interior, the car features the electric fabric roof, wood trim, and heated seats. The A124 was built to the highest standards, with extensive sound deadening and a fully reinforced body structure.

Recent maintenance includes new soft top, full service, and reconditioning of the wood trim. The automatic climate control works perfectly. Original toolkit, first aid kit, and full documentation present. A sophisticated four-seat convertible that represents excellent value.`,
    images: [
      'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=1200&q=80',
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&q=80',
      'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200&q=80',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80',
    ],
  },
  {
    make: 'Mercedes-Benz',
    model: 'E420 (W210)',
    description: `This Mercedes-Benz E420 features the silky-smooth 4.2-litre V8 producing 275bhp - the ultimate engine choice for the W210 platform. The car offers effortless performance while maintaining the comfort and refinement Mercedes is known for.

Finished in Obsidian Black over grey leather interior with burled walnut trim. The car is equipped with climate control, electric memory seats, and the premium Bose sound system.

The V8 engine has been meticulously maintained with full Mercedes-Benz service history. Recent work includes new air suspension components, brake discs and pads, and a full transmission service. A powerful and comfortable cruiser that represents superb value for a V8 Mercedes.`,
    images: [
      'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200&q=80',
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&q=80',
      'https://images.unsplash.com/photo-1549927681-0b673b8243ab?w=1200&q=80',
      'https://images.unsplash.com/photo-1622194993920-c329e8952bc6?w=1200&q=80',
    ],
  },
  {
    make: 'MINI',
    model: 'Cooper S JCW',
    description: `This MINI Cooper S John Cooper Works represents the ultimate expression of the modern MINI. The 1.6-litre supercharged engine produces 210bhp in JCW specification, paired with a slick six-speed manual gearbox.

Finished in Chili Red with a white roof and mirror caps, this JCW features the Aero body kit, 17-inch JCW alloy wheels, and Recaro sport seats. The interior is trimmed with leather and Alcantara.

Recent maintenance includes new supercharger belt, fresh brake pads and discs, and a full service. The car benefits from a Milltek exhaust system and uprated intercooler. A pocket rocket that punches well above its weight, with genuine JCW provenance.`,
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=80',
      'https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200&q=80',
    ],
  },
  {
    make: 'Peugeot',
    model: '106 GTI',
    description: `This Peugeot 106 GTI is one of the most celebrated French hot hatches, offering pure driving enjoyment in a lightweight package. The 1.6-litre 16-valve engine produces 118bhp - impressive given the car weighs just 950kg.

Presented in Indigo Blue over grey cloth sport seats, this 106 GTI is a genuine UK-supplied example with full service history. The car features the distinctive GTI front spoiler, side skirts, and 14-inch Speedline alloys.

Mechanical highlights include a recent timing belt service, new clutch, and refreshed suspension with KYB dampers. The exhaust is standard and the engine bay is tidy. An increasingly rare and collectible hot hatch that rewards enthusiastic driving.`,
    images: [
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1200&q=80',
      'https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=80',
    ],
  },
  {
    make: 'Peugeot',
    model: '106 S16',
    description: `This Peugeot 106 S16 is the continental specification of the GTI, featuring the same eager 1.6-litre 16-valve engine. The S16 badge denotes 'Soupapes 16' - 16 valves - and these cars were sold throughout Europe.

Finished in Cherry Red over dark grey sport interior, this example comes from France with French registration documents. The car benefits from the standard S16 specification including sports suspension, front fog lights, and unique S16 graphics.

Recent work includes new timing belt, water pump, and a full geometry setup. The brakes have been refreshed with EBC pads and new discs. A charming and engaging driver's car that offers pure motoring pleasure. Import paperwork complete for EU registration.`,
    images: [
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=80',
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1200&q=80',
      'https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80',
    ],
  },
  {
    make: 'Peugeot',
    model: '405 MI16',
    description: `This Peugeot 405 MI16 represents the performance flagship of the 405 range. The 1.9-litre 16-valve engine produces 158bhp and was developed with input from Peugeot's motorsport division.

Presented in Graphite Grey over velour interior with supportive sports seats. The MI16 features unique front and rear bumpers, side skirts, and 15-inch alloy wheels. This example is a rare Phase 1 model with the desirable mechanical limited-slip differential.

Mechanical condition is excellent following a comprehensive overhaul including new timing belt, head gasket, and clutch. The suspension has been refreshed with new dampers and bushes. A practical and rapid family saloon with genuine motorsport heritage.`,
    images: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=80',
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1200&q=80',
      'https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200&q=80',
    ],
  },
  {
    make: 'Volkswagen',
    model: 'Golf GTI Mk2',
    description: `This Volkswagen Golf GTI Mk2 is an icon of the hot hatch genre. The 1.8-litre 8-valve engine produces 112bhp, channeled through a sweet-shifting five-speed manual gearbox to the front wheels.

Finished in Mars Red over grey tartan sport seats - the classic GTI combination. This 'small bumper' early example features steel arches, the original BBS-style alloys, and unmolested bodywork.

The car has been sympathetically maintained with a full service history folder. Recent work includes a new exhaust system, rebuilt gear linkage, and fresh timing belt. The interior is remarkably well-preserved with no rips or wear to the iconic plaid seats. A proper driver's GTI ready to enjoy.`,
    images: [
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=80',
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&q=80',
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&q=80',
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

      // Update description
      await prisma.listing.update({
        where: { id: listing.id },
        data: {
          description: update.description,
        },
      })

      // Delete existing media
      await prisma.listingMedia.deleteMany({
        where: { listingId: listing.id },
      })

      // Add new images
      for (let i = 0; i < update.images.length; i++) {
        await prisma.listingMedia.create({
          data: {
            listingId: listing.id,
            type: 'PHOTO',
            publicUrl: update.images[i],
            thumbnailUrl: update.images[i].replace('w=1200', 'w=400'),
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
