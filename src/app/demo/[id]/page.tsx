
import { notFound } from 'next/navigation';
import { getDemoById } from '@/services/demo-service';
import { getVisualClone } from '@/lib/actions';
import { PLAYER_SCRIPT_URL } from '@/lib/constants';
import { unstable_noStore as noStore } from 'next/cache';


async function generateDemoHtml(id: string): Promise<string> {
    noStore(); // Opt out of caching for this render
    const demoConfig = await getDemoById(id);
    if (!demoConfig) {
        return '';
    }

    const { websiteUrl, playerConfig, placement } = demoConfig;

    let cloneHtml = await getVisualClone(websiteUrl);
    if (!cloneHtml || cloneHtml.startsWith('Error')) {
        return `<html><body><h1>Error</h1><p>Could not generate a preview for ${websiteUrl}. The site may be unreachable.</p></body></html>`;
    }

    // Use cheerio to manipulate the HTML on the server
    const cheerio = await import('cheerio');
    const $ = cheerio.load(cloneHtml);
    
    // Add a <base> tag to resolve all relative URLs for images, fonts, etc.
    if ($('base').length === 0) {
        $('head').prepend(`<base href="${websiteUrl}">`);
    }

    // Explicitly remove the unwanted widget.
    const unwantedWidget = $('#elevenlabs-audionative-widget');
    if (unwantedWidget) {
        unwantedWidget.remove();
    }
    
    // Inject player script
    const playerScript = `<script type="module" crossorigin src="${PLAYER_SCRIPT_URL}"></script>`;
    $('head').append(playerScript);

    // Inject custom styles
    let styleContent = `
        instaread-player {
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
        }
        /* Logic to show fade-in player after a short delay */
        @keyframes fadeIn {
            to { opacity: 1; }
        }
        .instaread-player-fade-in {
            animation: fadeIn 0.5s ease-in-out 0.5s forwards;
        }
    `;

    if (playerConfig.playerType === 'newdesign' || playerConfig.playerType === 'shortdesign') {
        styleContent += `
            @media (max-width: 1199px) {
                .instaread-audio-player {
                    height: 224px !important;
                }
            }
            @media (min-width: 1200px) {
                .instaread-audio-player {
                    height: 144px !important;
                }
            }
        `;
    }
    $('head').append(`<style>${styleContent}</style>`);


    // Inject player element
    // Use .first() to ensure we only target a single element, even if the selector matches multiple
    const targetEl = $(placement.selector).first();
    if (targetEl.length > 0) {
        let publication = 'xyz';
         if (process.env.NODE_ENV !== 'development') {
            try {
                const urlObject = new URL(websiteUrl);
                publication = urlObject.hostname.replace(/^www\./, '').split('.')[0] || 'xyz';
            } catch (e) {
                console.warn(`Invalid URL provided for publication name: ${websiteUrl}`);
            }
         }

        const playerHtml = `<instaread-player
            id="instaread-player-instance"
            publication="${publication}"
            playertype="${playerConfig.playerType}"
            colortype="${playerConfig.color}"
            class="instaread-player-fade-in"
          ></instaread-player>`;
        
        if (placement.position === 'before') {
            targetEl.before(playerHtml);
        } else {
            targetEl.after(playerHtml);
        }
    } else {
        console.warn(`Placement selector "${placement.selector}" not found in the cloned page.`);
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
        <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: finalHtml }} />
    );
}

// Ensure the page is always dynamically rendered
export const dynamic = 'force-dynamic';
