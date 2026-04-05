import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2 text-xl font-bold text-foreground">
          <FileText className="h-6 w-6 text-accent" />
          ResuCraft
        </a>
        <div className="hidden items-center gap-8 md:flex">
          <a href="/templates" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Templates</a>
          <a href="/resume" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Resume</a>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Log in</Button>
          <Button variant="default" size="sm" onClick={() => navigate('/signup')}>Sign up free</Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
