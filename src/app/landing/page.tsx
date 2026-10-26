import { LandingPageView } from '@/components/landing/landing-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WanderList · Trailhead Field Notes & Group Trip Packing',
  description:
    'Plan trips together with shared packing lists, assigned gear, and live progress. WanderList keeps every traveler in sync from the first plan to the final pack.',
  openGraph: {
    type: 'website',
    siteName: 'WanderList',
    title: 'WanderList — Make room for the good part',
    description:
      'Plan trips together with shared packing lists, assigned gear, and live progress. Keep every traveler in sync from the first plan to the final pack.',
  },
  twitter: {
    card: 'summary',
    title: 'WanderList — Make room for the good part',
    description:
      'Plan trips together with shared packing lists, assigned gear, and live progress. Keep every traveler in sync from the first plan to the final pack.',
  },
};

export default function LandingRoutePage() {
  return <LandingPageView />;
}
