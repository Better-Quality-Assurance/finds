import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal')
  return {
    title: t('sellerTerms'),
    description: 'Terms and responsibilities for sellers on the Finds auction platform.',
  }
}

export default function SellerTermsPage() {
  const t = useTranslations('legal')

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t('sellerTerms')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: December 2024
      </p>

      <div className="prose prose-gray mt-8 max-w-none dark:prose-invert">
        <section className="mt-8">
          <h2>1. Listing Submission and Approval</h2>
          <p>
            <strong>All listings must be approved before they go live.</strong>
          </p>
          <p>Finds is a curated platform. We review every submission to ensure:</p>
          <ul>
            <li>The vehicle fits our categories (classic, retro, barn find, project)</li>
            <li>The listing meets our quality standards</li>
            <li>Photos and description are adequate</li>
          </ul>
          <p>Possible outcomes:</p>
          <ul>
            <li><strong>Accepted:</strong> Your listing will be scheduled for auction</li>
            <li><strong>Changes requested:</strong> We may ask for more photos or details</li>
            <li><strong>Rejected:</strong> We may decline without providing a reason</li>
          </ul>
          <p>
            This curation process protects buyers and maintains platform quality.
            It also benefits sellers by ensuring serious, qualified buyers.
          </p>
        </section>

        <section className="mt-8">
          <h2>2. Photo Requirements</h2>
          <p>
            <strong>Minimum 40 photos required.</strong>
          </p>
          <p>Required angles:</p>
          <ul>
            <li>Exterior: all four sides, front, rear, detail shots</li>
            <li>Interior: dashboard, seats, door panels, floor</li>
            <li>Engine bay</li>
            <li>Underbody (if possible)</li>
            <li>VIN plate</li>
            <li>Trunk/boot</li>
            <li>Wheels and tires (close-up of each)</li>
            <li>Any defects, damage, or rust (mandatory)</li>
          </ul>
          <p>Photo rules:</p>
          <ul>
            <li>Photos must be your own, taken of the actual vehicle</li>
            <li>No watermarks, dealer banners, or overlays</li>
            <li>Accepted formats: JPG, PNG, HEIC</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2>3. Honest Disclosure</h2>
          <p className="font-semibold text-lg">
            You must disclose all known issues honestly.
          </p>
          <p>This includes:</p>
          <ul>
            <li>Whether the vehicle runs or not</li>
            <li>Known mechanical issues</li>
            <li>Rust, body damage, or accident history</li>
            <li>Missing parts or documentation</li>
            <li>Any modifications</li>
            <li>Registration or title issues</li>
          </ul>
          <p>
            Buyers on Finds understand they are purchasing project cars and
            vehicles that may need work. Honest disclosure builds trust and
            avoids disputes.
          </p>
          <p className="font-semibold">
            Deliberate misrepresentation will result in listing removal and
            possible account suspension.
          </p>
        </section>

        <section className="mt-8">
          <h2>4. Responding to Questions</h2>
          <p>
            <strong>You must respond to buyer questions promptly.</strong>
          </p>
          <ul>
            <li>Questions appear in the comments section of your listing</li>
            <li>You will be notified via email when a question is posted</li>
            <li>Aim to respond within 24 hours</li>
            <li>Be factual and complete in your answers</li>
          </ul>
          <p>
            Unanswered questions may reduce bidder confidence and lower your
            final price.
          </p>
        </section>

        <section className="mt-8">
          <h2>5. Fees</h2>
          <p className="font-semibold">
            There is no seller commission on Finds.
          </p>
          <p>
            Sellers list and sell vehicles at no cost. The 5% buyer fee is paid
            by the buyer, not the seller.
          </p>
          <p>
            Note: In future versions of Finds, we may introduce optional premium
            placement or promotional services.
          </p>
        </section>

        <section className="mt-8">
          <h2>6. Auction Commitment</h2>
          <p>
            Once your listing is approved and the auction begins:
          </p>
          <ul>
            <li>You are committed to selling if the reserve is met (or if there is no reserve)</li>
            <li>You cannot withdraw the vehicle during an active auction</li>
            <li>You must honor the sale to the winning bidder</li>
          </ul>
          <p>
            If exceptional circumstances arise (vehicle damaged, sold elsewhere
            by mistake), contact us immediately at{' '}
            <a href="mailto:sellers@finds.ro">sellers@finds.ro</a>.
          </p>
        </section>

        <section className="mt-8">
          <h2>7. After the Auction</h2>

          <h3>If the Reserve is Met or No Reserve</h3>
          <p>
            You are obligated to sell to the winning bidder. After the buyer
            completes payment:
          </p>
          <ul>
            <li>You will receive the buyer&apos;s contact details</li>
            <li>Coordinate handover within 14 days</li>
            <li>Prepare all documentation (title, keys, service history)</li>
            <li>Funds will be released to you after successful handover</li>
          </ul>

          <h3>If the Reserve is Not Met</h3>
          <p>
            The vehicle does not sell. You may:
          </p>
          <ul>
            <li>Relist with a lower reserve or no reserve</li>
            <li>Contact the highest bidder to negotiate</li>
            <li>Withdraw the listing</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2>8. Handover Responsibilities</h2>
          <p>You are responsible for:</p>
          <ul>
            <li>Making the vehicle available for collection</li>
            <li>Providing a safe and accessible location for pickup</li>
            <li>Handing over all keys, documentation, and accessories included in the listing</li>
            <li>Signing any transfer documents required</li>
          </ul>
          <p>You are not responsible for:</p>
          <ul>
            <li>Transport (unless specifically agreed)</li>
            <li>Registration in the buyer&apos;s country</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2>9. Misrepresentation</h2>
          <p>
            If a buyer reports material misrepresentation in your listing:
          </p>
          <ul>
            <li>We will review the listing and any evidence</li>
            <li>You may be asked to provide clarification</li>
            <li>
              If misrepresentation is confirmed:
              <ul>
                <li>The sale may be cancelled</li>
                <li>You may be required to refund the buyer</li>
                <li>Your account may be suspended or banned</li>
              </ul>
            </li>
          </ul>
          <p>
            Honest sellers have nothing to worry about. Document everything, be
            transparent, and you will be protected.
          </p>
        </section>

        <section className="mt-8">
          <h2>10. Prohibited Items</h2>
          <p>You may not list:</p>
          <ul>
            <li>Stolen vehicles</li>
            <li>Vehicles with outstanding finance that cannot be cleared</li>
            <li>Vehicles you do not own or have authority to sell</li>
            <li>Mass-market daily drivers (not suitable for Finds)</li>
            <li>Items unrelated to vehicles or automotive memorabilia</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2>11. Contact</h2>
          <p>
            Questions about seller terms?
            <br />
            Email: <a href="mailto:sellers@finds.ro">sellers@finds.ro</a>
          </p>
        </section>
      </div>
    </div>
  )
}
