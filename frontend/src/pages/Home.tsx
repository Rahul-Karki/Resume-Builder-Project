// ─── LandingPage.tsx ──────────────────────────────────────────────────────────
// Root page — imports and sequences all landing sections.
// Fonts loaded here once. Global resets applied here.
//
// Section order:
//   Navbar → Hero → Features → Templates → HowItWorks → CTA → Footer

import { Navbar }           from "@/components/landing/Navbar";
import { HeroSection }      from "@/components/landing/Hero";
import { FeaturesSection }  from "@/components/landing/Features";
import { TemplatesPreview } from "@/components/landing/TemplatePreview";
import { HowItWorks }       from "@/components/landing/HowItWorks";
import { CTASection }       from "@/components/landing/CTA";
import { Footer }           from "@/components/landing/Footer";

// ─── Landing page layout ───────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <TemplatesPreview />
        <HowItWorks />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}