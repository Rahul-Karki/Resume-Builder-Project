import { motion } from "framer-motion";
import { FileText, Sparkles, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Pro Templates",
    description: "Dozens of beautifully designed, recruiter-approved templates ready to customize.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Writing",
    description: "Let AI suggest impactful bullet points and optimize your content for each role.",
  },
  {
    icon: Shield,
    title: "ATS-Friendly",
    description: "Every template is tested against major applicant tracking systems.",
  },
  {
    icon: Zap,
    title: "Ready in Minutes",
    description: "Import your LinkedIn or paste your info — get a polished resume fast.",
  },
];

const Features = () => {
  return (
    <section className="bg-card py-24">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
            Everything you need to stand out
          </h2>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground">
            From smart templates to AI writing — we've got every step covered.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group rounded-2xl border border-border bg-background p-8 transition-shadow hover:shadow-xl"
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
