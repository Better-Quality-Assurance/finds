import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal')
  return {
    title: t('privacy'),
    description: 'How Finds collects, uses, and protects your personal data.',
  }
}

export default function PrivacyPolicyPage() {
  const t = useTranslations('legal')

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t('privacy')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: December 2024
      </p>

      <div className="prose prose-gray mt-8 max-w-none dark:prose-invert">
        <section className="mt-8">
          <h2>1. Who We Are</h2>
          <p>
            Finds (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates
            finds.ro, an online auction platform for classic and collector
            vehicles. We are based in Romania and serve users across the
            European Union.
          </p>
          <p>
            For questions about this policy or your data, contact us at:{' '}
            <a href="mailto:privacy@finds.ro">privacy@finds.ro</a>
          </p>
        </section>

        <section className="mt-8">
          <h2>2. What Data We Collect</h2>
          <h3>Account Information</h3>
          <ul>
            <li>Email address (required for registration)</li>
            <li>Name (optional, but required for bidding)</li>
            <li>Phone number (optional, for transaction notifications)</li>
            <li>Password (stored as a secure hash, never in plain text)</li>
          </ul>

          <h3>Transaction Data</h3>
          <ul>
            <li>Bid history and auction participation</li>
            <li>Listings submitted for auction</li>
            <li>Payment method details (stored by our payment processor)</li>
            <li>Transaction records and invoices</li>
          </ul>

          <h3>Technical Data</h3>
          <ul>
            <li>IP address (for security and fraud prevention)</li>
            <li>Browser type and device information</li>
            <li>Pages visited and actions taken on the platform</li>
            <li>Cookies and similar technologies (see Cookie Policy)</li>
          </ul>

          <h3>Communication Data</h3>
          <ul>
            <li>Questions and comments on listings</li>
            <li>Support requests and correspondence</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2>3. Why We Collect Your Data</h2>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Purpose</th>
                <th className="text-left">Legal Basis (GDPR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Provide the auction platform</td>
                <td>Contract performance</td>
              </tr>
              <tr>
                <td>Process transactions and payments</td>
                <td>Contract performance</td>
              </tr>
              <tr>
                <td>Verify user identity for bidding</td>
                <td>Contract performance, Legitimate interest</td>
              </tr>
              <tr>
                <td>Prevent fraud and abuse</td>
                <td>Legitimate interest</td>
              </tr>
              <tr>
                <td>Send auction updates and notifications</td>
                <td>Contract performance</td>
              </tr>
              <tr>
                <td>Marketing communications</td>
                <td>Consent (opt-in only)</td>
              </tr>
              <tr>
                <td>Improve the platform</td>
                <td>Legitimate interest</td>
              </tr>
              <tr>
                <td>Legal compliance</td>
                <td>Legal obligation</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-8">
          <h2>4. How Long We Keep Your Data</h2>
          <ul>
            <li>
              <strong>Account data:</strong> Retained while your account is
              active, deleted within 30 days of account deletion request
            </li>
            <li>
              <strong>Transaction records:</strong> Retained for 7 years for tax
              and legal compliance
            </li>
            <li>
              <strong>Security logs:</strong> Retained for 12 months
            </li>
            <li>
              <strong>Marketing consent:</strong> Retained until you withdraw
              consent
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h2>5. Who We Share Data With</h2>
          <h3>Payment Processor</h3>
          <p>
            We use Stripe to process payments. Stripe handles your payment card
            details directly and is PCI-DSS compliant. We do not store your full
            card number.
          </p>

          <h3>Other Users</h3>
          <p>
            Sellers see bidder usernames (not full names or emails) until an
            auction ends. After a successful auction, buyer and seller contact
            details are shared to complete the transaction.
          </p>

          <h3>Service Providers</h3>
          <ul>
            <li>Cloud hosting (Railway, Cloudflare)</li>
            <li>Email delivery (Resend)</li>
            <li>Real-time notifications (Pusher)</li>
          </ul>

          <h3>Legal Requirements</h3>
          <p>
            We may disclose data if required by law or to protect our rights and
            the safety of users.
          </p>

          <p className="font-semibold">
            We do not sell your personal data. We do not share data with
            advertisers or data brokers.
          </p>
        </section>

        <section className="mt-8">
          <h2>6. Your Rights Under GDPR</h2>
          <p>As an EU resident, you have the following rights:</p>
          <ul>
            <li>
              <strong>Access:</strong> Request a copy of your personal data
            </li>
            <li>
              <strong>Rectification:</strong> Correct inaccurate data
            </li>
            <li>
              <strong>Erasure:</strong> Request deletion of your data (&quot;right to
              be forgotten&quot;)
            </li>
            <li>
              <strong>Portability:</strong> Receive your data in a machine-readable
              format
            </li>
            <li>
              <strong>Restriction:</strong> Limit how we process your data
            </li>
            <li>
              <strong>Objection:</strong> Object to processing based on legitimate
              interests
            </li>
            <li>
              <strong>Withdraw consent:</strong> Revoke any consent you have given
            </li>
          </ul>
          <p>
            To exercise these rights, email{' '}
            <a href="mailto:privacy@finds.ro">privacy@finds.ro</a> or use the
            data export/deletion tools in your account settings.
          </p>
          <p>
            You also have the right to lodge a complaint with your national data
            protection authority.
          </p>
        </section>

        <section className="mt-8">
          <h2>7. Data Security</h2>
          <ul>
            <li>All data is encrypted in transit (HTTPS/TLS)</li>
            <li>Passwords are hashed using bcrypt</li>
            <li>Database access is restricted and monitored</li>
            <li>Regular security audits are conducted</li>
            <li>Two-factor authentication is available for accounts</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2>8. International Transfers</h2>
          <p>
            Your data is primarily stored within the European Union. If data is
            transferred outside the EU (for example, to service providers), we
            ensure appropriate safeguards are in place, such as Standard
            Contractual Clauses approved by the European Commission.
          </p>
        </section>

        <section className="mt-8">
          <h2>9. Children</h2>
          <p>
            Finds is not intended for users under 18 years of age. We do not
            knowingly collect data from minors.
          </p>
        </section>

        <section className="mt-8">
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Significant changes
            will be communicated via email or a notice on the platform. The
            &quot;Last updated&quot; date at the top indicates when this policy was last
            revised.
          </p>
        </section>

        <section className="mt-8">
          <h2>11. Contact</h2>
          <p>
            For privacy-related inquiries:
            <br />
            Email: <a href="mailto:privacy@finds.ro">privacy@finds.ro</a>
          </p>
        </section>
      </div>
    </div>
  )
}
