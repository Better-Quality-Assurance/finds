import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface CategoryClassification {
  supercars: Set<string>
  sportsCars: Set<string>
  luxury: Set<string>
  americanMuscle: Set<string>
  japanese: Set<string>
}

// Classification logic for vehicle categories
const CATEGORY_MAPPING: CategoryClassification = {
  supercars: new Set([
    'ferrari', 'lamborghini', 'mclaren', 'bugatti', 'pagani', 'koenigsegg'
  ]),
  sportsCars: new Set([
    'porsche', 'lotus', 'alpine', 'tvr', 'corvette', 'mazda mx-5', 'miata'
  ]),
  luxury: new Set([
    'rolls-royce', 'bentley', 'mercedes s-class', 'mercedes-benz s', 'bmw 7', 'bmw 7-series'
  ]),
  americanMuscle: new Set([
    'mustang', 'camaro', 'challenger', 'charger', 'gto', 'pontiac gto', 'firebird', 'trans am'
  ]),
  japanese: new Set([
    'toyota', 'honda', 'nissan', 'mazda', 'subaru', 'mitsubishi', 'acura', 'lexus', 'infiniti'
  ]),
}

function classifyVehicle(make: string, model: string, year: number): string {
  const makeLower = make.toLowerCase()
  const modelLower = model.toLowerCase()
  const combined = `${makeLower} ${modelLower}`.toLowerCase()

  // Classics: Pre-1980 vehicles
  if (year < 1980) {
    return 'Classics'
  }

  // Check supercars
  if (CATEGORY_MAPPING.supercars.has(makeLower)) {
    return 'Supercars'
  }

  // Check American muscle
  if (CATEGORY_MAPPING.americanMuscle.has(modelLower) ||
      CATEGORY_MAPPING.americanMuscle.has(combined)) {
    return 'American Muscle'
  }

  // Check sports cars
  if (CATEGORY_MAPPING.sportsCars.has(makeLower) ||
      CATEGORY_MAPPING.sportsCars.has(modelLower)) {
    return 'Sports Cars'
  }

  // Check luxury
  if (CATEGORY_MAPPING.luxury.has(makeLower) ||
      CATEGORY_MAPPING.luxury.has(combined)) {
    return 'Luxury'
  }

  // Check Japanese (excluding already classified as sports cars)
  if (CATEGORY_MAPPING.japanese.has(makeLower) &&
      !CATEGORY_MAPPING.sportsCars.has(modelLower)) {
    return 'Japanese'
  }

  return 'Other'
}

function getPriceRange(priceEur: number): string {
  if (priceEur < 25000) {return 'Under €25k'}
  if (priceEur < 50000) {return '€25-50k'}
  if (priceEur < 100000) {return '€50-100k'}
  return '€100k+'
}

export async function GET() {
  try {
    // Get date ranges for comparison
    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // Fetch sales from last 60 days for trend comparison
    const allSales = await prisma.externalAuctionSale.findMany({
      where: {
        saleDate: {
          gte: previous30Days,
        },
      },
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        priceEur: true,
        source: true,
        saleDate: true,
      },
    })

    // Split into recent and previous periods
    const recentSales = allSales.filter(s => new Date(s.saleDate) >= last30Days)
    const previousSales = allSales.filter(s => new Date(s.saleDate) < last30Days)

    // Calculate price trends
    const recentAvgPrice = recentSales.length > 0
      ? recentSales.reduce((sum, s) => sum + Number(s.priceEur), 0) / recentSales.length
      : 0

    const previousAvgPrice = previousSales.length > 0
      ? previousSales.reduce((sum, s) => sum + Number(s.priceEur), 0) / previousSales.length
      : 0

    const priceTrend = previousAvgPrice > 0
      ? ((recentAvgPrice - previousAvgPrice) / previousAvgPrice) * 100
      : 0

    // Category breakdown
    const categoryBreakdown: Record<string, { count: number; totalValue: number; avgPrice: number }> = {}

    recentSales.forEach(sale => {
      const category = classifyVehicle(sale.make, sale.model, sale.year)

      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { count: 0, totalValue: 0, avgPrice: 0 }
      }

      categoryBreakdown[category].count++
      categoryBreakdown[category].totalValue += Number(sale.priceEur)
    })

    // Calculate average prices for each category
    Object.keys(categoryBreakdown).forEach(category => {
      const data = categoryBreakdown[category]
      data.avgPrice = data.count > 0 ? data.totalValue / data.count : 0
    })

    // Top makes by volume
    const makeStats: Record<string, { count: number; totalValue: number; avgPrice: number }> = {}

    recentSales.forEach(sale => {
      if (!makeStats[sale.make]) {
        makeStats[sale.make] = { count: 0, totalValue: 0, avgPrice: 0 }
      }
      makeStats[sale.make].count++
      makeStats[sale.make].totalValue += Number(sale.priceEur)
    })

    // Calculate average prices and sort by volume
    const topMakesByVolume = Object.entries(makeStats)
      .map(([make, stats]) => ({
        make,
        count: stats.count,
        avgPrice: stats.totalValue / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Top makes by average price
    const topMakesByPrice = Object.entries(makeStats)
      .filter(([, stats]) => stats.count >= 2) // Only consider makes with 2+ sales
      .map(([make, stats]) => ({
        make,
        count: stats.count,
        avgPrice: stats.totalValue / stats.count,
      }))
      .sort((a, b) => b.avgPrice - a.avgPrice)
      .slice(0, 10)

    // Price range distribution
    const priceRanges: Record<string, number> = {
      'Under €25k': 0,
      '€25-50k': 0,
      '€50-100k': 0,
      '€100k+': 0,
    }

    recentSales.forEach(sale => {
      const range = getPriceRange(Number(sale.priceEur))
      priceRanges[range]++
    })

    // Source distribution
    const sourceDistribution: Record<string, number> = {}

    recentSales.forEach(sale => {
      sourceDistribution[sale.source] = (sourceDistribution[sale.source] || 0) + 1
    })

    // Calculate total volume
    const totalVolume = recentSales.reduce((sum, s) => sum + Number(s.priceEur), 0)
    const previousVolume = previousSales.reduce((sum, s) => sum + Number(s.priceEur), 0)
    const volumeTrend = previousVolume > 0
      ? ((totalVolume - previousVolume) / previousVolume) * 100
      : 0

    return NextResponse.json({
      period: 'last30Days',
      totalSales: recentSales.length,
      previousPeriodSales: previousSales.length,
      salesTrend: recentSales.length - previousSales.length,
      avgPrice: recentAvgPrice,
      previousAvgPrice,
      priceTrend,
      totalVolume,
      volumeTrend,
      categoryBreakdown: Object.entries(categoryBreakdown)
        .map(([category, data]) => ({
          category,
          ...data,
        }))
        .sort((a, b) => b.count - a.count),
      topMakesByVolume,
      topMakesByPrice,
      priceRangeDistribution: Object.entries(priceRanges).map(([range, count]) => ({
        range,
        count,
        percentage: recentSales.length > 0 ? (count / recentSales.length) * 100 : 0,
      })),
      sourceDistribution: Object.entries(sourceDistribution)
        .map(([source, count]) => ({
          source,
          count,
          percentage: recentSales.length > 0 ? (count / recentSales.length) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count),
    })
  } catch (error) {
    console.error('Error fetching sales statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
