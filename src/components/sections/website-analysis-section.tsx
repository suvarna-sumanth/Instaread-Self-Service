'use client'

import type { AnalysisResult } from '@/types';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Palette, Type, Cpu, Loader2 } from 'lucide-react';

const FormSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }),
});

type WebsiteAnalysisSectionProps = {
  onAnalyze: (url: string) => void;
  analysis: AnalysisResult;
  isLoading: boolean;
};

const WebsiteAnalysisSection = ({ onAnalyze, analysis, isLoading }: WebsiteAnalysisSectionProps) => {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      url: "https://example.com"
    }
  });

  const onSubmit: SubmitHandler<z.infer<typeof FormSchema>> = (data) => {
    onAnalyze(data.url);
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">1. Website Analysis</CardTitle>
        <CardDescription>Enter a website URL to extract design tokens and tech stack.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormLabel className="sr-only">Website URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://your-customers-website.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Analyze
            </Button>
          </form>
        </Form>
        {analysis && (
          <div className="mt-6 space-y-4 animate-in fade-in duration-500">
            <Separator />
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><Palette size={20} className="text-primary" />Colors</h3>
              <div className="flex gap-4">
                {Object.entries(analysis.colors).map(([name, value]) => (
                  <div key={name} className="text-center">
                    <div className="w-12 h-12 rounded-lg border shadow-inner" style={{ backgroundColor: value }}></div>
                    <p className="text-xs mt-1 capitalize text-muted-foreground">{name}</p>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><Type size={20} className="text-primary" />Typography</h3>
              <p><strong>Headline:</strong> <span className="font-headline text-muted-foreground">{analysis.fonts.headline}</span></p>
              <p><strong>Body:</strong> <span className="font-body text-muted-foreground">{analysis.fonts.body}</span></p>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><Cpu size={20} className="text-primary" />Tech Stack</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.techStack.map(tech => <Badge key={tech} variant="secondary">{tech}</Badge>)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WebsiteAnalysisSection;
