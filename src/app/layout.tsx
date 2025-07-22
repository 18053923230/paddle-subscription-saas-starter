import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import '../styles/layout.css';
import { createClient } from '@/utils/supabase/server';
import { getSiteConfig } from '@/utils/supabase/site-config';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = getSiteConfig();

  return {
    title: siteConfig.siteTitle,
    description: siteConfig.siteDescription,
    icons: {
      icon: siteConfig.favicon,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log(user);

  return (
    <html lang="en" className={'min-h-full dark'}>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
