import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PageNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <span className="text-6xl font-serif italic text-primary mb-4">404</span>
      <p className="text-lg text-muted-foreground mb-6">Page not found</p>
      <Link to="/">
        <Button variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}