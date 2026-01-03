import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUpIcon, ArrowDownIcon, TrendingUp, DollarSign, Package, Target } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface SalesStatisticsProps {
  data: {
    totalSales: number
    previousPeriodSales: number
    salesTrend: number
    avgPrice: number
    previousAvgPrice: number
    priceTrend: number
    totalVolume: number
    volumeTrend: number
    categoryBreakdown: Array<{
      category: string
      count: number
      avgPrice: number
      totalValue: number
    }>
    topMakesByVolume: Array<{
      make: string
      count: number
      avgPrice: number
    }>
    topMakesByPrice: Array<{
      make: string
      count: number
      avgPrice: number
    }>
    priceRangeDistribution: Array<{
      range: string
      count: number
      percentage: number
    }>
    sourceDistribution: Array<{
      source: string
      count: number
      percentage: number
    }>
  }
}

function TrendIndicator({ value, format = 'percentage' }: { value: number; format?: 'percentage' | 'number' }) {
  const isPositive = value > 0
  const isNeutral = value === 0

  if (isNeutral) {
    return (
      <span className="text-sm text-muted-foreground flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-muted-foreground" />
        No change
      </span>
    )
  }

  return (
    <span className={`text-sm font-medium flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
      {format === 'percentage' ? `${Math.abs(value).toFixed(1)}%` : Math.abs(value).toLocaleString()}
    </span>
  )
}

export function SalesStatistics({ data }: SalesStatisticsProps) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Sales</CardDescription>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalSales}</div>
            <div className="mt-1">
              <TrendIndicator value={data.salesTrend} format="number" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Average Price</CardDescription>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.avgPrice, 'EUR')}</div>
            <div className="mt-1">
              <TrendIndicator value={data.priceTrend} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Volume</CardDescription>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalVolume, 'EUR')}</div>
            <div className="mt-1">
              <TrendIndicator value={data.volumeTrend} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Top Category</CardDescription>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.categoryBreakdown[0]?.category || 'N/A'}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {data.categoryBreakdown[0]?.count || 0} sales
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown & Top Makes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.categoryBreakdown.slice(0, 6).map((cat) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{cat.category}</span>
                      <Badge variant="secondary" className="text-xs">
                        {cat.count}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avg: {formatCurrency(cat.avgPrice, 'EUR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatCurrency(cat.totalValue, 'EUR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Makes by Volume */}
        <Card>
          <CardHeader>
            <CardTitle>Most Active Brands</CardTitle>
            <CardDescription>By number of sales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topMakesByVolume.slice(0, 6).map((make, index) => (
                <div key={make.make} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-4">
                      {index + 1}.
                    </span>
                    <div>
                      <div className="font-medium">{make.make}</div>
                      <div className="text-sm text-muted-foreground">
                        Avg: {formatCurrency(make.avgPrice, 'EUR')}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">{make.count} sales</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Distribution & Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Range Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Price Distribution</CardTitle>
            <CardDescription>Percentage of sales by price range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.priceRangeDistribution.map((range) => (
                <div key={range.range}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{range.range}</span>
                    <span className="text-sm text-muted-foreground">
                      {range.count} ({range.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${range.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Source Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Source</CardTitle>
            <CardDescription>Auction platforms tracked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.sourceDistribution.map((source) => (
                <div key={source.source} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{source.source}</div>
                    <div className="text-sm text-muted-foreground">
                      {source.percentage.toFixed(1)}% of total
                    </div>
                  </div>
                  <Badge variant="secondary">{source.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Makes by Price */}
      <Card>
        <CardHeader>
          <CardTitle>Highest Value Brands</CardTitle>
          <CardDescription>Top brands by average sale price (minimum 2 sales)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.topMakesByPrice.slice(0, 8).map((make, index) => (
              <div key={make.make} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-medium">{make.make}</div>
                    <div className="text-xs text-muted-foreground">
                      {make.count} {make.count === 1 ? 'sale' : 'sales'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">
                    {formatCurrency(make.avgPrice, 'EUR')}
                  </div>
                  <div className="text-xs text-muted-foreground">avg</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info note */}
      <div className="text-sm text-muted-foreground text-center">
        Statistics are based on the last 30 days compared to the previous 30-day period.
        Data sourced from leading classic car auction platforms worldwide.
      </div>
    </div>
  )
}
