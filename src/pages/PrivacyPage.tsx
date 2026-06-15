export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-16">
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 py-12 text-center text-white px-4">
        <h1 className="font-display text-5xl mb-2">Privacy Policy</h1>
        <p className="font-body text-white/80 text-sm">Last updated: June 2026</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-12 space-y-10 font-body text-gray-700">

        <section>
          <h2 className="font-display text-2xl text-purple-700 mb-3">Who we are</h2>
          <p className="leading-relaxed">
            TypeStar is a free typing tutor for kids, operated by The Cloud DevOps Learning Blog
            (<a href="https://theclouddevopslearningblog.com" target="_blank" rel="noopener noreferrer"
              className="text-purple-600 hover:underline">theclouddevopslearningblog.com</a>).
            Questions? Email us at{' '}
            <a href="mailto:simon.mackinnon15@gmail.com" className="text-purple-600 hover:underline">
              simon.mackinnon15@gmail.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-purple-700 mb-3">What we collect</h2>
          <ul className="list-disc list-inside space-y-2 leading-relaxed">
            <li>
              <strong>Account information</strong> — if you create an account, we store your email
              address in AWS Cognito to authenticate you.
            </li>
            <li>
              <strong>Progress data</strong> — level completions, star ratings, and badge unlocks
              are stored in AWS DynamoDB so your progress is saved across devices.
            </li>
            <li>
              <strong>Local storage</strong> — tutorial dismissals, assessment results, and session
              preferences are saved in your browser only and never sent to our servers.
            </li>
          </ul>
          <p className="mt-3 leading-relaxed">
            We do <strong>not</strong> collect names, ages, photos, or any information beyond what
            is listed above.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-purple-700 mb-3">How we use your data</h2>
          <ul className="list-disc list-inside space-y-2 leading-relaxed">
            <li>To authenticate you when you log in.</li>
            <li>To save and restore your typing progress.</li>
            <li>To display your earned badges and level history.</li>
          </ul>
          <p className="mt-3 leading-relaxed">
            We do not use your data for advertising, analytics, or any purpose other than running
            the TypeStar app. We do not sell or share your data with third parties.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-purple-700 mb-3">Children's privacy</h2>
          <p className="leading-relaxed">
            TypeStar is designed for children and takes their privacy seriously. We collect the
            minimum data necessary. We do not display ads, run tracking scripts, or share any data
            with marketing platforms. Parents or guardians can request deletion of an account and
            all associated data at any time by emailing us.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-purple-700 mb-3">Third-party services</h2>
          <ul className="list-disc list-inside space-y-2 leading-relaxed">
            <li>
              <strong>AWS Cognito</strong> — handles account creation and login, including Google
              sign-in. Subject to{' '}
              <a href="https://aws.amazon.com/privacy/" target="_blank" rel="noopener noreferrer"
                className="text-purple-600 hover:underline">AWS's privacy policy</a>.
            </li>
            <li>
              <strong>AWS CloudFront / S3</strong> — serves the app and static assets. Standard
              server logs (IP address, timestamp) may be retained for up to 90 days.
            </li>
            <li>
              <strong>ElevenLabs</strong> — text is sent to ElevenLabs to generate voice audio for
              tutorials. No personal data is included in these requests. Subject to{' '}
              <a href="https://elevenlabs.io/privacy" target="_blank" rel="noopener noreferrer"
                className="text-purple-600 hover:underline">ElevenLabs' privacy policy</a>.
            </li>
            <li>
              <strong>Google Sign-In</strong> — if you choose to sign in with Google, Google may
              collect data per their own{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
                className="text-purple-600 hover:underline">privacy policy</a>.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-purple-700 mb-3">Data retention &amp; deletion</h2>
          <p className="leading-relaxed">
            Your account and progress data are retained for as long as your account is active. You
            may request deletion at any time by emailing{' '}
            <a href="mailto:simon.mackinnon15@gmail.com" className="text-purple-600 hover:underline">
              simon.mackinnon15@gmail.com
            </a>. We will delete your data within 30 days of a verified request.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-purple-700 mb-3">Cookies</h2>
          <p className="leading-relaxed">
            TypeStar does not use advertising or tracking cookies. Authentication tokens are stored
            in browser localStorage, not cookies.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-purple-700 mb-3">Changes to this policy</h2>
          <p className="leading-relaxed">
            If we make material changes to this policy we will update the date at the top of this
            page. Continued use of TypeStar after changes are posted constitutes acceptance of the
            updated policy.
          </p>
        </section>

      </div>
    </div>
  );
}
