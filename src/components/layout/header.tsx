import { BookAudio } from 'lucide-react';

const Header = () => {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
           <BookAudio className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-headline font-bold text-foreground">Instaread</h1>
      </div>
      <p className="hidden md:block text-sm text-muted-foreground">Self-Service Demo Generator</p>
    </header>
  );
};

export default Header;
