'use client';

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, Query, DocumentData, QuerySnapshot } from 'firebase/firestore';

interface FirestoreQueryState<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}

export function useFirestoreQuery<T>(query: Query<DocumentData>): FirestoreQueryState<T> {
  const [state, setState] = useState<FirestoreQueryState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  // Use useRef to store the query. This prevents unnecessary re-subscriptions
  // if the query object reference changes but the query itself is logically the same.
  const queryRef = useRef(query);

  useEffect(() => {
    // Check if the query has actually changed.
    // This requires a proper way to compare queries, which Firestore SDK doesn't provide directly.
    // For simplicity, we'll compare the string representation, but be aware this might not be foolproof.
    // A more robust solution might involve comparing query parameters individually.
    if (queryRef.current.toString() !== query.toString()) {
       queryRef.current = query;
    }

  }, [query]);


  useEffect(() => {
    setState({ data: null, loading: true, error: null }); // Reset state on query change

    const unsubscribe = onSnapshot(
      queryRef.current,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        setState({ data, loading: false, error: null });
      },
      (error) => {
        console.error("Error fetching Firestore data:", error);
        setState({ data: null, loading: false, error });
      }
    );

    // Cleanup function to unsubscribe from the listener when the component unmounts or the query changes
    return () => unsubscribe();
  }, [queryRef.current]); // Re-run effect only when the stored query reference changes

  return state;
}
