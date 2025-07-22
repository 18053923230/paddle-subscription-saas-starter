import { Pricing } from '@/components/home/pricing/pricing';
import { useState } from 'react';
import { LocalizationBanner } from '../header/localization-banner';

export function LandingPage() {
  const [country, setCountry] = useState('US');

  return (
    <>
      <LocalizationBanner country={country} onCountryChange={setCountry} />
      <Pricing country={country} />
    </>
  );
}
