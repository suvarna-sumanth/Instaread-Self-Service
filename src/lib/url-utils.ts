'use server';

/**
 * Checks if a given URL is likely a homepage or root domain.
 * @param urlString The URL to check.
 * @returns True if the URL is likely a homepage.
 */
export async function isLikelyHomepage(urlString: string): Promise<boolean> {
    try {
        const url = new URL(urlString);
        // A homepage typically has a path of '/' or is empty.
        // We also check for common index files.
        const pathname = url.pathname;
        return pathname === '/' || pathname === '' || pathname.toLowerCase().endsWith('/index.html') || pathname.toLowerCase().endsWith('/index.php');
    } catch (e) {
        // If the URL is invalid, it's not a homepage we can process.
        return false;
    }
}
