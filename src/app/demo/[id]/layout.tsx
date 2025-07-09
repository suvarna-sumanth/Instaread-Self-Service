
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AudioLeap Demo',
  description: 'Live demo preview',
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* The head of the cloned site will be injected into the body, 
            so we keep this minimal. We can add fonts or other global
            resources here if needed by the demo page itself. */}
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
