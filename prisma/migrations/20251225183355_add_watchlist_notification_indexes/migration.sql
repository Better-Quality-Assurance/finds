-- CreateIndex
-- Optimize queries for notifying watchers when new bids are placed
CREATE INDEX "watchlist_auction_id_notify_on_bid_idx" ON "watchlist"("auction_id", "notify_on_bid");

-- CreateIndex
-- Optimize queries for notifying watchers when auctions end
CREATE INDEX "watchlist_auction_id_notify_on_end_idx" ON "watchlist"("auction_id", "notify_on_end");
