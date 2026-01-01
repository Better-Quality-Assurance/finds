/**
 * Public API for external auction sales data
 * Returns recent sales from BaT, Catawiki, etc.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createGlobalSalesService } from '@/services/ai/global-sales.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const make = searchParams.get('make') || undefined
    const model = searchParams.get('model') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const daysBack = Math.min(parseInt(searchParams.get('days') || '30'), 90)

    const globalSalesService = createGlobalSalesService()

    const sales = await globalSalesService.getRecentSales({
      make,
      model,
      limit,
      daysBack,
    })

    // Format for public consumption
    const formattedSales = sales.map(sale => ({
      id: sale.id,
      source: sale.source,
      sourceUrl: sale.sourceUrl,
      title: sale.title,
      make: sale.make,
      model: sale.model,
      year: sale.year,
      soldPrice: Number(sale.soldPrice),
      currency: sale.currency,
      priceEur: Number(sale.priceEur),
      saleDate: sale.saleDate.toISOString().split('T')[0],
      location: sale.location,
      condition: sale.condition,
      mileage: sale.mileage,
      imageUrl: sale.imageUrl,
    }))

    return NextResponse.json({
      sales: formattedSales,
      count: formattedSales.length,
      filters: { make, model, limit, daysBack },
    })
  } catch (error) {
    console.error('Failed to fetch global sales:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales data' },
      { status: 500 }
    )
  }
}
