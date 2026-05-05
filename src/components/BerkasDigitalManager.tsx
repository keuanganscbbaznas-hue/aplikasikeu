
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, ExternalLink } from 'lucide-react';

const DRIVE_LINKS = {
  '2022': 'https://drive.google.com/drive/folders/1...2022...',
  '2023': 'https://drive.google.com/drive/folders/1...2023...',
  '2024': 'https://drive.google.com/drive/folders/1...2024...',
  '2025': 'https://drive.google.com/drive/folders/1...2025...',
  '2026': 'https://drive.google.com/drive/folders/1...2026...',
};

export const BerkasDigitalManager = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(DRIVE_LINKS).map(([year, url]) => (
          <Card key={year} className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-lg font-black tracking-tight">{year}</CardTitle>
              <FolderOpen className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-700 mt-2"
              >
                Buka Folder Drive <ExternalLink size={14} />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
