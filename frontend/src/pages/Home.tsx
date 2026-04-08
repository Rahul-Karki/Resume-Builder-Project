// ─── LandingPage.tsx ──────────────────────────────────────────────────────────
// Root page — imports and sequences all landing sections.
// Fonts loaded here once. Global resets applied here.
//
// Section order:
//   Navbar → Hero → Features → Templates → HowItWorks → CTA → Footer

import { Navbar }           from "../components/landing/Navbar";
import { HeroSection }      from "../components/landing/Hero";
import { FeaturesSection }  from "../components/landing/Features";
import { TemplatesPreview } from "../components/landing/TemplatePreview";
import { HowItWorks }       from "../components/landing/HowItWorks";
import { CTASection }       from "../components/landing/CTA";
import { Footer }           from "../components/landing/Footer";

// ─── Global CSS ───────────────────────────────────────────────────────────────
// Applied once at the root. Includes font imports, resets, and scroll behaviour.
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,300;1,9..144,500&family=Outfit:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    scroll-behavior: smooth;
    font-size: 16px;
  }

  body {
    background: #080808;
    color: #F0EFE8;
    font-family: 'Outfit', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }

  /* Hide scrollbar on horizontal scroll rows */
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  /* Thin scrollbar on the page */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #080808; }
  ::-webkit-scrollbar-thumb { background: #1E1E1E; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: #2A2A2A; }

  /* Link resets */
  a { color: inherit; }

  /* Section fade-in animation */
  @keyframes sectionReveal {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0);     }
  }

  /* Card entrance */
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0);     }
  }

  /* Pulse skeleton */
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.35; }
  }
`;

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
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