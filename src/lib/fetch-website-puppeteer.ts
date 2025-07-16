import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export async function fetchWebsiteWithPuppeteer(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    );

    await page.setJavaScriptEnabled(true);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const html = await page.content();
    return html;
  } finally {
    await browser.close();
  }
}
