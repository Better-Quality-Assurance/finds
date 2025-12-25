import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal')
  return {
    title: t('cookies'),
    description: 'How Finds uses cookies and similar technologies.',
  }
}

export default function CookiePolicyPage() {
  const t = useTranslations('legal')

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t('cookies')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: December 2024
      </p>

      <div className="prose prose-gray mt-8 max-w-none dark:prose-invert">
        <section className="mt-8">
          <h2>1. What Are Cookies</h2>
          <p>
            Cookies are small text files stored on your device when you visit a
            website. They help the website remember your preferences and
            understand how you use the site.
          </p>
        </section>

        <section className="mt-8">
          <h2>2. Cookies We Use</h2>

          <h3>Essential Cookies (Always Active)</h3>
          <p>
            These cookies are necessary for the platform to function. You cannot
            opt out of these.
          </p>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Cookie</th>
                <th className="text-left">Purpose</th>
                <th className="text-left">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>next-auth.session-token</code>
                </td>
                <td>Maintains your login session</td>
                <td>Session / 30 days</td>
              </tr>
              <tr>
                <td>
                  <code>next-auth.csrf-token</code>
                </td>
                <td>Prevents cross-site request forgery</td>
                <td>Session</td>
              </tr>
              <tr>
                <td>
                  <code>cookie-consent</code>
                </td>
                <td>Stores your cookie preferences</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td>
                  <code>NEXT_LOCALE</code>
                </td>
                <td>Remembers your language preference</td>
                <td>1 year</td>
              </tr>
            </tbody>
          </table>

          <h3 className="mt-6">Analytics Cookies (Optional)</h3>
          <p>
            These cookies help us understand how visitors use the platform. All
            data is anonymized.
          </p>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Cookie</th>
                <th className="text-left">Purpose</th>
                <th className="text-left">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>_finds_analytics</code>
                </td>
                <td>Anonymous usage statistics</td>
                <td>1 year</td>
              </tr>
            </tbody>
          </table>
          <p className="text-sm text-muted-foreground">
            We use privacy-focused analytics that do not track individual users
            or create advertising profiles.
          </p>
        </section>

        <section className="mt-8">
          <h2>3. Third-Party Cookies</h2>

          <h3>Stripe (Payment Processing)</h3>
          <p>
            When you make a payment, Stripe may set cookies to prevent fraud and
            ensure secure transactions.
          </p>

          <h3>Pusher (Real-time Updates)</h3>
          <p>
            Our real-time auction updates use Pusher, which may set technical
            cookies for connection management.
          </p>

          <p className="font-semibold mt-4">
            We do not use advertising cookies. We do not allow third-party
            advertising networks to set cookies on our platform.
          </p>
        </section>

        <section className="mt-8">
          <h2>4. Managing Cookies</h2>

          <h3>Through Our Platform</h3>
          <p>
            Use the cookie consent banner or your account settings to manage
            your preferences. Changes take effect immediately.
          </p>

          <h3>Through Your Browser</h3>
          <p>
            You can configure your browser to block or delete cookies. Note that
            blocking essential cookies may prevent you from using parts of the
            platform.
          </p>
          <ul>
            <li>
              <a
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noopener noreferrer"
              >
                Chrome
              </a>
            </li>
            <li>
              <a
                href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                target="_blank"
                rel="noopener noreferrer"
              >
                Firefox
              </a>
            </li>
            <li>
              <a
                href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                target="_blank"
                rel="noopener noreferrer"
              >
                Safari
              </a>
            </li>
            <li>
              <a
                href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                rel="noopener noreferrer"
              >
                Edge
              </a>
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h2>5. Updates to This Policy</h2>
          <p>
            We may update this policy if we change how we use cookies. Check
            this page periodically for updates.
          </p>
        </section>

        <section className="mt-8">
          <h2>6. Contact</h2>
          <p>
            Questions about our cookie practices?
            <br />
            Email: <a href="mailto:privacy@finds.ro">privacy@finds.ro</a>
          </p>
        </section>
      </div>
    </div>
  )
}
