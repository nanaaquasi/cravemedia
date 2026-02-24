export const metadata = {
  title: "Privacy Policy — Craveo",
  description: "Learn how Craveo collects, uses, and protects your personal information.",
};

const lastUpdated = "February 24, 2026";

const sections = [
  {
    id: "information-we-collect",
    title: "1. Information We Collect",
    content: null,
    subsections: [
      {
        title: null,
        body: "We collect the following types of information when you use Craveo:",
      },
      {
        title: "Name & Email Address",
        body: "Provided when you sign up or sign in, including via Google OAuth.",
      },
      {
        title: "Google Account Information",
        body: "When you choose to sign in with Google, we receive your name, email address, and profile picture as permitted by Google's OAuth scopes. We do not access your Gmail, Drive, Contacts, or any other Google services.",
      },
      {
        title: "Usage & Analytics Data",
        body: "We collect information about how you interact with the app — pages visited, features used, session duration, and device/browser type — to help us improve the product.",
      },
    ],
  },
  {
    id: "how-we-use",
    title: "2. How We Use Your Information",
    content: "We use the information we collect to:",
    list: [
      "Create and manage your account.",
      "Provide and improve the features and functionality of Craveo.",
      "Communicate with you about your account or updates to the service.",
      "Analyze usage patterns to improve user experience.",
      "Ensure the security and integrity of our platform.",
    ],
    footer: "We do not sell, rent, or share your personal information with third parties for marketing purposes.",
    subsections: [],
  },
  {
    id: "google-oauth",
    title: "3. Google OAuth & Third-Party Sign-In",
    content:
      "If you sign in using Google, we receive limited profile information (name, email, and profile picture) from Google as part of the authentication process. We use this information solely to create and manage your Craveo account. We do not access your Google contacts, Gmail, Drive, or any other Google services beyond basic profile information.",
    subsections: [],
  },
  {
    id: "data-retention",
    title: "4. Data Retention",
    content:
      "We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time by contacting us.",
    subsections: [],
  },
  {
    id: "cookies",
    title: "5. Cookies & Tracking",
    content:
      "We may use cookies and similar tracking technologies to maintain your session and understand how users interact with our app. You can configure your browser to refuse cookies, though some features of Craveo may not function properly as a result.",
    subsections: [],
  },
  {
    id: "data-security",
    title: "6. Data Security",
    content:
      "We take reasonable technical and organizational measures to protect your information from unauthorized access, loss, or misuse. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.",
    subsections: [],
  },
  {
    id: "your-rights",
    title: "7. Your Rights",
    content: "You have the right to:",
    list: [
      "Access the personal data we hold about you.",
      "Request correction of inaccurate data.",
      "Request deletion of your account and data.",
      "Withdraw consent to data processing where applicable.",
    ],
    footer: "To exercise any of these rights, please contact us at support@craveo.app.",
    subsections: [],
  },
  {
    id: "childrens-privacy",
    title: "8. Children's Privacy",
    content:
      "Craveo is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately.",
    subsections: [],
  },
  {
    id: "changes",
    title: "9. Changes to This Policy",
    content:
      "We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated date. Continued use of Craveo after changes constitutes your acceptance of the revised policy.",
    subsections: [],
  },
  {
    id: "contact",
    title: "10. Contact Us",
    content: "If you have any questions or concerns about this Privacy Policy, please reach out:",
    contact: true,
    subsections: [],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-mesh text-white">
      {/* Hero */}
      <div className="pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Legal
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4 leading-tight">
            Privacy Policy
          </h1>
          <p className="text-white/40 text-sm">
            Last updated: <span className="text-white/60">{lastUpdated}</span>
          </p>
          <p className="mt-6 text-white/60 text-lg leading-relaxed">
            Welcome to Craveo. This Privacy Policy explains how we collect, use, and protect
            your personal information when you use our web application at{" "}
            <a href="https://www.craveo.app" className="text-purple-400 hover:underline">
              www.craveo.app
            </a>
            . By using Craveo, you agree to the terms described below.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        {sections.map((section) => (
          <div key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-start gap-3">
              <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              </span>
              {section.title}
            </h2>

            {section.content && (
              <p className="text-white/60 leading-relaxed mb-4">{section.content}</p>
            )}

            {section.list && (
              <ul className="space-y-2 mb-4">
                {section.list.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/60">
                    <span className="mt-2 flex-shrink-0 w-1 h-1 rounded-full bg-purple-400/60" />
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {section.footer && (
              <p className="text-white/60 leading-relaxed">{section.footer}</p>
            )}

            {section.subsections && section.subsections.length > 0 && (
              <div className="space-y-4">
                {section.subsections.map((sub, i) => (
                  <div key={i} className={sub.title ? "pl-4 border-l border-white/5" : ""}>
                    {sub.title && (
                      <p className="text-sm font-semibold text-white/80 mb-1">{sub.title}</p>
                    )}
                    <p className="text-white/60 leading-relaxed text-sm">{sub.body}</p>
                  </div>
                ))}
              </div>
            )}

            {section.contact && (
              <div className="mt-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <p className="text-white/60 text-sm">
                  📧{" "}
                  <a href="mailto:support@craveo.app" className="text-purple-400 hover:underline">
                    support@craveo.app
                  </a>
                </p>
                <p className="text-white/60 text-sm mt-1">
                  🌐{" "}
                  <a href="https://www.craveo.app" className="text-purple-400 hover:underline">
                    www.craveo.app
                  </a>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
