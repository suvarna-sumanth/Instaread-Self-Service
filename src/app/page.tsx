import DemoGenerator from '@/components/demo-generator';

export default function Home() {
  // Logic to use mock data is now based on the presence of the OpenAI API key.
  // This allows for easy testing of production-like features in a dev environment.
  const useMockData = !process.env.OPENAI_API_KEY;
  
  return (
    <main>
      <DemoGenerator useMockData={useMockData} />
    </main>
  );
}
