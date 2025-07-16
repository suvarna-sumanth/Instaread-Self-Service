import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export async function fetchWebsiteWithPuppeteer(url: string): Promise<string> {
  // puppeteer-extra automatically applies the stealth plugin
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Set a desktop viewport to ensure we get the desktop version of the site
    await page.setViewport({ width: 1920, height: 1080 });

    // Set a realistic User-Agent to mimic a real desktop browser
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    );

    // Ensure JavaScript is enabled, as some sites rely on it for layout
    await page.setJavaScriptEnabled(true);

    // Go to the page and wait for the network to be idle, which is a good
    // sign that all resources have loaded. Increase timeout to 30 seconds.
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const html = await page.content();
    return html;
  } finally {
    await browser.close();
  }
}
