import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function AuctionDetailLoading() {
  return (
    <div className="container py-8">
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content - Image gallery */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main image */}
          <Skeleton className="aspect-[16/10] w-full rounded-lg" />

          {/* Thumbnails */}
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-20 flex-shrink-0 rounded" />
            ))}
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>

          {/* Vehicle specs */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Bid panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-2">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current bid */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>

              {/* Time remaining */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-full" />
              </div>

              {/* Bid input */}
              <Skeleton className="h-12 w-full" />

              {/* Bid button */}
              <Skeleton className="h-12 w-full" />

              {/* Bid count */}
              <Skeleton className="h-4 w-24 mx-auto" />
            </CardContent>
          </Card>

          {/* Seller info */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
