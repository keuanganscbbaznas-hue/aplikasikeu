import React, { useState } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const StatusMultiSelect = ({ 
  allStatuses, 
  selectedStatuses, 
  onChange 
}: { 
  allStatuses: string[], 
  selectedStatuses: string[], 
  onChange: (statuses: string[]) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onChange(selectedStatuses.filter(s => s !== status));
    } else {
      onChange([...selectedStatuses, status]);
    }
  };

  return (
    <div className="relative">
      <Button 
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 bg-slate-50 border-none rounded-lg text-[11px] font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all justify-start w-full px-2"
      >
        <Clock size={14} className="text-slate-400 mr-2" />
        {selectedStatuses.length === 0 ? "Pilih Status" : `${selectedStatuses.length} Status Terpilih`}
        <ChevronDown size={14} className="ml-auto" />
      </Button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-slate-100 p-2 max-h-60 overflow-y-auto">
          <div className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer" onClick={() => onChange([])}>
             <input type="checkbox" checked={selectedStatuses.length === 0} readOnly />
             <span className="text-xs font-bold uppercase ml-2">SEMUA STATUS</span>
          </div>
          {allStatuses.map(status => (
            <div key={status} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer" onClick={() => toggleStatus(status)}>
              <input type="checkbox" checked={selectedStatuses.includes(status)} readOnly />
              <span className="text-xs font-bold uppercase ml-2">{status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
