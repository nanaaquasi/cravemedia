export const metadata = {
  title: "Terms of Service — Craveo",
  description: "Read the Terms of Service for using Craveo.",
};

const lastUpdated = "February 24, 2026";

const sections = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    content:
      "By creating an account or using Craveo in any way, you confirm that you are at least 13 years of age, have read and understood these Terms, and agree to be bound by them.",
    subsections: [],
  },
  {
    id: "use-of-service",
    title: "2. Use of the Service",
    content:
      "Craveo grants you a limited, non-exclusive, non-transferable, revocable license to use the service for your personal or business purposes in accordance with these Terms.",
    list: [
      "Use the service for any unlawful purpose or in violation of any applicable regulations.",
      "Attempt to gain unauthorized access to any part of the service or its related systems.",
      "Reverse engineer, decompile, or disassemble any part of the service.",
      "Upload or transmit any harmful, offensive, or malicious content.",
      "Impersonate any person or entity or misrepresent your affiliation with any person or entity.",
    ],
    listLabel: "You agree not to:",
    subsections: [],
  },
  {
    id: "accounts",
    title: "3. Accounts",
    content:
      "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.",
    footer:
      "We reserve the right to suspend or terminate accounts that violate these Terms or engage in behavior that is harmful to Craveo or its users.",
    subsections: [],
  },
  {
    id: "intellectual-property",
    title: "4. Intellectual Property",
    content:
      "All content, features, and functionality of Craveo — including but not limited to text, graphics, logos, and software — are the exclusive property of Craveo and are protected by applicable intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express written permission.",
    subsections: [],
  },
  {
    id: "user-content",
    title: "5. User Content",
    content:
      "By submitting or posting any content through Craveo, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute that content solely for the purpose of operating and improving the service. You retain ownership of your content.",
    subsections: [],
  },
  {
    id: "disclaimer",
    title: "6. Disclaimer of Warranties",
    content:
      'Craveo is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. We do not warrant that the service will be uninterrupted, error-free, or free of viruses or other harmful components.',
    subsections: [],
  },
  {
    id: "liability",
    title: "7. Limitation of Liability",
    content:
      "To the fullest extent permitted by law, Craveo and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the service, even if we have been advised of the possibility of such damages.",
    subsections: [],
  },
  {
    id: "termination",
    title: "8. Termination",
    content:
      "We reserve the right to terminate or suspend your access to Craveo at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.",
    subsections: [],
  },
  {
    id: "changes",
    title: "9. Changes to These Terms",
    content:
      "We may update these Terms from time to time. We will notify you of material changes by posting the revised Terms on this page with an updated date. Your continued use of the service after such changes constitutes your acceptance.",
    subsections: [],
  },
  {
    id: "governing-law",
    title: "10. Governing Law",
    content:
      "These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these Terms or your use of the service shall be resolved through good-faith negotiation, and if necessary, through binding arbitration or courts of competent jurisdiction.",
    subsections: [],
  },
  {
    id: "contact",
    title: "11. Contact Us",
    content: "If you have any questions about these Terms, please contact us:",
    contact: true,
    subsections: [],
  },
];

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-white/40 text-sm">
            Last updated: <span className="text-white/60">{lastUpdated}</span>
          </p>
          <p className="mt-6 text-white/60 text-lg leading-relaxed">
            These Terms of Service govern your access to and use of{" "}
            <a href="https://www.craveo.app" className="text-purple-400 hover:underline">
              Craveo
            </a>
            . Please read carefully before using the service. By accessing or using Craveo,
            you agree to be bound by these Terms.
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

            {section.listLabel && (
              <p className="text-white/60 leading-relaxed mb-3">{section.listLabel}</p>
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

            {section.content && (
              <p className="text-white/60 leading-relaxed mb-4">{section.content}</p>
            )}

            {section.footer && (
              <p className="text-white/60 leading-relaxed">{section.footer}</p>
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
