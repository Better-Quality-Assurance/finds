'use client'

import { useRef } from 'react'
import { BidPanel } from '@/components/auction/bid-panel'
import { StickyBidBar } from '@/components/auction/sticky-bid-bar'
import { BuyerProtection } from '@/components/auction/buyer-protection'
import { FeeBreakdown } from '@/components/auction/fee-breakdown'
import { PaymentMethods } from '@/components/auction/payment-methods'
import { useAuctionRealtime } from '@/hooks/useAuctionRealtime'
import { useParams } from 'next/navigation'
import type { Prisma } from '@prisma/client'

type AuctionDetailClientProps = {
  auction: {
    id: string
    currentBid: Prisma.Decimal | null
    bidCount: number
    currentEndTime: Date
    reserveMet: boolean
    extensionCount: number
    status: string
    buyerFeeRate: Prisma.Decimal
    listing: {
      startingPrice: Prisma.Decimal
      reservePrice: Prisma.Decimal | null
      currency: string
      sellerId: string
      locationCity: string
      locationCountry: string
    }
    bids: Array<{
      id: string
      amount: Prisma.Decimal
      createdAt: Date
      bidderNumber: number
      bidderCountry: string | null
      bidderId: string
    }>
  }
}

export function AuctionDetailClient({ auction: serverAuction }: AuctionDetailClientProps) {
  const bidPanelRef = useRef<HTMLDivElement>(null)
  const params = useParams()
  const locale = params?.locale as string || 'en'

  // Transform auction data for BidPanel
  const bidPanelAuction = {
    id: serverAuction.id,
    currentBid: serverAuction.currentBid ? Number(serverAuction.currentBid) : null,
    bidCount: serverAuction.bidCount,
    currentEndTime: serverAuction.currentEndTime.toISOString(),
    reserveMet: serverAuction.reserveMet,
    extensionCount: serverAuction.extensionCount,
    status: serverAuction.status,
    listing: {
      startingPrice: Number(serverAuction.listing.startingPrice),
      reservePrice: serverAuction.listing.reservePrice
        ? Number(serverAuction.listing.reservePrice)
        : null,
      currency: serverAuction.listing.currency,
      sellerId: serverAuction.listing.sellerId,
    },
  }

  const bidPanelBids = serverAuction.bids.map((b) => ({
    id: b.id,
    amount: Number(b.amount),
    createdAt: b.createdAt.toISOString(),
    bidderNumber: b.bidderNumber,
    bidderCountry: b.bidderCountry,
    bidder: { id: b.bidderId },
  }))

  // Real-time auction state management
  const {
    auction,
    bids,
    timeRemaining,
    isActive,
    isEndingSoon,
  } = useAuctionRealtime(bidPanelAuction, bidPanelBids, {
    showToasts: true,
  })

  // Scroll to bid panel when sticky bar is clicked
  const handlePlaceBidClick = () => {
    if (bidPanelRef.current) {
      bidPanelRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })

      // Focus on the bid input after scrolling
      setTimeout(() => {
        const bidInput = bidPanelRef.current?.querySelector('#bidAmount') as HTMLInputElement
        if (bidInput) {
          bidInput.focus()
        }
      }, 500)
    }
  }

  const buyerFeeRate = Number(serverAuction.buyerFeeRate)
  const locationCity = serverAuction.listing.locationCity
  const locationCountry = serverAuction.listing.locationCountry

  return (
    <>
      {/* Mobile Bid Panel - Shows above content on mobile */}
      <div ref={bidPanelRef} className="lg:hidden space-y-4">
        <BidPanel auction={auction} bids={bids} />
        <BuyerProtection locale={locale} />
        <FeeBreakdown
          locationCity={locationCity}
          locationCountry={locationCountry}
          buyerFeeRate={buyerFeeRate}
        />
        <PaymentMethods />
      </div>

      {/* Desktop Bid Panel - Sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-4 space-y-4">
          <BidPanel auction={auction} bids={bids} />
          <BuyerProtection locale={locale} />
          <FeeBreakdown
            locationCity={locationCity}
            locationCountry={locationCountry}
            buyerFeeRate={buyerFeeRate}
          />
          <PaymentMethods />
        </div>
      </div>

      {/* Sticky Mobile Bid Bar */}
      <StickyBidBar
        auction={auction}
        timeRemaining={timeRemaining}
        isActive={isActive}
        isEndingSoon={isEndingSoon}
        onPlaceBidClick={handlePlaceBidClick}
      />
    </>
  )
}
