import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Lock,
  MessageSquare,
  Zap,
} from "lucide-react";

const capabilities = [
  {
    icon: FileText,
    title: "Draft & refine",
    description: "Turn brief notes into polished memos, letters, and filings.",
  },
  {
    icon: BookOpen,
    title: "Research faster",
    description: "Surface statutes, precedents, and context in seconds.",
  },
  {
    icon: Lock,
    title: "Built for privacy",
    description: "Your matters stay inside your secure Lawway workspace.",
  },
];

const chatPreview = [
  {
    role: "user" as const,
    text: "Summarize the key obligations in this lease agreement.",
  },
  {
    role: "assistant" as const,
    text: "Here are five critical clauses: term length, renewal notice, liability cap, indemnity scope, and dispute resolution…",
  },
];

export function AiAssistantSection() {
  return (
    <section
      id="ai-assistant"
      className="relative overflow-hidden bg-[#FCF9F6] px-6 py-24 sm:px-10 lg:px-14 lg:py-32"
      aria-labelledby="ai-assistant-heading"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-32 top-1/4 h-[420px] w-[420px] rounded-full bg-primary/[0.12] blur-[100px]" />
        <div className="absolute -right-24 bottom-0 h-[360px] w-[360px] rounded-full bg-secondary/[0.08] blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `linear-gradient(rgba(62,39,35,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(62,39,35,0.04) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-14 flex flex-col items-start gap-6 lg:mb-16 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2
              id="ai-assistant-heading"
              className="font-serif text-3xl font-semibold leading-tight tracking-tight text-secondary sm:text-4xl lg:text-[2.75rem]"
            >
              Your AI assistant for{" "}
              <span className="bg-gradient-to-r from-primary via-[#c9a227] to-[#8b6914] bg-clip-text text-transparent">
                legal work
              </span>
            </h2>
            <p className="mt-5 font-sans text-base leading-relaxed text-[#5c534c] sm:text-lg">
              Research, draft, and organize—without leaving your chamber. Lawway
              AI is built for how lawyers and clients actually work, with clarity
              and discretion at every step.
            </p>
          </div>
          <Link
            href="/signup"
            className="group inline-flex shrink-0 items-center justify-center gap-2.5 rounded-full bg-secondary px-8 py-4 font-sans text-sm font-semibold tracking-wide text-[#FCF9F6] shadow-[0_12px_40px_-12px_rgba(62,39,35,0.45)] transition hover:bg-secondary/90 hover:shadow-[0_16px_48px_-12px_rgba(62,39,35,0.5)]"
          >
            Start now
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="relative overflow-hidden rounded-3xl border border-signin-border/50 bg-signin-card-bg p-6 shadow-[0_8px_60px_-20px_rgba(0,0,0,0.35)] backdrop-blur-md lg:col-span-7 lg:p-8">
            <div
              className="absolute -right-8 -top-8 size-32 rounded-full bg-primary/20 blur-2xl"
              aria-hidden
            />
            <div className="relative flex items-center gap-3 border-b border-signin-border/45 pb-5">
              <div className="flex size-10 items-center justify-center rounded-2xl border border-signin-border/40 bg-signin-panel-bg/80">
                <MessageSquare className="size-5 text-primary" aria-hidden />
              </div>
              <div>
                <p className="font-sans text-sm font-semibold text-signin-text">
                  Lawway Assistant
                </p>
                <p className="flex items-center gap-1.5 font-sans text-xs text-signin-text-muted">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/60 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  Ready for your next matter
                </p>
              </div>
            </div>

            <div className="relative mt-6 space-y-4">
              {chatPreview.map((message) => (
                <div
                  key={message.text.slice(0, 24)}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-secondary px-4 py-3 font-sans text-sm leading-relaxed text-[#FCF9F6]"
                      : "max-w-[92%] rounded-2xl rounded-bl-md border border-signin-border/45 bg-signin-panel-bg px-4 py-3 font-sans text-sm leading-relaxed text-signin-text"
                  }
                >
                  {message.text}
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-2xl border border-dashed border-signin-border/50 bg-signin-input-bg/90 px-4 py-3">
                <Zap className="size-4 shrink-0 text-primary" aria-hidden />
                <p className="font-sans text-xs text-signin-text-muted">
                  Ask anything about your case files, contracts, or research…
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-5 lg:gap-5">
            {capabilities.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group flex gap-4 rounded-2xl border border-signin-border/45 bg-signin-card-bg/90 p-5 shadow-sm backdrop-blur-sm transition hover:border-signin-border/70 hover:bg-signin-card-bg lg:p-6"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-signin-border/50 bg-signin-panel-bg/70 text-[#E9C349] transition group-hover:border-primary/35">
                  <Icon className="size-5" strokeWidth={1.5} aria-hidden />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-signin-text">
                    {title}
                  </h3>
                  <p className="mt-1.5 font-sans text-sm leading-relaxed text-signin-text-muted">
                    {description}
                  </p>
                </div>
              </div>
            ))}

            <div className="mt-auto rounded-2xl border border-signin-border/40 bg-signin-panel-bg p-6 lg:p-7">
              <p className="font-serif text-lg font-medium text-signin-text">
                From question to clarity in one thread.
              </p>
              <p className="mt-2 font-sans text-sm leading-relaxed text-signin-text-muted">
                No switching tools. No lost context. Just focused legal
                assistance when you need it.
              </p>
              <Link
                href="/signup"
                className="mt-5 inline-flex items-center gap-2 font-sans text-sm font-semibold text-primary transition hover:text-primary/80"
              >
                Start now
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
