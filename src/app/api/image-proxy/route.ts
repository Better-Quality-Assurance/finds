import { NextRequest, NextResponse } from 'next/server'

/**
 * Image proxy API to bypass hotlinking protection on external auction sites.
 * Usage: /api/image-proxy?url=<encoded-image-url>
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    // Validate URL is from allowed domains
    const allowedDomains = [
      'images.collectingcars.com',
      'collectingcars.com',
      'bringatrailer.com',
      'carsandbids.com',
      'catawiki.com',
      'assets.catawiki.com',
      'images.catawiki.com',
      'rmsothebys.com',
      'assets.rmsothebys.com',
      'bonhams.com',
      'cars.bonhams.com',
      'classicdriver.com',
      'images.classicdriver.com',
      'artcurial.com',
      'iconicauctioneers.com',
      'silverstoneauctions.com',
    ]

    const parsedUrl = new URL(url)
    const isAllowed = allowedDomains.some(domain =>
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
    )

    if (!isAllowed) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })
    }

    // Fetch the image with appropriate headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': parsedUrl.origin + '/',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const imageBuffer = await response.arrayBuffer()

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('[Image Proxy] Error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    )
  }
}
