'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { wordpressPluginSchema, type WordpressPluginFormData } from '@/lib/schemas';
import { generateWordPressPlugin } from '@/lib/github-actions';


const WordpressPluginForm = () => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        name: 'injection_rules',
    });

    const onSubmit = async (data: WordpressPluginFormData) => {
        setIsSubmitting(true);
        try {
            const result = await generateWordPressPlugin(data);
            if (result.success) {
                toast({
                    title: 'Plugin Generation Started',
                    description: result.message,
                });
            } else {
                toast({
                    title: 'Generation Failed',
                    description: result.error,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast({
                title: 'An Unexpected Error Occurred',
                description: 'Please check the console for details.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-1">
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
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select context" />
                                        </SelectTrigger>
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
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select strategy" />
                                        </SelectTrigger>
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
                                    className="absolute -top-3 -right-3 bg-background rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                                >
                                    <XCircle className="h-6 w-6" />
                                </button>
                                <FormField
                                    control={form.control}
                                    name={`injection_rules.${index}.target_selector`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Target Selector</FormLabel>
                                            <FormControl>
                                                <Input placeholder=".article-content" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                                        <SelectItem value="prepend">Prepend</SelectItem>
                                                        <SelectItem value="append">Append</SelectItem>
                                                        <SelectItem value="before">Before</SelectItem>
                                                        <SelectItem value="after">After</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`injection_rules.${index}.exclude_slugs`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Exclude Slugs (optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="privacy-policy, terms" {...field} />
                                                </FormControl>
                                                 <FormDescription className="text-xs">Comma-separated list of URL slugs to exclude.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
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
                            <FormItem>
                                <FormLabel>Plugin Version</FormLabel>
                                <FormControl>
                                    <Input placeholder="1.0.0" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                     {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate WordPress Plugin
                </Button>
            </form>
        </Form>
    );
};

export default WordpressPluginForm;
