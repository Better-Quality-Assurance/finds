import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal')
  return {
    title: t('buyerTerms'),
    description: 'Terms and responsibilities for buyers on the Finds auction platform.',
  }
}

export default function BuyerTermsPage() {
  const t = useTranslations('legal')

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t('buyerTerms')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: December 2024
      </p>

      <div className="prose prose-gray mt-8 max-w-none dark:prose-invert">
        <section className="mt-8">
          <h2>1. Bidding Eligibility</h2>
          <p>To place bids on Finds, you must:</p>
          <ul>
            <li>Have a verified email address</li>
            <li>Have a valid payment method on file</li>
            <li>Accept these terms and the general Terms of Service</li>
            <li>Be in good standing (no previous payment defaults)</li>
          </ul>
          <p>
            Finds may require additional verification for high-value
            transactions (above EUR 20,000).
          </p>
        </section>

        <section className="mt-8">
          <h2>2. Bids Are Binding</h2>
          <p className="font-semibold text-lg">
            Every bid you place is a legally binding commitment to purchase.
          </p>
          <ul>
            <li>You cannot retract a bid once placed</li>
            <li>If you are the highest bidder when the auction ends, you are obligated to complete the purchase</li>
            <li>This includes payment of the hammer price plus the 5% buyer fee</li>
          </ul>
          <p>
            Before bidding, ensure you have reviewed the listing thoroughly,
            including all photos, description, and seller disclosures.
          </p>
        </section>

        <section className="mt-8">
          <h2>3. Buyer Fee</h2>
          <p>
            The winning bidder pays a <strong>5% buyer fee</strong> on the final
            hammer price. This fee is charged by Finds for platform services.
          </p>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Hammer Price</th>
                <th className="text-left">Buyer Fee (5%)</th>
                <th className="text-left">Total Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>EUR 5,000</td>
                <td>EUR 250</td>
                <td>EUR 5,250</td>
              </tr>
              <tr>
                <td>EUR 15,000</td>
                <td>EUR 750</td>
                <td>EUR 15,750</td>
              </tr>
              <tr>
                <td>EUR 40,000</td>
                <td>EUR 2,000</td>
                <td>EUR 42,000</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-8">
          <h2>4. Bid Deposits</h2>
          <p>
            When you place your first bid on an auction, a temporary card hold
            is placed:
          </p>
          <ul>
            <li>
              <strong>Minimum hold:</strong> EUR 500
            </li>
            <li>
              <strong>Alternative:</strong> 5% of your bid amount, if higher
            </li>
            <li>
              <strong>Maximum hold:</strong> EUR 2,500
            </li>
          </ul>
          <p>This hold serves as a bid deposit:</p>
          <ul>
            <li>
              <strong>If outbid:</strong> Released automatically within 24-48
              hours
            </li>
            <li>
              <strong>If you win:</strong> Applied toward your total payment
            </li>
            <li>
              <strong>If you fail to pay:</strong> May be forfeited as a penalty
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h2>5. Payment Requirements</h2>
          <h3>Deadline</h3>
          <p>
            Payment must be completed within{' '}
            <strong>5 business days</strong> of the auction ending.
          </p>

          <h3>Payment Methods</h3>
          <p>Accepted payment methods:</p>
          <ul>
            <li>Credit/debit card (Visa, Mastercard)</li>
            <li>Bank transfer (SEPA within EU)</li>
          </ul>

          <h3>What You Pay</h3>
          <ul>
            <li>Hammer price (your winning bid)</li>
            <li>Buyer fee (5% of hammer price)</li>
          </ul>
          <p>
            Transport, registration, insurance, and any other costs are
            separate and your responsibility.
          </p>
        </section>

        <section className="mt-8">
          <h2>6. Non-Payment Consequences</h2>
          <p>If you fail to complete payment:</p>
          <ol>
            <li>
              <strong>Day 1-3:</strong> Reminder emails sent
            </li>
            <li>
              <strong>Day 4:</strong> Final warning
            </li>
            <li>
              <strong>Day 6+:</strong>
              <ul>
                <li>Bid deposit is forfeited (up to EUR 2,500)</li>
                <li>Bidding privileges suspended</li>
                <li>Vehicle may be offered to the next highest bidder</li>
                <li>Vehicle may be relisted</li>
              </ul>
            </li>
          </ol>
          <p>
            Repeat non-payers will be permanently banned from the platform.
          </p>
        </section>

        <section className="mt-8">
          <h2>7. Transport and Collection</h2>
          <p>
            <strong>You are responsible for arranging transport.</strong>
          </p>
          <p>Important considerations:</p>
          <ul>
            <li>
              Many vehicles on Finds are non-running, barn finds, or project
              cars
            </li>
            <li>Flatbed/trailer transport is often required</li>
            <li>
              Coordinate collection timing with the seller within 14 days of
              payment
            </li>
            <li>
              If the vehicle is located in another country, you are responsible
              for cross-border transport
            </li>
          </ul>
          <p>
            Finds does not provide transport services or recommendations. This
            is a transaction between you and the seller.
          </p>
        </section>

        <section className="mt-8">
          <h2>8. Registration and Documentation</h2>
          <p>
            <strong>
              You are responsible for all registration and documentation.
            </strong>
          </p>
          <ul>
            <li>
              Ensure you understand the registration requirements in your
              country
            </li>
            <li>
              Some vehicles may have documentation issues (especially barn finds
              and project cars)
            </li>
            <li>
              Ask the seller about documentation status before bidding if this
              is a concern
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h2>9. Due Diligence</h2>
          <p>
            <strong>Buy what you can see and understand.</strong>
          </p>
          <ul>
            <li>Review all photos carefully</li>
            <li>Read the full description and seller disclosures</li>
            <li>
              Ask questions in the comments section before the auction ends
            </li>
            <li>
              If possible, arrange an in-person inspection before bidding
            </li>
          </ul>
          <p>
            Finds curates listings for quality but does not inspect vehicles or
            guarantee condition. All sales are &quot;as-is&quot; unless the
            seller explicitly states otherwise.
          </p>
        </section>

        <section className="mt-8">
          <h2>10. Disputes</h2>
          <p>
            If the vehicle significantly differs from the listing description,
            contact us immediately at{' '}
            <a href="mailto:disputes@finds.ro">disputes@finds.ro</a>.
          </p>
          <p>We will:</p>
          <ul>
            <li>Review the listing and seller disclosures</li>
            <li>Examine any evidence of misrepresentation</li>
            <li>Mediate between buyer and seller if necessary</li>
          </ul>
          <p>
            Finds&apos; goal is fair resolution, but we are not a warranty
            provider or arbitration service.
          </p>
        </section>

        <section className="mt-8">
          <h2>11. Contact</h2>
          <p>
            Questions about buyer terms?
            <br />
            Email: <a href="mailto:buyers@finds.ro">buyers@finds.ro</a>
          </p>
        </section>
      </div>
    </div>
  )
}
