
'use client';
import { useFirestore, useMemoFirebase } from "@/firebase/provider";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, where } from "firebase/firestore";
import type { Circle } from "@/lib/data";


export function useUserCircles(userId: string | undefined) {
    const firestore = useFirestore();

    const circlesQuery = useMemoFirebase(() => {
        if (!userId || !firestore) return null;

        return query(
            collection(firestore, 'circles'),
            where('memberIds', 'array-contains', userId)
        );
    }, [firestore, userId]);
    
    const { data: circles, isLoading, error } = useCollection<Circle>(circlesQuery);

    return { circles, isLoading, error };
}
