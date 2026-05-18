import Link from "next/link";
import {
  Activity,
  Bell,
  BellRing,
  FileText,
  Landmark,
  Lock,
  Scale,
  Smartphone,
  Upload,
  type LucideIcon,
} from "lucide-react";

type PlatformFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const platformFeatures: PlatformFeature[] = [
  {
    icon: FileText,
    title: "Meeting summaries",
    description: "Clear recaps of consultations and hearings, ready when you are.",
  },
  {
    icon: Landmark,
    title: "Government documents",
    description: "Official forms and filings in one organized library.",
  },
  {
    icon: Scale,
    title: "Lawyers for your cases",
    description: "Connect with qualified advocates matched to your matter.",
  },
  {
    icon: Activity,
    title: "Live case progress",
    description: "Follow milestones, filings, and status updates in real time.",
  },
  {
    icon: Bell,
    title: "Personalised alerts",
    description: "Notifications tuned to your role, cases, and priorities.",
  },
  {
    icon: BellRing,
    title: "Hearing alerts from counsel",
    description: "Timely reminders from your lawyer before court dates.",
  },
  {
    icon: Upload,
    title: "Document upload",
    description: "Share contracts, evidence, and briefs securely in one place.",
  },
  {
    icon: Lock,
    title: "Fully encrypted data",
    description: "End-to-end protection for every file and conversation.",
  },
  {
    icon: Smartphone,
    title: "Access on any device",
    description: "Your chamber in your pocket—desktop, tablet, or phone.",
  },
];

export function PlatformFeaturesSection() {
  return (
    <section
      id="platform"
      className="border-y border-signin-border/35 bg-signin-page-bg px-6 py-20 sm:px-10 lg:px-14 lg:py-28"
      aria-labelledby="platform-heading"
    >
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-2xl border border-signin-border/50 bg-signin-card-bg shadow-[0_8px_60px_-20px_rgba(0,0,0,0.4)] ring-1 ring-white/[0.06]">
          <div className="border-b border-signin-border/45 bg-signin-panel-bg/60 px-8 py-10 sm:px-10 sm:py-12 lg:px-14">
            <h2
              id="platform-heading"
              className="font-serif text-2xl font-semibold tracking-tight text-signin-text sm:text-3xl lg:text-4xl"
            >
              Everything your legal practice needs,{" "}
              <span className="text-primary">in one platform</span>
            </h2>
            <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed text-signin-text-muted sm:text-lg">
              From first consultation to final judgment—manage matters, people,
              and documents with confidence. Lawway keeps your work connected,
              informed, and secure.
            </p>
          </div>

          <ul className="grid gap-px bg-signin-border/40 sm:grid-cols-2 lg:grid-cols-3">
            {platformFeatures.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="flex gap-4 bg-signin-card-bg/95 p-6 transition-colors hover:bg-white/[0.04] sm:p-7 lg:p-8"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-signin-panel-bg/80">
                  <Icon
                    className="size-5 text-[#E9C349]"
                    strokeWidth={1.45}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-base font-semibold text-signin-text">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-signin-text-muted">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col items-start justify-between gap-4 border-t border-white/10 bg-signin-panel-bg/40 px-8 py-6 sm:flex-row sm:items-center sm:px-10 lg:px-14">
            <p className="text-sm text-signin-text-muted">
              Ready to bring your matters onto Lawway?
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-[4px] bg-primary px-6 py-2.5 font-sans text-sm font-semibold tracking-wide text-secondary transition hover:bg-primary/90"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
