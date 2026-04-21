import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';

export default function QuickActions({ bookings }) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/bookings?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <Link to="/bookings/new">
        <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
          <Plus className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </Link>
      <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm">
        <Input
          placeholder="Search by conf# or guest..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-secondary border-border text-foreground text-sm"
        />
        <Button type="submit" variant="outline" size="icon" className="flex-shrink-0">
          <Search className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}