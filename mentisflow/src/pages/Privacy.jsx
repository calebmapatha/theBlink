import { HeartHandshake } from 'lucide-react'

const LAST_UPDATED = '10 June 2026'
const CONTACT_EMAIL = 'calebmapatha@gmail.com'

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">{title}</h2>
      <div className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export function Privacy() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-ink-900 dark:text-ink-100">
      <div className="max-w-2xl mx-auto px-5 py-10 space-y-8">
        <header className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center">
              <HeartHandshake size={16} className="text-white" />
            </div>
            <span className="font-semibold">MentisFlow</span>
          </div>
          <h1 className="text-2xl font-bold">Privacy Policy</h1>
          <p className="text-xs text-ink-400">Last updated: {LAST_UPDATED}</p>
        </header>

        <p className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
          MentisFlow connects people with HPCSA-registered mental-health practitioners.
          We take the privacy of your health information seriously. This policy explains
          what we collect, why, who it is shared with, and your rights under South Africa's
          Protection of Personal Information Act (POPIA).
        </p>

        <Section title="1. Responsible party">
          <p>
            MentisFlow is the responsible party for the personal information processed
            through this application. For any privacy query, or to exercise your rights,
            contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-500 underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="2. Information we collect">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account details</strong> — your name and email address.</li>
            <li><strong>Wellbeing data</strong> — habits, tasks, mood and energy check-ins, focus sessions, brain-dump notes and treatment-plan entries you create in the app.</li>
            <li><strong>Health data you choose to share</strong> — when booking an appointment you may share a snapshot of the above with a specific practitioner.</li>
            <li><strong>Appointment data</strong> — bookings, status and any notes you add.</li>
          </ul>
          <p>
            Mental-health information is "special personal information" under POPIA and
            is given the highest level of protection. It is encrypted in transit and at rest.
          </p>
        </Section>

        <Section title="3. Why we process it">
          <p>
            We process your information solely to operate the service: to let you track your
            wellbeing, to connect you with practitioners, and to enable a practitioner you book
            to provide care. We do not sell your data or use it for advertising.
          </p>
        </Section>

        <Section title="4. Consent and sharing">
          <p>
            Your wellbeing data is private to you by default. It is shared with a practitioner
            <strong> only when you explicitly consent</strong> during booking, and only with the
            specific practitioner you select. We record the fact and time of your consent.
            You may withdraw consent at any time by deleting the relevant appointment or by
            contacting us.
          </p>
        </Section>

        <Section title="5. Data retention">
          <p>
            Appointment records, including any shared health snapshot, are automatically and
            permanently deleted two years after creation. You may request earlier deletion at
            any time. Wellbeing data you create remains available to you until you delete it
            or close your account.
          </p>
        </Section>

        <Section title="6. Your rights under POPIA">
          <ul className="list-disc pl-5 space-y-1">
            <li>Access the personal information we hold about you.</li>
            <li>Request correction of inaccurate information.</li>
            <li>Request deletion of your information ("right to erasure").</li>
            <li>Object to or withdraw consent for processing.</li>
            <li>Lodge a complaint with the Information Regulator of South Africa.</li>
          </ul>
          <p>
            You can clear your wellbeing data at any time from <strong>Settings → Clear data</strong>,
            and unlink or delete appointments from the <strong>Connect</strong> page.
          </p>
        </Section>

        <Section title="7. Security">
          <p>
            We use Firebase for authentication and storage. Access is restricted by
            security rules so that only you — and a practitioner you have explicitly shared
            with — can read your health information. Data is transmitted over TLS and stored
            encrypted.
          </p>
        </Section>

        <Section title="8. Changes to this policy">
          <p>
            We may update this policy as the service evolves. Material changes will be
            communicated in-app. The "last updated" date above always reflects the current version.
          </p>
        </Section>

        <footer className="pt-6 border-t border-surface-200 dark:border-surface-800">
          <a href={import.meta.env.BASE_URL} className="text-sm text-primary-500 underline">← Back to MentisFlow</a>
        </footer>
      </div>
    </div>
  )
}
