import React from 'react';

type PlaceholderPageProps = {
  title: string;
  description: string;
  icon?: React.ElementType;
};

export function PlaceholderPage({ title, description, icon: Icon }: PlaceholderPageProps) {
  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-card p-12 text-center h-96">
        {Icon && <Icon className="h-16 w-16 text-muted-foreground mb-4" />}
        <h1 className="text-2xl font-bold font-headline tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-2 text-muted-foreground max-w-md">
          {description}
        </p>
      </div>
    </div>
  );
}
