import { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://finds.ro'
const SITE_NAME = 'Finds'

type SEOParams = {
  title: string
  description: string
  image?: string
  url?: string
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  noIndex?: boolean
}

export function generateSEO({
  title,
  description,
  image,
  url,
  type = 'website',
  publishedTime,
  modifiedTime,
  noIndex = false,
}: SEOParams): Metadata {
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL
  const imageUrl = image || `${SITE_URL}/og-image.png`

  return {
    title,
    description,
    ...(noIndex && { robots: { index: false, follow: false } }),
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_EU',
      type,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: fullUrl,
      languages: {
        en: `${SITE_URL}/en${url || ''}`,
        ro: `${SITE_URL}/ro${url || ''}`,
      },
    },
  }
}

export function generateAuctionSEO({
  title,
  description,
  make,
  model,
  year,
  currentBid,
  endTime,
  image,
  slug,
}: {
  title: string
  description: string
  make: string
  model: string
  year: number
  currentBid?: number
  endTime?: Date
  image?: string
  slug: string
}): Metadata {
  const auctionTitle = `${year} ${make} ${model} - ${title}`
  const priceText = currentBid ? ` | Current bid: €${currentBid.toLocaleString()}` : ''
  const endText = endTime ? ` | Ends: ${endTime.toLocaleDateString()}` : ''
  const fullDescription = `${description.slice(0, 150)}...${priceText}${endText}`

  return generateSEO({
    title: auctionTitle,
    description: fullDescription,
    image,
    url: `/auctions/${slug}`,
    type: 'article',
  })
}

export function generateListingSEO({
  title,
  description,
  make,
  model,
  year,
  image,
  slug,
}: {
  title: string
  description: string
  make: string
  model: string
  year: number
  image?: string
  slug: string
}): Metadata {
  const listingTitle = `${year} ${make} ${model} - ${title}`
  const fullDescription = description.slice(0, 155)

  return generateSEO({
    title: listingTitle,
    description: fullDescription,
    image,
    url: `/listings/${slug}`,
    type: 'article',
  })
}

export const structuredData = {
  organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@finds.ro',
    },
  },

  website: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/auctions?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  },

  generateAuction: (auction: {
    id: string
    title: string
    description: string
    make: string
    model: string
    year: number
    currentBid?: number
    startTime: Date
    endTime: Date
    image?: string
    seller: { name: string }
  }) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${auction.year} ${auction.make} ${auction.model}`,
    description: auction.description,
    image: auction.image,
    brand: {
      '@type': 'Brand',
      name: auction.make,
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: auction.currentBid || 0,
      offerCount: 1,
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Person',
        name: auction.seller.name,
      },
    },
    vehicleIdentificationNumber: '',
    modelDate: auction.year.toString(),
  }),
}
