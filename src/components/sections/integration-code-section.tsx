
'use client'

import { useState } from 'react';
import type { PlayerConfig } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Clipboard, Check } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { PLAYER_SCRIPT_URL } from '@/lib/constants';

type IntegrationCodeSectionProps = {
    playerConfig: PlayerConfig;
    websiteUrl: string;
};

const IntegrationCodeSection = ({ playerConfig, websiteUrl }: IntegrationCodeSectionProps) => {
    const { toast } = useToast();
    const [copied, setCopied] = useState('');
    
    const { playerType, color } = playerConfig;
    const scriptSrc = PLAYER_SCRIPT_URL;

    let publication = 'xyz';
    if (process.env.NODE_ENV === 'production' && websiteUrl) {
      try {
        const urlObject = new URL(websiteUrl);
        const domain = urlObject.hostname.replace(/^www\./, '').split('.')[0];
        publication = domain || 'xyz';
      } catch (e) {
        // Invalid URL, fallback to 'xyz'
        publication = 'xyz';
      }
    }

    const codeSnippets = {
        html: `<script type="module" crossorigin src="${scriptSrc}"></script>
<instaread-player
  publication="${publication}"
  playertype="${playerType}"
  colortype="${color}"
></instaread-player>`,
        react: `import { useEffect } from 'react';

// This component assumes the Instaread script has been added to your HTML file.
// <script type="module" crossorigin src="${scriptSrc}"></script>

const InstareadPlayer = ({ publication, playerType, colorType }) => {
  return (
    <instaread-player
      publication={publication}
      playertype={playerType}
      colortype={colorType}
    ></instaread-player>
  );
};

const MyComponent = () => {
  return (
    <InstareadPlayer
      publication="${publication}"
      playerType="${playerType}"
      colorType="${color}"
    />
  );
};`,
        wordpress: `<?php
/**
 * Plugin Name: Instaread Player for ${publication}
 * Description: Adds the Instaread audio player via the [instaread_player] shortcode.
 * Version: 1.0
 * Author: Instaread
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// 1. Enqueue the player script
function instaread_player_enqueue_script() {
    wp_enqueue_script(
        'instaread-player-script',
        '${scriptSrc}',
        array(),
        '1.0.0',
        true
    );
}
add_action( 'wp_enqueue_scripts', 'instaread_player_enqueue_script' );


// 2. Register the shortcode
function instaread_player_shortcode_handler( $atts ) {
    // Set default attributes from your configuration
    $default_atts = array(
        'publication' => '${publication}',
        'playertype' => '${playerType}',
        'colortype' => '${color}',
    );
    
    // Merge user-provided attributes with defaults
    $final_atts = shortcode_atts( $default_atts, $atts, 'instaread_player' );

    // Sanitize attributes for security
    $publication_sanitized = sanitize_text_field( $final_atts['publication'] );
    $playertype_sanitized = sanitize_text_field( $final_atts['playertype'] );
    $colortype_sanitized = sanitize_hex_color( $final_atts['colortype'] );

    // Return the player HTML element
    return sprintf(
        '<instaread-player publication="%s" playertype="%s" colortype="%s"></instaread-player>',
        esc_attr( $publication_sanitized ),
        esc_attr( $playertype_sanitized ),
        esc_attr( $colortype_sanitized )
    );
}
add_shortcode( 'instaread_player', 'instaread_player_shortcode_handler' );

/*
* How to use:
* 1. Save this code as a .php file (e.g., instaread-plugin.php).
* 2. Go to your WordPress admin dashboard, navigate to Plugins > Add New > Upload Plugin.
* 3. Upload the .php file and activate it.
* 4. Add the shortcode [instaread_player] to any page, post, or widget.
*
* You can override the defaults like this:
* [instaread_player playertype="shortdesign" colortype="#ff0000"]
*/
`
    };

    const handleCopy = (content: string, type: string) => {
        navigator.clipboard.writeText(content);
        setCopied(type);
        toast({ title: "Copied to clipboard!" });
        setTimeout(() => setCopied(''), 2000);
    };

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">3. Get Integration Code</CardTitle>
                <CardDescription>Copy a code snippet for your website, or get a complete WordPress plugin.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="html" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="html">HTML</TabsTrigger>
                        <TabsTrigger value="react">React</TabsTrigger>
                        <TabsTrigger value="wordpress">WordPress</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="html">
                        <div className="relative mt-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7"
                                onClick={() => handleCopy(codeSnippets.html, 'html')}
                            >
                                {copied === 'html' ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
                            </Button>
                            <pre className="bg-muted rounded-md p-4 text-sm overflow-x-auto">
                                <code className="font-code text-muted-foreground">{codeSnippets.html}</code>
                            </pre>
                        </div>
                    </TabsContent>

                    <TabsContent value="react">
                         <div className="relative mt-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7"
                                onClick={() => handleCopy(codeSnippets.react, 'react')}
                            >
                                {copied === 'react' ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
                            </Button>
                            <pre className="bg-muted rounded-md p-4 text-sm overflow-x-auto">
                                <code className="font-code text-muted-foreground">{codeSnippets.react}</code>
                            </pre>
                        </div>
                    </TabsContent>
                    <TabsContent value="wordpress">
                        <div className="relative mt-4">
                           <p className="text-xs text-muted-foreground mb-2 px-1">Save this as a PHP file and upload it from the WordPress plugin installer.</p>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-10 right-2 h-7 w-7"
                                onClick={() => handleCopy(codeSnippets.wordpress, 'wordpress')}
                            >
                                {copied === 'wordpress' ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
                            </Button>
                            <pre className="bg-muted rounded-md p-4 text-sm overflow-x-auto">
                                <code className="font-code text-muted-foreground">{codeSnippets.wordpress}</code>
                            </pre>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default IntegrationCodeSection;
