import { LawwayLogo } from "@/components/lawway-logo";

function BrandDecoration() {
  return (
    <div className="mt-8 flex flex-col items-center gap-1.5">
      <span className="h-0.5 w-8 rounded-full bg-primary/80" />
      <span className="h-0.5 w-5 rounded-full bg-primary/50" />
    </div>
  );
}

type AuthBrandPanelProps = {
  description: string;
};

export function AuthBrandPanel({ description }: AuthBrandPanelProps) {
  return (
    <section className="flex min-h-[320px] flex-col items-center justify-center bg-signin-panel-bg px-8 py-12 text-center sm:px-12 lg:min-h-full lg:px-14">
      <div className="flex flex-col items-center">
        <LawwayLogo className="mb-10 h-28 w-auto sm:h-32 lg:h-36" />
        <h1 className="font-serif text-2xl font-medium tracking-tight text-primary sm:text-3xl lg:text-4xl">
          Chambers of Excellence
        </h1>
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-signin-text sm:max-w-sm sm:text-base">
          {description}
        </p>
        <BrandDecoration />
      </div>
    </section>
  );
}
