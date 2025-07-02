'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PlusCircle, XCircle, Loader2, Download, Terminal } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { wordpressPluginSchema, type WordpressPluginFormData } from '@/lib/schemas';
import { generateWordPressPlugin, getWorkflowRunResult } from '@/lib/github-actions';
import { Progress } from '@/components/ui/progress';


const WordpressPluginForm = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const form = useForm<WordpressPluginFormData>({
        resolver: zodResolver(wordpressPluginSchema),
        defaultValues: {
            partner_id: '',
            domain: '',
            publication: '',
            injection_context: 'singular',
            injection_strategy: 'first',
            injection_rules: [{ target_selector: '', insert_position: 'prepend', exclude_slugs: '' }],
            version: '1.0.0',
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "injection_rules"
    });

    const stopPolling = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        intervalRef.current = null;
        timeoutRef.current = null;
    };

    const resetState = () => {
        setIsLoading(false);
        setLoadingMessage(null);
        setDownloadUrl(null);
        setErrorMessage(null);
        setProgress(0);
        form.reset({
            partner_id: '',
            domain: '',
            publication: '',
            injection_context: 'singular',
            injection_strategy: 'first',
            injection_rules: [{ target_selector: '', insert_position: 'prepend', exclude_slugs: '' }],
            version: '1.0.0',
        });
        stopPolling();
    };

    // Effect to clean up intervals and timeouts on component unmount
    useEffect(() => {
        return () => stopPolling();
    }, []);

    const onSubmit = async (data: WordpressPluginFormData) => {
        // Clear previous results before starting
        setDownloadUrl(null);
        setErrorMessage(null);

        setIsLoading(true);
        setLoadingMessage('Triggering build...');
        setProgress(10);

        try {
            const result = await generateWordPressPlugin(data);
            
            if (result.success && result.runId) {
                toast({
                    title: 'Build Triggered',
                    description: 'Your plugin build has started. This may take a few minutes.',
                });
                setLoadingMessage('Build process initiated...');
                setProgress(25);

                const POLLING_INTERVAL = 10000;
                const POLLING_TIMEOUT = 300000; // 5 minutes

                timeoutRef.current = setTimeout(() => {
                    stopPolling();
                    setErrorMessage('Build process timed out. Please check the status in your GitHub Actions tab.');
                    setIsLoading(false);
                    toast({ title: 'Build Timed Out', variant: 'destructive' });
                }, POLLING_TIMEOUT);

                intervalRef.current = setInterval(async () => {
                    const statusResult = await getWorkflowRunResult({ runId: result.runId!, partnerId: result.partnerId!, version: result.version! });
                    
                    if (statusResult.status === 'completed') {
                        stopPolling();
                        setIsLoading(false);
                        setLoadingMessage(null);
                        setProgress(100);
                        if (statusResult.conclusion === 'success' && statusResult.downloadUrl) {
                             setDownloadUrl(statusResult.downloadUrl);
                             toast({ title: 'Build Successful!', description: 'Your plugin is ready for download.', className: "bg-green-100 border-green-400 text-green-800" });
                        } else {
                            setErrorMessage(statusResult.error || 'The build process completed but failed.');
                            toast({ title: 'Build Failed', description: statusResult.error, variant: 'destructive' });
                        }
                    } else if (statusResult.status === 'error') {
                        stopPolling();
                        setIsLoading(false);
                        setLoadingMessage(null);
                        setErrorMessage(statusResult.error || 'An error occurred while checking status.');
                        toast({ title: 'Polling Error', description: statusResult.error, variant: 'destructive' });
                    } else {
                        if(statusResult.status === 'queued') {
                            setLoadingMessage(`Build status: queued...`);
                            setProgress(50);
                        } else if (statusResult.status === 'in_progress') {
                            setLoadingMessage(`Build status: in progress...`);
                            setProgress(75);
                        } else if (statusResult.status) {
                             setLoadingMessage(`Build status: ${statusResult.status}...`);
                             setProgress(25);
                        }
                    }
                }, POLLING_INTERVAL);

            } else {
                setErrorMessage(result.error || 'Failed to start the generation process.');
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Submission error:", error);
            const description = error instanceof Error ? error.message : "Please check the console for details.";
            setErrorMessage(`An unexpected error occurred: ${description}`);
            setIsLoading(false);
        }
    };
    
    const isFormDisabled = isLoading || !!downloadUrl || !!errorMessage;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-1">
                <fieldset disabled={isFormDisabled} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="partner_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Partner ID</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., gardenandgun" {...field} />
                                    </FormControl>
                                    <FormDescription>A unique identifier for the partner.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="publication"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Publication Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Garden & Gun" {...field} />
                                    </FormControl>
                                    <FormDescription>The public-facing name of the publication.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="domain"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Domain</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://gardenandgun.com" {...field} />
                                </FormControl>
                                <FormDescription>The primary domain of the partner's website.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="injection_context"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Injection Context</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select context" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="singular">Singular Pages</SelectItem>
                                            <SelectItem value="all">All Pages</SelectItem>
                                            <SelectItem value="custom">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="injection_strategy"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Injection Strategy</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select strategy" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="first">First Match</SelectItem>
                                            <SelectItem value="last">Last Match</SelectItem>
                                            <SelectItem value="all">All Matches</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-medium mb-4">Injection Rules</h3>
                        <div className="space-y-6">
                            {fields.map((field, index) => (
                                <div key={field.id} className="p-4 border rounded-lg relative space-y-4">
                                    <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="absolute -top-3 -right-3 bg-background rounded-full p-0.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
                                    >
                                        <XCircle className="h-6 w-6" />
                                    </button>
                                    <FormField
                                        control={form.control}
                                        name={`injection_rules.${index}.target_selector`}
                                        render={({ field }) => (
                                            <FormItem><FormLabel>Target Selector</FormLabel><FormControl><Input placeholder=".article-content" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name={`injection_rules.${index}.insert_position`}
                                            render={({ field }) => (
                                                <FormItem><FormLabel>Insert Position</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger></FormControl><SelectContent><SelectItem value="prepend">Prepend</SelectItem><SelectItem value="append">Append</SelectItem><SelectItem value="before">Before</SelectItem><SelectItem value="after">After</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`injection_rules.${index}.exclude_slugs`}
                                            render={({ field }) => (
                                                <FormItem><FormLabel>Exclude Slugs (optional)</FormLabel><FormControl><Input placeholder="privacy-policy, terms" {...field} /></FormControl><FormDescription className="text-xs">Comma-separated list of URL slugs to exclude.</FormDescription><FormMessage /></FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => append({ target_selector: '', insert_position: 'prepend', exclude_slugs: '' })}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Injection Rule
                        </Button>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="version"
                            render={({ field }) => (
                                <FormItem><FormLabel>Plugin Version</FormLabel><FormControl><Input placeholder="1.0.0" {...field} /></FormControl><FormMessage /></FormItem>
                            )}
                        />
                    </div>
                </fieldset>

                {!isFormDisabled && (
                    <Button type="submit" className="w-full">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin hidden" />
                        Generate WordPress Plugin
                    </Button>
                )}
            </form>
            
            {isLoading && (
                <div className="mt-6 p-4 border rounded-lg space-y-3">
                    <p className="text-sm text-center font-medium">{loadingMessage}</p>
                    <Progress value={progress} className="w-full" />
                </div>
            )}

            { (errorMessage || downloadUrl) && !isLoading && (
                <div className="mt-6 p-4 border rounded-lg space-y-3">
                    {errorMessage && (
                        <Alert variant="destructive">
                            <Terminal className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    )}
                    {downloadUrl && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h4 className="font-semibold text-green-600">Build Successful!</h4>
                                <p className="text-sm text-muted-foreground">Your WordPress plugin is ready.</p>
                            </div>
                            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                <Button type="button"><Download className="mr-2 h-4 w-4" />Download Plugin (.zip)</Button>
                            </a>
                        </div>
                    )}
                     <Button variant="outline" className="w-full mt-4" onClick={resetState}>
                        Start Over
                    </Button>
                </div>
            )}
        </Form>
    );
};

export default WordpressPluginForm;
