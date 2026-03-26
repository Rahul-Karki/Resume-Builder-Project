import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-resume.png";

const Hero = () => {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="container mx-auto px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <span className="mb-4 inline-block rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
              Build. Impress. Get Hired.
            </span>
            <h1 className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight text-foreground md:text-7xl">
              Resumes that
              <br />
              <span className="text-accent">land interviews</span>
            </h1>
            <p className="mb-8 max-w-md text-lg text-muted-foreground">
              Craft a stunning, ATS-friendly resume in minutes — not hours.
              Choose from pro templates and let AI polish your content.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="default" size="lg" className="text-base">
                Build Your Resume <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button variant="default" size="lg" className="text-base">
                View Templates
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" /> Free to start
              </span>
              <span>No credit card needed</span>
              <span>ATS-optimized</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="flex justify-center"
          >
            <img
              src={heroImage}
              alt="Professional resume template preview"
              width={800}
              height={1000}
              className="w-full max-w-md drop-shadow-2xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
