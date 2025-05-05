'use client';

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, DocumentReference, DocumentData, DocumentSnapshot } from 'firebase/firestore';

interface FirestoreDocState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useFirestoreDoc<T>(docRef: DocumentReference<DocumentData>): FirestoreDocState<T> {
  const [state, setState] = useState<FirestoreDocState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const docRefRef = useRef(docRef);

 useEffect(() => {
   // Simple path comparison for changes. Consider a more robust comparison if needed.
   if (docRefRef.current.path !== docRef.path) {
     docRefRef.current = docRef;
     // Reset state when document reference changes
      setState({ data: null, loading: true, error: null });
   }
 }, [docRef]);


  useEffect(() => {
    // No need to reset state here as it's handled by the ref change effect
    const unsubscribe = onSnapshot(
      docRefRef.current,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          const data = { id: snapshot.id, ...snapshot.data() } as T;
          setState({ data, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: null }); // Document doesn't exist
        }
      },
      (error) => {
        console.error("Error fetching Firestore document:", error);
        setState({ data: null, loading: false, error });
      }
    );

    return () => unsubscribe();
  }, [docRefRef.current]); // Depend only on the ref

  return state;
}
