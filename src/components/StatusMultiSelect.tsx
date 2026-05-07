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
        <DialogContent className="sm:max-w-md rounded-[2rem] p-5 border-none shadow-2xl bg-white max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-3 border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Filter size={18} />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight text-slate-900">Filter Status</DialogTitle>
                <DialogDescription className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Pilih status transaksi
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-3 space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input 
                placeholder="Cari status..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-slate-50 border-none rounded-xl text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>

            {selectedStatuses.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 max-h-24 overflow-y-auto">
                {selectedStatuses.map(status => (
                  <Badge 
                    key={status}
                    className="bg-primary text-white border-none rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-1"
                  >
                    {status}
                    <button onClick={(e) => { e.stopPropagation(); toggleStatus(status); }}>
                      <X size={8} className="hover:text-white/70" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <ScrollArea className="flex-1 pr-3 -mr-1">
              <div className="space-y-1 py-1">
                <div 
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    selectedStatuses.length === 0 ? 'bg-primary/5 border border-primary/20' : 'hover:bg-slate-50 border border-transparent'
                  }`}
                  onClick={() => onChange([])}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`h-4 w-4 rounded-md border flex items-center justify-center transition-all ${
                      selectedStatuses.length === 0 ? 'bg-primary border-primary' : 'border-slate-300'
                    }`}>
                      {selectedStatuses.length === 0 && <Check size={10} className="text-white stroke-[4]" />}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      selectedStatuses.length === 0 ? 'text-primary' : 'text-slate-500'
                    }`}>Semua Status</span>
                  </div>
                </div>

                {filteredStatuses.map(status => {
                  const isSelected = selectedStatuses.includes(status);
                  return (
                    <div 
                      key={status} 
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected ? 'bg-primary/5 border border-primary/20' : 'hover:bg-slate-50 border border-transparent'
                      }`}
                      onClick={() => toggleStatus(status)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`h-4 w-4 rounded-md border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-primary border-primary' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check size={10} className="text-white stroke-[4]" />}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-tight ${
                          isSelected ? 'text-primary' : 'text-slate-700'
                        }`}>{status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-slate-50 flex sm:justify-between items-center gap-2">
            <Button 
              variant="ghost" 
              onClick={() => onChange([])}
              className="h-8 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 rounded-lg px-3"
            >
              Reset
            </Button>
            <Button 
              onClick={() => setIsModalOpen(false)}
              className="h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase text-[9px] tracking-widest px-6 shadow-lg shadow-slate-200"
            >
              Terapkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
