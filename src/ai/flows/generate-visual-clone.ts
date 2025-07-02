
'use server';

/**
 * @fileOverview A utility to generate a visual clone of a website.
 *
 * - generateVisualClone - A function that handles the visual clone generation process.
 * - GenerateVisualCloneInput - The input type for the generateVisualClone function.
 * - GenerateVisualCloneOutput - The return type for the generateVisualClone function.
 */

import { fetchWebsite } from '@/lib/fetch-website';
import * as cheerio from 'cheerio';

export type GenerateVisualCloneInput = {
  websiteUrl: string;
};

export type GenerateVisualCloneOutput = {
  cloneHtml: string;
};

export async function generateVisualClone(input: GenerateVisualCloneInput): Promise<GenerateVisualCloneOutput> {
    const htmlContent = await fetchWebsite(input.websiteUrl);
    if (htmlContent.startsWith('Error')) {
        throw new Error(`Failed to fetch website for cloning: ${htmlContent}`);
    }

    const $ = cheerio.load(htmlContent);
    const baseUrl = new URL(input.websiteUrl);

    // Add a <base> tag to resolve all relative URLs for images, fonts, etc.
    if ($('base').length === 0) {
        $('head').prepend(`<base href="${baseUrl.href}">`);
    }

    // Remove script tags for security and simplicity
    $('script').remove();

    // Remove Content-Security-Policy meta tags that could block injected styles
    $('meta[http-equiv="Content-Security-Policy"]').remove();

    // Inline CSS stylesheets for a self-contained clone
    const stylesheetPromises = $('link[rel="stylesheet"]').map(async (i, el) => {
        const link = $(el);
        const href = link.attr('href');
        if (href) {
            try {
                // Resolve the stylesheet URL relative to the base URL
                const cssUrl = new URL(href, baseUrl.href).href;
                const response = await fetch(cssUrl);

                if (response.ok) {
                    const cssContent = await response.text();
                    // Replace the <link> tag with an inline <style> tag
                    link.replaceWith(`<style>${cssContent}</style>`);
                } else {
                    // If we can't fetch the stylesheet, remove the link to avoid errors
                    link.remove();
                }
            } catch (e) {
                console.error(`Failed to inline stylesheet ${href}:`, e);
                link.remove();
            }
        }
    }).get(); // .get() converts cheerio collection to a plain array

    // Wait for all stylesheets to be processed
    await Promise.all(stylesheetPromises);

    const finalHtml = $.html();
    
    return { cloneHtml: finalHtml };
}
