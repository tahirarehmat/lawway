import { cn } from "@/lib/utils";

type LawwayLogoProps = {
  className?: string;
};

export function LawwayLogo({ className }: LawwayLogoProps) {
  return (
    <svg
      width="71"
      height="69"
      viewBox="0 0 71 69"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-label="Lawway logo"
      role="img"
    >
      <path
        d="M17.1001 49.05V44.3H43.4001V49.05H17.1001ZM29.7501 39.35L16.8001 26.45L22.6501 20.55L35.6501 33.45L29.7501 39.35ZM44.5501 24.5L31.6501 11.5L37.5501 5.7L50.5001 18.6L44.5501 24.5ZM52.7001 46L25.0001 18.3L29.4001 13.85L57.1001 41.6L52.7001 46Z"
        fill="#E9C349"
      />
    </svg>
  );
}
