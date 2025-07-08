
'use client'

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { PlayerConfig, Placement } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Clipboard, Check, Wand2, Loader2, AlertTriangle, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { PLAYER_SCRIPT_URL } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';

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

const injectionRuleSchema = z.object({
    target_selector: z.string().min(1, "Selector is required"),
    insert_position: z.enum(['before_element', 'after_element']),
    exclude_slugs: z.string().optional()
});

const wordpressConfigSchema = z.object({
    partner_id: z.string().min(1, "Partner ID is required"),
    domain: z.string().min(1, "Domain is required"),
    publication: z.string().min(1, "Publication is required"),
    injection_rules: z.array(injectionRuleSchema).min(1, "At least one injection rule is required.")
});

type WordPressConfigFormValues = z.infer<typeof wordpressConfigSchema>;


const IntegrationCodeSection = ({ playerConfig, websiteUrl, selectedPlacement }: IntegrationCodeSectionProps) => {
    const { toast } = useToast();
    
    const { playerType, color } = playerConfig;

    const form = useForm<WordPressConfigFormValues>({
        resolver: zodResolver(wordpressConfigSchema),
        defaultValues: {
            partner_id: '',
            domain: '',
            publication: '',
            injection_rules: []
        }
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "injection_rules"
    });

    useEffect(() => {
        if (websiteUrl) {
            try {
                const urlObject = new URL(websiteUrl);
                const domain = urlObject.hostname;
                const partnerId = domain.replace(/^www\./, '').split('.')[0];
                form.setValue('domain', domain, { shouldValidate: true });
                form.setValue('partner_id', partnerId, { shouldValidate: true });
                form.setValue('publication', partnerId, { shouldValidate: true });
            } catch (e) {
                form.resetField('domain');
                form.resetField('partner_id');
                form.resetField('publication');
            }
        }
    }, [websiteUrl, form.setValue, form.resetField]);
    
    useEffect(() => {
        if (selectedPlacement?.selector) {
            const newRule = {
                target_selector: selectedPlacement.selector,
                insert_position: selectedPlacement.position === 'before' ? 'before_element' : 'after_element' as 'before_element' | 'after_element',
                exclude_slugs: ""
            };
            // Replace all existing rules with the new one from the preview
            replace([newRule]);
        } else {
             // If placement is cleared, clear the rules
             replace([]);
        }
    }, [selectedPlacement, replace]);

    const onSubmit: SubmitHandler<WordPressConfigFormValues> = (data) => {
        console.log("Phase 1: WordPress Config Form Submitted", data);
        toast({
            title: "Phase 1 Complete!",
            description: "Form data has been logged to the console. GitHub integration will be implemented in Phase 2.",
        });
        // Phase 2 will involve calling a server action here to interact with GitHub API
    };


    let publication = 'xyz';
    if (process.env.NODE_ENV === 'production' && websiteUrl) {
      try {
        const urlObject = new URL(websiteUrl);
        const domain = urlObject.hostname.replace(/^www\./, '').split('.')[0];
        publication = domain || 'xyz';
      } catch (e) {
        publication = 'xyz';
      }
    }

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
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
                                <div className="p-4 border rounded-lg space-y-4">
                                    <h4 className="font-semibold">Partner Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                         <FormField
                                            control={form.control}
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
                                            control={form.control}
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
                                            control={form.control}
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
                                            <PlusCircle className="mr-2" />
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
                                                <Trash2 className="text-destructive"/>
                                                <span className="sr-only">Remove Rule</span>
                                            </Button>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                 <FormField
                                                    control={form.control}
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
                                                    control={form.control}
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
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                             <FormField
                                                control={form.control}
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
                                <div className="flex justify-end">
                                     <Button type="submit">
                                        <Wand2 className="mr-2" />
                                        Generate Plugin Files
                                    </Button>
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
