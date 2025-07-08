
'use client'

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { PlayerConfig, Placement } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Clipboard, Check, Wand2, AlertTriangle, PlusCircle, Trash2, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { PLAYER_SCRIPT_URL } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { wordpressConfigSchema, type WordPressConfigFormValues } from '@/lib/schemas';
import { generatePartnerPlugin } from '@/lib/actions';

type IntegrationCodeSectionProps = {
    playerConfig: PlayerConfig;
    websiteUrl: string;
    selectedPlacement: Placement;
};

const CodeBlock = ({ content, language }: { content: string, language: string }) => {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        toast({ title: "Copied to clipboard!" });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative mt-2">
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={handleCopy}
            >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
            </Button>
            <pre className="bg-muted rounded-md p-4 text-sm overflow-x-auto">
                <code className={`font-code text-muted-foreground language-${language}`}>{content}</code>
            </pre>
        </div>
    )
}

const IntegrationCodeSection = ({ playerConfig, websiteUrl, selectedPlacement }: IntegrationCodeSectionProps) => {
    const { toast } = useToast();
    const [isBuilding, setIsBuilding] = useState(false);
    const [buildResult, setBuildResult] = useState<{success: boolean; message: string; pullRequestUrl?: string;} | null>(null);
    
    const { playerType, color } = playerConfig;

    const form = useForm<WordPressConfigFormValues>({
        resolver: zodResolver(wordpressConfigSchema),
        defaultValues: {
            partner_id: '',
            domain: '',
            publication: '',
            version: '1.0.0',
            injection_context: 'singular',
            injection_strategy: 'first',
            injection_rules: []
        }
    });

    const { control, handleSubmit, reset, getValues } = form;

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "injection_rules"
    });

    useEffect(() => {
        const currentValues = getValues();
        let newPartnerId = '';
        let newDomain = '';
        let newPublication = '';

        if (websiteUrl) {
            try {
                const urlObject = new URL(websiteUrl);
                newDomain = urlObject.hostname;
                newPartnerId = newDomain.replace(/^www\./, '').split('.')[0];
                newPublication = newPartnerId;
            } catch (e) {
                // If URL is invalid, values will remain empty strings
            }
        }
        
        // Use reset to update the form state based on the new URL prop.
        // This is safer than multiple setValue calls for derived state.
        reset({
            ...currentValues, // Preserve existing values like version, rules, etc.
            domain: newDomain,
            partner_id: newPartnerId,
            publication: newPublication,
        });

    }, [websiteUrl, reset, getValues]);
    
    useEffect(() => {
        if (selectedPlacement?.selector) {
            const newRule = {
                target_selector: selectedPlacement.selector,
                insert_position: selectedPlacement.position === 'before' ? 'before_element' : 'after_element',
                exclude_slugs: ""
            };
            replace([newRule]);
        } else {
             replace([]);
        }
    }, [selectedPlacement, replace]);

    const onSubmit: SubmitHandler<WordPressConfigFormValues> = async (data) => {
        setIsBuilding(true);
        setBuildResult(null);
        try {
            const result = await generatePartnerPlugin(data);
            setBuildResult(result);
            if (!result.success) {
                 toast({
                    title: "Build Failed",
                    description: result.message,
                    variant: "destructive",
                });
            } else {
                 toast({
                    title: "Success!",
                    description: "Pull request created on GitHub.",
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unexpected client-side error occurred."
            setBuildResult({ success: false, message });
             toast({
                title: "Build Failed",
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsBuilding(false);
        }
    };

    const publication = process.env.NODE_ENV === 'development' ? 'xyz' : (
        websiteUrl ? new URL(websiteUrl).hostname.replace(/^www\./, '').split('.')[0] || 'xyz' : 'xyz'
    );

    const codeSnippets = {
        html: `<script type="module" crossorigin src="${PLAYER_SCRIPT_URL}"></script>
<instaread-player
  publication="${publication}"
  playertype="${playerType}"
  colortype="${color}"
></instaread-player>`,
        react: `import { useEffect } from 'react';

// In your main HTML file, add the script tag:
// <script type="module" crossorigin src="${PLAYER_SCRIPT_URL}"></script>

const InstareadPlayer = ({ publication, playerType, colorType }) => {
  // This tells TypeScript to expect a custom element
  useEffect(() => {
    // You might need to declare the custom element type for TypeScript
    // if you haven't done so globally.
  }, []);

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
};`
    };

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">3. Get Integration Code</CardTitle>
                <CardDescription>Copy a code snippet or generate a full WordPress partner plugin solution.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="html" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="html">HTML</TabsTrigger>
                        <TabsTrigger value="react">React</TabsTrigger>
                        <TabsTrigger value="wordpress">WordPress</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="html">
                        <CodeBlock content={codeSnippets.html} language="html" />
                    </TabsContent>

                    <TabsContent value="react">
                         <CodeBlock content={codeSnippets.react} language="jsx" />
                    </TabsContent>
                    
                    <TabsContent value="wordpress">
                        <Form {...form}>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
                                <div className="p-4 border rounded-lg space-y-4">
                                    <h4 className="font-semibold">Partner Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <FormField
                                            control={control}
                                            name="partner_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Partner ID</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. outdoornews" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={control}
                                            name="domain"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Domain</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. outdoornews.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={control}
                                            name="publication"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Publication</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. outdoornews" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={control}
                                            name="version"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Version</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. 1.0.0" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                                
                                <div className="p-4 border rounded-lg space-y-4">
                                     <h4 className="font-semibold">Injection Details</h4>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <FormField
                                            control={control}
                                            name="injection_context"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Injection Context</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select context" />
                                                        </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="singular">Single Posts/Pages</SelectItem>
                                                            <SelectItem value="all">All Pages</SelectItem>
                                                            <SelectItem value="archive">Archive</SelectItem>
                                                            <SelectItem value="front_page">Front Page</SelectItem>
                                                            <SelectItem value="posts_page">Blog Index</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={control}
                                            name="injection_strategy"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Injection Strategy</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select strategy" />
                                                        </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="first">First</SelectItem>
                                                            <SelectItem value="all">All</SelectItem>
                                                            <SelectItem value="none">None</SelectItem>
                                                            <SelectItem value="custom">Custom</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                     </div>
                                </div>

                                <div className="p-4 border rounded-lg space-y-4">
                                     <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold">Injection Rules</h4>
                                            <p className="text-sm text-muted-foreground">Define where the player should be injected.</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => append({ target_selector: '', insert_position: 'after_element', exclude_slugs: '' })}
                                        >
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Add Rule
                                        </Button>
                                    </div>

                                    {fields.length === 0 && (
                                        <Alert variant="destructive">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle>No Injection Rule</AlertTitle>
                                            <AlertDescription>
                                                Please select a placement in the live preview or add a rule manually.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {fields.map((field, index) => (
                                        <div key={field.id} className="p-3 bg-muted/50 rounded-md border space-y-3 relative">
                                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => remove(index)}>
                                                <Trash2 className="text-destructive h-4 w-4"/>
                                                <span className="sr-only">Remove Rule</span>
                                            </Button>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                 <FormField
                                                    control={control}
                                                    name={`injection_rules.${index}.target_selector`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                        <FormLabel>Target Selector</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. .article-body > p:first-of-type" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                        </FormItem>
                                                    )}
                                                    />
                                                <FormField
                                                    control={control}
                                                    name={`injection_rules.${index}.insert_position`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Insert Position</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select position" />
                                                                </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="before_element">Before Element</SelectItem>
                                                                    <SelectItem value="after_element">After Element</SelectItem>
                                                                    <SelectItem value="inside_first_child">Inside (First Child)</SelectItem>
                                                                    <SelectItem value="inside_last_child">Inside (Last Child)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                             <FormField
                                                control={control}
                                                name={`injection_rules.${index}.exclude_slugs`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel>Exclude Slugs (Optional)</FormLabel>
                                                    <FormControl>
                                                        <Textarea placeholder="Comma-separated list of slugs to exclude, e.g. about-us,contact" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <Separator />
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={isBuilding}>
                                            {isBuilding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                            {isBuilding ? 'Generating...' : 'Generate Plugin PR'}
                                        </Button>
                                    </div>
                                    
                                    {buildResult && (
                                        <Alert variant={buildResult.success ? "default" : "destructive"}>
                                            {buildResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                            <AlertTitle>{buildResult.success ? "Success" : "Error"}</AlertTitle>
                                            <AlertDescription>
                                                {buildResult.message}
                                                {buildResult.success && buildResult.pullRequestUrl && (
                                                    <a href={buildResult.pullRequestUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold underline mt-2">
                                                        View Pull Request <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default IntegrationCodeSection;
