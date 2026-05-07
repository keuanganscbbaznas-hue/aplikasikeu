import React, { useState } from 'react';
import { ChevronDown, Clock, Search, X, Check, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

export const StatusMultiSelect = ({ 
  allStatuses, 
  selectedStatuses, 
  onChange 
}: { 
  allStatuses: string[], 
  selectedStatuses: string[], 
  onChange: (statuses: string[]) => void 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onChange(selectedStatuses.filter(s => s !== status));
    } else {
      onChange([...selectedStatuses, status]);
    }
  };

  const filteredStatuses = allStatuses.filter(s => 
    s.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Button 
        type="button"
        variant="outline"
        onClick={() => setIsModalOpen(true)}
        className="h-8 bg-slate-50 border-none rounded-lg text-[11px] font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all justify-start w-full px-2"
      >
        <Clock size={14} className="text-slate-400 mr-2" />
        <span className="truncate flex-1 text-left">
          {selectedStatuses.length === 0 ? "Pilih Status" : `${selectedStatuses.length} Status Terpilih`}
        </span>
        <ChevronDown size={14} className="ml-1 text-slate-400" />
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[300px] rounded-[2.2rem] p-3 border-none shadow-3xl bg-white max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                <Filter size={14} />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-sm font-black tracking-tight text-slate-900 leading-none">Filter Status</DialogTitle>
                <DialogDescription className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                  Pilih Tahapan Alur
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-2 space-y-2 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
              <Input 
                placeholder="Cari..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 h-7 bg-slate-50 border-none rounded-lg text-[9px] font-bold focus-visible:ring-2 focus-visible:ring-emerald-500/20"
              />
            </div>

            {selectedStatuses.length > 0 && (
              <div className="flex flex-wrap gap-0.5 p-0.5 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 overflow-x-auto whitespace-nowrap hide-scrollbar">
                {selectedStatuses.map(status => (
                  <Badge 
                    key={status}
                    className="bg-emerald-600 text-white border-none rounded-md px-1 py-0 text-[7px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0"
                  >
                    {status.split(' ').slice(0, 2).join(' ')}...
                    <button onClick={(e) => { e.stopPropagation(); toggleStatus(status); }}>
                      <X size={6} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <ScrollArea className="flex-1 pr-2 -mr-1">
              <div className="space-y-0.5 py-1 relative">
                {/* Vertical Progress Line */}
                <div className="absolute left-[13px] top-6 bottom-6 w-[1.5px] bg-slate-100 hidden sm:block" />

                <div 
                  className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-all ${
                    selectedStatuses.length === 0 ? 'bg-emerald-50' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => onChange([])}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-all z-10 ${
                      selectedStatuses.length === 0 ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300'
                    }`}>
                      {selectedStatuses.length === 0 && <Check size={8} className="text-white stroke-[4]" />}
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${
                      selectedStatuses.length === 0 ? 'text-emerald-700' : 'text-slate-400'
                    }`}>SEMUA STATUS</span>
                  </div>
                </div>

                {filteredStatuses.map((status, index) => {
                  const isSelected = selectedStatuses.includes(status);
                  return (
                    <div 
                      key={status} 
                      className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => toggleStatus(status)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-all z-10 ${
                          isSelected ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300'
                        }`}>
                          {isSelected && <Check size={8} className="text-white stroke-[4]" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[6px] font-bold text-slate-300 uppercase leading-none mb-0.5">#{ (index + 1).toString().padStart(2, '0') }</span>
                          <span className={`text-[8px] font-bold uppercase tracking-tight leading-none ${
                            isSelected ? 'text-emerald-700' : 'text-slate-700'
                          }`}>{status}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="mt-2 pt-2 border-t border-slate-50 flex flex-row justify-between items-center bg-white">
            <Button 
              variant="ghost" 
              onClick={() => onChange([])}
              className="h-6 text-[7px] font-black uppercase tracking-widest text-slate-400 p-0 hover:bg-transparent"
            >
              RESET
            </Button>
            <Button 
              onClick={() => setIsModalOpen(false)}
              className="h-7 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-black uppercase text-[8px] tracking-widest px-4 shadow-md"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
