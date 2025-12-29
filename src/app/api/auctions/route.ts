import { NextResponse } from 'next/server'
import { getActiveAuctions, getEndingSoonAuctions } from '@/services/auction.service'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const endingSoon = searchParams.get('ending_soon')
    if (endingSoon === 'true') {
      const limit = parseInt(searchParams.get('limit') || '6')
      const auctions = await getEndingSoonAuctions(limit)
      return NextResponse.json({ auctions })
    }

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category') || undefined
    const minPrice = searchParams.get('min_price') ? parseInt(searchParams.get('min_price')!) : undefined
    const maxPrice = searchParams.get('max_price') ? parseInt(searchParams.get('max_price')!) : undefined
    const country = searchParams.get('country') || undefined
    const searchQuery = searchParams.get('q') || undefined
    const sortBy = (searchParams.get('sort') as 'ending_soon' | 'newly_listed' | 'price_low' | 'price_high' | 'most_bids' | 'relevance') || 'ending_soon'

    const result = await getActiveAuctions({
      page,
      limit,
      category,
      minPrice,
      maxPrice,
      country,
      sortBy,
      searchQuery,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get auctions error:', error)
    return NextResponse.json(
      { error: 'Failed to get auctions' },
      { status: 500 }
    )
  }
}
