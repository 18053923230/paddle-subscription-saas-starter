'use client';

import { createClient } from '@/utils/supabase/client';
import { useUserInfo } from '@/hooks/useUserInfo';
import '../../styles/home-page.css';
import Header from '@/components/home/header/header';
import { HeroSection } from '@/components/home/hero-section/hero-section';

import { HomePageBackground } from '@/components/gradients/home-page-background';
import { Footer } from '@/components/home/footer/footer';
import { Pricing } from './pricing/pricing';
import { LocalizationBanner } from './header/localization-banner';
import { useState } from 'react';
// import { LandingPage } from './landing/landing-page';

export function HomePage() {
  const supabase = createClient();
  const { user } = useUserInfo(supabase);
  const [country, setCountry] = useState('US');
  return (
    <>
      <LocalizationBanner country={country} onCountryChange={setCountry} />
      <div>
        <HomePageBackground />
        <Header user={user} />
        <HeroSection />
        <Pricing country={country} />
        {/* {user?.id ? <HeroSection /> : <LandingPage />} */}
        <Footer />
      </div>
    </>
  );
}
