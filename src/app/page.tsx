import DemoGenerator from '@/components/demo-generator';

export default function Home() {
  // Logic to use mock data is now based on the `USE_AI_ANALYSIS` env var.
  // This provides a single switch to toggle between mock and real AI analysis.
  const useMockData = process.env.USE_AI_ANALYSIS !== 'true';
  
  return (
    <main>
      <DemoGenerator useMockData={useMockData} />
    </main>
  );
}
