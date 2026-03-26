import { FileText } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <a href="/" className="flex items-center gap-2 text-lg font-bold text-foreground">
          <FileText className="h-5 w-5 text-accent" />
          ResuCraft
        </a>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#" className="hover:text-foreground">Contact</a>
        </div>
        <p className="text-sm text-muted-foreground">© 2026 ResuCraft. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
