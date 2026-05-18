export type PlanAudience = "client" | "lawyer";
export type PlanTier = "starter" | "premium" | "pro";

export type Plan = {
  id: string;
  audience: PlanAudience;
  tier: PlanTier;
  name: string;
  priceMonthly: number;
  description: string;
  features: string[];
  highlighted?: boolean;
};

export const clientPlans: Plan[] = [
  {
    id: "client-starter",
    audience: "client",
    tier: "starter",
    name: "Starter",
    priceMonthly: 5000,
    description: "Individuals seeking counsel for a single matter.",
    features: [
      "5 GB secure storage",
      "1 active case",
      "20 initial requests per month",
      "Case progress tracking",
      "Encrypted document vault",
    ],
  },
  {
    id: "client-premium",
    audience: "client",
    tier: "premium",
    name: "Premium",
    priceMonthly: 15000,
    description: "Clients with multiple ongoing legal needs.",
    features: [
      "20 GB secure storage",
      "3 active cases",
      "50 initial requests per month",
      "Priority lawyer matching",
      "Alerts & hearing reminders",
    ],
    highlighted: true,
  },
  {
    id: "client-pro",
    audience: "client",
    tier: "pro",
    name: "Pro",
    priceMonthly: 25000,
    description: "High-volume personal or business legal matters.",
    features: [
      "50 GB secure storage",
      "5 active cases",
      "100 initial requests per month",
      "Dedicated case timeline",
      "Full alert & event history",
    ],
  },
];

export const lawyerPlans: Plan[] = [
  {
    id: "lawyer-starter",
    audience: "lawyer",
    tier: "starter",
    name: "Advocate",
    priceMonthly: 12000,
    description: "Solo advocates building a client base on Lawway.",
    features: [
      "15 GB secure storage",
      "5 active cases",
      "Accept up to 40 client requests / month",
      "Client request marketplace access",
      "Case stages & progress tools",
    ],
  },
  {
    id: "lawyer-premium",
    audience: "lawyer",
    tier: "premium",
    name: "Chambers",
    priceMonthly: 28000,
    description: "Growing chambers receiving steady client intake.",
    features: [
      "40 GB secure storage",
      "12 active cases",
      "Accept up to 100 client requests / month",
      "Featured lawyer profile",
      "Client alerts & event scheduling",
    ],
    highlighted: true,
  },
  {
    id: "lawyer-pro",
    audience: "lawyer",
    tier: "pro",
    name: "Firm",
    priceMonthly: 45000,
    description: "Established firms with high intake and visibility.",
    features: [
      "100 GB secure storage",
      "25 active cases",
      "Accept up to 250 client requests / month",
      "Priority listing for new requests",
      "AI-assisted drafting & research",
    ],
  },
];
