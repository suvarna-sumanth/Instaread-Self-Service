
import Link from 'next/link';
import { BookAudio, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
                <BookAudio className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-headline font-bold text-foreground">Instaread</h1>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <p className="hidden md:block text-sm text-muted-foreground">Self-Service Demo Generator</p>
        <Link href="/dashboard" passHref>
            <Button variant="outline" size="sm">
                <LayoutDashboard className="mr-2 h-4 w-4"/>
                Dashboard
            </Button>
        </Link>
      </div>
    </header>
  );
};

export default Header;
