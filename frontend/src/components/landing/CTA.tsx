import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl bg-primary px-8 py-20 text-center text-primary-foreground"
        >
          <h2 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            Ready to build your resume?
          </h2>
          <p className="mx-auto mb-8 max-w-md text-lg text-primary-foreground/70">
            Join thousands of professionals who've landed their dream jobs with our builder.
          </p>
          <Button variant="default" size="lg" className="text-base">
            Get Started Free <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
