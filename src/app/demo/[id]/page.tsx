import { notFound } from "next/navigation";
import { getDemoById } from "@/services/demo-service";
import { PLAYER_SCRIPT_URL } from "@/lib/constants";
import { unstable_noStore as noStore } from "next/cache";
import * as cheerio from "cheerio";
import { generateVisualClone as generateVisualCloneFlow } from "@/ai/flows/generate-visual-clone";

async function generateDemoHtml(id: string): Promise<string> {
  noStore(); // Opt out of caching for this render
  const demoConfig = await getDemoById(id);
  if (!demoConfig) {
    return "";
  }

  const { websiteUrl, playerConfig, placement } = demoConfig;

  const cloneResult = await generateVisualCloneFlow({ websiteUrl: websiteUrl });
  let cloneHtml = cloneResult.cloneHtml;

  if (!cloneHtml || cloneHtml.startsWith("Error")) {
    return `<html><body><h1>Error</h1><p>Could not generate a preview for ${websiteUrl}. The site may be unreachable.</p></body></html>`;
  }

  // Use cheerio to manipulate the HTML on the server
  const $ = cheerio.load(cloneHtml);

  // Add a <base> tag to resolve all relative URLs for images, fonts, etc.
  if ($("base").length === 0) {
    $("head").prepend(`<base href="${websiteUrl}">`);
  }

  // Explicitly remove the unwanted widget.
  const unwantedWidget = $("#elevenlabs-audionative-widget");
  if (unwantedWidget) {
    unwantedWidget.remove();
  }
  // Inject player script
  const playerScript = `<script type="module" crossorigin src="${PLAYER_SCRIPT_URL}"></script>`;
  $("head").append(playerScript);

  // Inject player element
  // Use .first() to ensure we only target a single element, even if the selector matches multiple
  const targetEl = $(placement.selector).first();
  if (targetEl.length > 0) {
    // Use the exact publication name from the saved demo configuration.
    // This ensures consistency between what's saved and what's tested.
    const publication = demoConfig.publication;

    const playerHtml = `<instaread-player
            id="instaread-player-instance"
            publication="${publication}"
            playertype="${playerConfig.playerType}"
            colortype="${playerConfig.color}"
            class="instaread-player-fade-in"
          ></instaread-player>`;

    if (placement.position === "before") {
      targetEl.before(playerHtml);
    } else {
      targetEl.after(playerHtml);
    }
  } else {
    console.warn(
      `Placement selector "${placement.selector}" not found in the cloned page.`
    );
  }

  return $.html();
}

export default async function DemoPage({ params }: { params: { id: string } }) {
  const finalHtml = await generateDemoHtml(params.id);

  if (!finalHtml) {
    notFound();
  }

  // Using dangerouslySetInnerHTML to render the full HTML document string.
  // The browser will handle the nested <html>/<body> tags that result from this.
  // This is the most direct way to render a server-generated HTML string in a Next.js page.
  return (
    <div
      style={{ width: "100%", height: "100%" }}
      dangerouslySetInnerHTML={{ __html: finalHtml }}
    />
  );
}

// Ensure the page is always dynamically rendered
export const dynamic = "force-dynamic";
