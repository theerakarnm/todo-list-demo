import { SiteFooter } from "../components/SiteFooter";
import { Features } from "../landing/Features";
import { Hero } from "../landing/Hero";
import { LandingNav } from "../landing/LandingNav";
import { StartCta } from "../landing/StartCta";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <LandingNav />
      <main>
        <Hero />
        <Features />
        <StartCta />
      </main>
      <SiteFooter />
    </div>
  );
}
