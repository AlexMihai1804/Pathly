'use client';

import { useState, useEffect, useRef } from 'react';
// Ensure onSnapshot is imported
import { onSnapshot, Query, DocumentData, QuerySnapshot } from 'firebase/firestore';

interface FirestoreQueryState<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}

export function useFirestoreQuery<T>(query: Query<DocumentData> | null): FirestoreQueryState<T> { // Allow null query
  const [state, setState] = useState<FirestoreQueryState<T>>({
    data: null,
    loading: true, // Start loading initially
    error: null,
  });

  // Use useRef to store the query. Initialize with the initial query prop.
  const queryRef = useRef(query);

  useEffect(() => {
    // Check if the query has actually changed.
    // Compare string representations as a simple check.
    const currentQueryString = query ? query.toString() : 'null';
    const prevQueryString = queryRef.current ? queryRef.current.toString() : 'null';

    if (prevQueryString !== currentQueryString) {
       queryRef.current = query;
        // Reset state only when the query *actually* changes or becomes null/valid
        setState({ data: null, loading: !!query, error: null });
    } else if (!query && !state.loading) {
        // If query becomes null and we weren't already loading, clear data
        setState({ data: null, loading: false, error: null });
    }

  }, [query, state.loading]); // Add state.loading to dependencies

  useEffect(() => {
     if (!queryRef.current) {
        // If the query is null, ensure loading is false and data is null
        if (state.loading || state.data !== null || state.error !== null) {
             setState({ data: null, loading: false, error: null });
        }
        return; // No query to subscribe to
     }

      // Set loading to true when a valid query is present and we are starting the effect
      if (!state.loading) {
         setState(prevState => ({ ...prevState, loading: true, error: null }));
      }


    const unsubscribe = onSnapshot(
      queryRef.current, // Use the stored ref
      (snapshot: QuerySnapshot<DocumentData>) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
         // Check if component is still mounted (optional, for strict mode safety)
        setState({ data, loading: false, error: null });
      },
      (error) => {
        console.error("Error fetching Firestore data:", error);
         // Check if component is still mounted
        setState({ data: null, loading: false, error });
      }
    );

    // Cleanup function to unsubscribe from the listener
    return () => unsubscribe();
  }, [queryRef.current]); // Re-run effect only when the stored query ref changes

  return state;
}
