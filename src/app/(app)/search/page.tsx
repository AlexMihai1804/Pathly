'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search as SearchIcon } from 'lucide-react';

export default function SearchPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search logic (e.g., navigate to a results page or filter Discover)
    console.log('Searching for:', searchTerm);
     // Example: Redirect to discover with search query
     if (searchTerm.trim()) {
       router.push(`/discover?q=${encodeURIComponent(searchTerm.trim())}`);
     }
  };

  if (authLoading) {
    return <div className="p-4">Loading...</div>; // Or a skeleton loader
  }

  return (
    <div className="p-4 pt-10">
      <h1 className="text-2xl font-bold mb-6 text-center text-primary">Search Destinations & Activities</h1>
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <Input
          type="search"
          placeholder="Search for places or activities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
        />
        <Button type="submit" size="icon">
          <SearchIcon className="h-4 w-4" />
          <span className="sr-only">Search</span>
        </Button>
      </form>

      {/* Placeholder for recent searches or suggested searches */}
       <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Enter a destination, attraction, or type of activity to find inspiration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
