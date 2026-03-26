import { motion } from "framer-motion";

const steps = [
  { number: "01", title: "Pick a template", description: "Choose from our curated collection of modern, professional layouts." },
  { number: "02", title: "Add your details", description: "Fill in your experience, skills, and education — or import from LinkedIn." },
  { number: "03", title: "Polish with AI", description: "Let our AI enhance your bullet points and tailor content to any job." },
  { number: "04", title: "Download & apply", description: "Export as PDF and start landing interviews today." },
];

const HowItWorks = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
            How it works
          </h2>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground">
            Four simple steps to your dream resume.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="relative"
            >
              <span className="text-6xl font-bold text-accent/15">{step.number}</span>
              <h3 className="-mt-2 mb-2 text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
