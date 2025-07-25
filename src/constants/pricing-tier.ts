export interface Tier {
  name: string;
  id: 'free' | 'starter' | 'pro';
  icon: string;
  description: string;
  features: string[];
  featured: boolean;
  priceId: Record<string, string>;
  currency?: string;
}

export const PricingTier: Tier[] = [
  {
    name: 'Free',
    id: 'free',
    icon: '/assets/icons/price-tiers/free-icon.svg',
    description: 'Get started with AI-powered design tools for free. Limited features and exports.',
    features: ['1 workspace', 'Limited collaboration', 'Export to PNG and SVG'],
    featured: false,
    priceId: { month: 'pri_01k0jeybsxvwczqa0xgkzykv4s', year: 'pri_01k0jeybsxvwczqa0xgkzykv4s' },
    currency: '£',
  },
  {
    name: 'Starter',
    id: 'starter',
    icon: '/assets/icons/price-tiers/basic-icon.svg',
    description: 'Unlock premium templates and AI suggestions for better designs.',
    features: ['Integrations', 'Unlimited workspaces', 'Advanced editing tools', 'Everything in Starter'],
    featured: true,
    priceId: { month: 'pri_01k0s9f37e94c3sebxtr2ag1n7', year: 'pri_01k0s9f37e94c3sebxtr2ag1n7' },
    currency: '£',
  },
  {
    name: 'Pro',
    id: 'pro',
    icon: '/assets/icons/price-tiers/pro-icon.svg',
    description: 'Full access to AI-powered design tools, unlimited exports and branding.',
    features: [
      'Single sign on (SSO)',
      'Advanced version control',
      'Assets library',
      'Guest accounts',
      'Everything in Pro',
    ],
    featured: false,
    priceId: { month: 'pri_01k0s9gcw716aga30hzms6jsz3', year: 'pri_01k0s9gcw716aga30hzms6jsz3' },
    currency: '£',
  },
];
