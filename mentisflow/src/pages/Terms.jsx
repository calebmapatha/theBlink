import { HeartHandshake } from 'lucide-react'

const LAST_UPDATED = '7 July 2026'
const CONTACT_EMAIL = 'calebmapatha@gmail.com'

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">{title}</h2>
      <div className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export function Terms() {
  const privacyHref = `${import.meta.env.BASE_URL}privacy`
  return (
    <div className="h-[100dvh] overflow-y-auto bg-surface-50 dark:bg-surface-950 text-ink-900 dark:text-ink-100">
      <div className="max-w-2xl mx-auto px-5 py-10 space-y-8">
        <header className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8  bg-primary-500 flex items-center justify-center">
              <HeartHandshake size={16} className="text-white" />
            </div>
            <span className="font-semibold">MentisFlow</span>
          </div>
          <h1 className="text-2xl font-bold">Terms of Service</h1>
          <p className="text-xs text-ink-400">Last updated: {LAST_UPDATED}</p>
        </header>

        <p className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
          These terms govern your use of MentisFlow, a platform that connects people seeking
          mental health support with HPCSA-registered psychiatrists and psychologists in South
          Africa. By creating an account or using the service you agree to these terms.
        </p>

        <Section title="1. What MentisFlow is (and is not)">
          <p>
            MentisFlow is a technology platform. We provide tools for finding and booking
            practitioners, for tracking your own wellbeing, and for sharing information you
            choose to share. <strong>We are not a healthcare provider and do not give medical
            advice.</strong> Practitioners listed on the platform are independent professionals
            responsible for their own services, and a listing does not constitute an
            endorsement by MentisFlow.
          </p>
          <p className="font-semibold">
            MentisFlow is not an emergency service. If you or someone else is in immediate
            danger, contact emergency services (112 from a mobile phone) or the SADAG Suicide
            Crisis Helpline on 0800 567 567.
          </p>
        </Section>

        <Section title="2. Accounts">
          <p>
            You must provide accurate information and keep your login credentials secure. You
            are responsible for activity on your account. You may close your account at any
            time; see our <a href={privacyHref} className="text-primary-500 underline">Privacy Policy</a>{' '}
            for how your data is handled and deleted.
          </p>
        </Section>

        <Section title="3. For patients">
          <ul className="list-disc pl-5 space-y-1">
            <li>Using MentisFlow as a patient is free.</li>
            <li>Booking requests are confirmed or declined by the practitioner.</li>
            <li>
              Session fees are set by, and paid directly to, the practitioner. MentisFlow does
              not process or hold session payments and is not a party to the treatment
              relationship.
            </li>
            <li>
              Sharing your wellbeing data with a practitioner is always optional and happens
              only with your explicit consent at the time of booking.
            </li>
            <li>Cancellations and rescheduling are arranged between you and the practitioner.</li>
          </ul>
        </Section>

        <Section title="4. For practitioners">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              You must hold a valid, current HPCSA registration appropriate to the services you
              offer, and your listing information must be accurate and kept up to date.
            </li>
            <li>
              Listings are subject to review and approval, and may be suspended or removed for
              inaccurate information, complaints, or breach of these terms.
            </li>
            <li>
              Listing is a paid subscription, billed monthly, starting with a free trial for
              new practices. MentisFlow charges no commission on session fees.
            </li>
            <li>
              You remain solely responsible for your professional conduct, clinical decisions,
              record keeping, and compliance with the rules of your profession.
            </li>
            <li>You may cancel your subscription at any time; your listing is hidden when it lapses.</li>
          </ul>
        </Section>

        <Section title="5. Acceptable use">
          <p>
            You may not use MentisFlow to harass or harm others, impersonate any person,
            misrepresent professional credentials, access data that is not yours, probe or
            disrupt the service, or break any law. We may suspend accounts that do.
          </p>
        </Section>

        <Section title="6. Your content">
          <p>
            You own the content you create in MentisFlow (check-ins, notes, tasks, and similar).
            You grant us only the limited licence needed to store and display it back to you,
            and to the practitioners you explicitly share it with, as described in the{' '}
            <a href={privacyHref} className="text-primary-500 underline">Privacy Policy</a>.
          </p>
        </Section>

        <Section title="7. Disclaimers and liability">
          <p>
            The service is provided "as is". To the maximum extent permitted by South African
            law, including the Consumer Protection Act where it applies, MentisFlow disclaims
            liability for the acts or omissions of practitioners and patients, for treatment
            outcomes, and for indirect or consequential loss arising from use of the platform.
            Nothing in these terms limits liability that cannot lawfully be excluded.
          </p>
        </Section>

        <Section title="8. Changes and termination">
          <p>
            We may update these terms as the service evolves; material changes will be
            communicated in-app and the date above always reflects the current version. We may
            suspend or terminate access for breach of these terms. You may stop using the
            service at any time.
          </p>
        </Section>

        <Section title="9. Governing law and contact">
          <p>
            These terms are governed by the laws of the Republic of South Africa. Questions or
            complaints: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary-500 underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <footer className="pt-6 border-t border-surface-200 dark:border-surface-800 flex items-center gap-5 text-sm">
          <a href={import.meta.env.BASE_URL} className="text-primary-500 underline">← Back to MentisFlow</a>
          <a href={privacyHref} className="text-primary-500 underline">Privacy Policy</a>
        </footer>
      </div>
    </div>
  )
}
