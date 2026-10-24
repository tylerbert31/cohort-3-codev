import { LandingPageView } from '@/components/landing/landing-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'cohort · Trailhead Field Notes & Group Trip Packing',
  description:
    'Coordinate group expedition gear, assign camping essentials, and eliminate forgotten equipment without spreadsheet chaos.',
};

export default function LandingRoutePage() {
  return <LandingPageView />;
}
