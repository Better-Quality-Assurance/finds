import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal')
  return {
    title: t('terms'),
    description: 'Terms and conditions for using the Finds auction platform.',
  }
}

export default function TermsOfServicePage() {
  const t = useTranslations('legal')

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t('terms')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: December 2024
      </p>

      <div className="prose prose-gray mt-8 max-w-none dark:prose-invert">
        <section className="mt-8">
          <h2>1. About Finds</h2>
          <p>
            Finds (&quot;we&quot;, &quot;us&quot;, &quot;the platform&quot;)
            operates an online auction marketplace for classic cars, retro
            vehicles, barn finds, and project cars. We facilitate transactions
            between buyers and sellers but are not a party to the sale itself.
          </p>
          <p>
            Finds is a curated platform. All listings are reviewed and approved
            before they appear on the platform. We reserve the right to reject
            any submission without providing a reason.
          </p>
        </section>

        <section className="mt-8">
          <h2>2. Eligibility</h2>
          <ul>
            <li>You must be at least 18 years old to use Finds</li>
            <li>
              You must provide accurate information when creating an account
            </li>
            <li>You are responsible for maintaining the security of your account</li>
            <li>
              Bidding requires a verified email address and a valid payment
              method
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h2>3. Auction Rules</h2>

          <h3>Auction Duration</h3>
          <p>
            Standard auctions run for 7 days. The end time is displayed on each
            listing.
          </p>

          <h3>Binding Bids</h3>
          <p className="font-semibold">
            All bids are legally binding commitments to purchase. You cannot
            retract a bid once placed.
          </p>
          <p>
            By placing a bid, you agree to pay the bid amount plus the buyer fee
            if you are the winning bidder.
          </p>

          <h3>Anti-Sniping Protection</h3>
          <p>
            If a bid is placed within the last 2 minutes of an auction, the
            auction is extended by 2 minutes. This may occur up to 10 times per
            auction.
          </p>

          <h3>Invalid Bids</h3>
          <p>We may invalidate bids that:</p>
          <ul>
            <li>Are placed with insufficient payment authorization</li>
            <li>Appear to be fraudulent or coordinated</li>
            <li>Violate these terms or our community guidelines</li>
          </ul>

          <h3>Cancelled Auctions</h3>
          <p>
            Finds may cancel an auction at any time if there is a material
            error, suspected fraud, or other valid reason. Bidders will be
            notified, and any bid deposits will be released.
          </p>
        </section>

        <section className="mt-8">
          <h2>4. Fees</h2>

          <h3>Buyer Fee</h3>
          <p>
            The winning bidder pays a <strong>5% buyer fee</strong> on top of
            the final hammer price.
          </p>
          <p>Examples:</p>
          <ul>
            <li>
              Hammer price: EUR 10,000 &rarr; Buyer fee: EUR 500 &rarr; Total:
              EUR 10,500
            </li>
            <li>
              Hammer price: EUR 50,000 &rarr; Buyer fee: EUR 2,500 &rarr; Total:
              EUR 52,500
            </li>
          </ul>

          <h3>Seller Fees</h3>
          <p>
            There is no seller commission in the current version of Finds.
            Sellers list vehicles at no cost.
          </p>

          <h3>No Hidden Fees</h3>
          <p>
            The buyer fee is the only fee charged by Finds. Transport,
            registration, and other costs are the responsibility of the buyer
            and seller.
          </p>
        </section>

        <section className="mt-8">
          <h2>5. Bid Deposits</h2>
          <p>
            When you place your first bid on an auction, a temporary hold is
            placed on your payment method.
          </p>
          <ul>
            <li>
              <strong>Hold amount:</strong> EUR 500 minimum, or 5% of your bid
              (whichever is greater), capped at EUR 2,500
            </li>
            <li>This is a hold, not a charge</li>
            <li>
              <strong>If you are outbid:</strong> The hold is released
              automatically
            </li>
            <li>
              <strong>If you win:</strong> The hold is applied toward your
              payment
            </li>
            <li>
              <strong>If you fail to pay:</strong> The deposit may be forfeited
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h2>6. Payment and Collection</h2>

          <h3>Payment Deadline</h3>
          <p>
            Winning bidders must complete payment within{' '}
            <strong>5 business days</strong> of auction end. Payment includes
            the hammer price plus the 5% buyer fee.
          </p>

          <h3>Non-Payment</h3>
          <p>If you fail to pay:</p>
          <ul>
            <li>Your bid deposit may be forfeited</li>
            <li>Your bidding privileges may be suspended or revoked</li>
            <li>The vehicle may be relisted or offered to other bidders</li>
            <li>Repeat offenders may be permanently banned</li>
          </ul>

          <h3>Collection and Transport</h3>
          <p>
            After payment, buyers are responsible for arranging transport. Many
            vehicles sold on Finds are non-running or project cars and require
            flatbed transport. Buyers should factor this into their plans.
          </p>
        </section>

        <section className="mt-8">
          <h2>7. Platform Authority</h2>
          <p>Finds reserves the right to:</p>
          <ul>
            <li>Approve or reject any listing submission</li>
            <li>Cancel any auction for valid reasons</li>
            <li>Invalidate bids or auction results</li>
            <li>Suspend or terminate user accounts</li>
            <li>Modify these terms with notice to users</li>
          </ul>
          <p>
            Finds&apos; decisions in disputes are final. We are not an
            arbitration service, but we will investigate reported issues and act
            in the interest of platform integrity.
          </p>
        </section>

        <section className="mt-8">
          <h2>8. Disclaimers</h2>
          <p>
            <strong>
              Finds is a marketplace, not a party to the sale.
            </strong>{' '}
            We do not own, inspect, or guarantee any vehicle listed on the
            platform.
          </p>
          <ul>
            <li>Sellers are responsible for the accuracy of their listings</li>
            <li>
              Buyers should conduct their own due diligence before bidding
            </li>
            <li>
              Finds does not guarantee the condition, history, or legal status
              of any vehicle
            </li>
            <li>
              All vehicles are sold &quot;as-is&quot; unless otherwise stated
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h2>9. Dispute Resolution</h2>
          <p>
            We encourage buyers and sellers to resolve disputes directly. If you
            encounter an issue, contact us at{' '}
            <a href="mailto:disputes@finds.ro">disputes@finds.ro</a>.
          </p>
          <p>
            For formal disputes, the laws of Romania apply. Any legal
            proceedings shall be conducted in Romanian courts.
          </p>
        </section>

        <section className="mt-8">
          <h2>10. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Significant changes
            will be communicated via email. Continued use of the platform after
            changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section className="mt-8">
          <h2>11. Contact</h2>
          <p>
            Questions about these terms?
            <br />
            Email: <a href="mailto:legal@finds.ro">legal@finds.ro</a>
          </p>
        </section>
      </div>
    </div>
  )
}
