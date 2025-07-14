"use client";

import { columns } from "@/components/dashboard/columns";
import { DataTable } from "@/components/ui/data-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DemoConfig } from "@/types";
import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";

export default function DashboardClient({ data }: { data: DemoConfig[] }) {
  const [liveData, setLiveData] = useState<DemoConfig[]>(data); // fallback initial data

  useEffect(() => {
    const clearPointerEvents = () => {
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "auto";
        console.log("🛠️ Pointer events restored on <body>");
      }
    };

    const observer = new MutationObserver(clearPointerEvents);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });

    const interval = setInterval(clearPointerEvents, 500); // backup timer

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const q = query(collection(db, "demos"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updated = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DemoConfig[];
      setLiveData(updated);
    });

    return () => unsubscribe(); // cleanup listener
  }, []);

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">
            Demos Dashboard
          </CardTitle>
          <CardDescription>
            A list of all the demos you have created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={liveData} />
        </CardContent>
      </Card>
    </div>
  );
}
