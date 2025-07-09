
"use client"

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, ExternalLink, Trash2, CheckCircle, Clock, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { format } from 'date-fns';
import type { DemoConfig } from "@/types"
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { deleteDemo, resetDemoStatus } from "@/lib/actions"

export const columns: ColumnDef<DemoConfig>[] = [
  {
    accessorKey: "websiteUrl",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Website URL
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
        return <div className="font-medium">{row.getValue("websiteUrl")}</div>
    }
  },
  {
    accessorKey: "isInstalled",
    header: "Status",
    cell: ({ row }) => {
        const { isInstalled, installedAt } = row.original;
        
        if (isInstalled) {
            return (
                <div className="flex items-center gap-2 font-medium text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <div className="flex flex-col text-left">
                        <span>Installed</span>
                        {installedAt && (
                             <span className="text-xs font-normal text-muted-foreground">
                                {format(new Date(installedAt), "MMM d, yyyy")}
                             </span>
                        )}
                    </div>
                </div>
            )
        }

        return (
            <div className="flex items-center gap-2 font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Pending</span>
            </div>
        )
    }
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Last Updated
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
        const [isMounted, setIsMounted] = React.useState(false);

        React.useEffect(() => {
            setIsMounted(true);
        }, []);

        const dateString = row.getValue("updatedAt") as string;
        
        if (!isMounted) {
            return <Skeleton className="h-4 w-48" />;
        }
    
        const date = new Date(dateString);
        const formattedDate = format(date, "MMMM d, yyyy 'at' h:mm a");
        return <div>{formattedDate}</div>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const demo = row.original
      const { toast } = useToast()
      const [isDeleting, setIsDeleting] = React.useState(false)
      const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
      const [isResetting, setIsResetting] = React.useState(false)
      const [isResetOpen, setIsResetOpen] = React.useState(false)
      
      const handleDelete = async () => {
          setIsDeleting(true)
          const result = await deleteDemo(demo.id)
          if (result.success) {
            toast({
                title: "Demo Deleted",
                description: "The demo has been successfully deleted.",
            })
          } else {
            toast({
                title: "Error",
                description: result.message,
                variant: "destructive",
            })
          }
          setIsDeleting(false)
          setIsDeleteOpen(false)
      }

      const handleReset = async () => {
          setIsResetting(true)
          const result = await resetDemoStatus(demo.id)
          if (result.success) {
            toast({
                title: "Status Reset",
                description: "The demo status has been successfully reset to Pending.",
            })
          } else {
            toast({
                title: "Error",
                description: result.message,
                variant: "destructive",
            })
          }
          setIsResetting(false)
          setIsResetOpen(false)
      }


      return (
        <>
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the demo for <strong className="break-all">{demo.websiteUrl}</strong>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isResetOpen} onOpenChange={setIsResetOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will reset the installation status for <strong className="break-all">{demo.websiteUrl}</strong> to &quot;Pending&quot;. This is intended for testing purposes only.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleReset}
                        disabled={isResetting}
                    >
                        {isResetting ? "Resetting..." : "Reset Status"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <div className="text-right">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                    <Link href={`/demo/${demo.id}`} target="_blank" className="flex items-center gap-2 cursor-pointer">
                        <ExternalLink className="h-4 w-4" />
                        View Demo
                    </Link>
                </DropdownMenuItem>
                {process.env.NODE_ENV === 'development' && (
                  <DropdownMenuItem onClick={() => setIsResetOpen(true)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset Status
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
        </>
      )
    },
  },
]
