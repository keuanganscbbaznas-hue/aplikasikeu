import React, { useState } from 'react';
import { ChevronDown, Filter, Search, X, Check } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

export interface Option {
  id: string;
  label: string;
}

export const GenericMultiSelect = ({ 
  title,
  subtitle,
  placeholder,
  options, 
  selectedValues, 
  onChange,
  icon: Icon = Filter
}: { 
  title: string;
  subtitle: string;
  placeholder: string;
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  icon?: any;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    o.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Button 
        type="button"
        variant="outline"
        onClick={() => setIsModalOpen(true)}
        className="h-8 bg-slate-50 border-none rounded-lg text-[11px] font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all justify-start w-full px-2"
      >
        <Icon size={14} className="text-slate-400 mr-2 shrink-0" />
        <span className="truncate flex-1 text-left">
          {selectedValues.length === 0 ? placeholder : `${selectedValues.length} Terpilih`}
        </span>
        <ChevronDown size={14} className="ml-1 text-slate-400 shrink-0" />
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[280px] rounded-[2.2rem] p-3 border-none shadow-3xl bg-white max-h-[75vh] overflow-hidden flex flex-col gap-0">
          <DialogHeader className="pb-2 border-b border-slate-50 mb-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                <Icon size={14} />
              </div>
              <div className="flex flex-col text-left">
                <DialogTitle className="text-sm font-black tracking-tight text-slate-900 leading-none">{title}</DialogTitle>
                <DialogDescription className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                  {subtitle}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <div className="relative mb-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
              <Input 
                 placeholder="Cari..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="pl-7 h-7 bg-slate-50 border-none rounded-lg text-[9px] font-bold focus-visible:ring-2 focus-visible:ring-emerald-500/20"
              />
            </div>

            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-0.5 p-1 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 max-h-12 overflow-y-auto hide-scrollbar mb-1">
                {selectedValues.map(val => {
                  const opt = options.find(o => o.id === val);
                  return (
                    <Badge 
                      key={val}
                      className="bg-emerald-600 text-white border-none rounded-md px-1 py-0 text-[7px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0"
                    >
                      {(opt?.label || val).split(' ').slice(0, 1).join(' ')}...
                      <button onClick={(e) => { e.stopPropagation(); toggleValue(val); }}>
                        <X size={6} />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-1 -mr-1 custom-scrollbar">
              <div className="space-y-0.5 py-1 relative">
                <div 
                  className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-all ${
                    selectedValues.length === 0 ? 'bg-emerald-50' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => onChange([])}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-all z-10 ${
                      selectedValues.length === 0 ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300'
                    }`}>
                      {selectedValues.length === 0 && <Check size={8} className="text-white stroke-[4]" />}
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${
                      selectedValues.length === 0 ? 'text-emerald-700' : 'text-slate-400'
                    }`}>SEMUA PILIHAN</span>
                  </div>
                </div>

                {filteredOptions.map((opt, index) => {
                  const isSelected = selectedValues.includes(opt.id);
                  return (
                    <div 
                      key={opt.id} 
                      className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => toggleValue(opt.id)}
                    >
                      <div className="flex items-center gap-2 text-left">
                        <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-all z-10 shrink-0 ${
                          isSelected ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300'
                        }`}>
                          {isSelected && <Check size={8} className="text-white stroke-[4]" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-[8px] font-bold uppercase tracking-tight leading-none truncate ${
                            isSelected ? 'text-emerald-700' : 'text-slate-700'
                          }`}>{opt.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2 pt-2 border-t border-slate-50 flex flex-row justify-between items-center bg-white">
            <Button 
              variant="ghost" 
              onClick={() => onChange([])}
              className="h-6 text-[7px] font-black uppercase tracking-widest text-slate-400 p-0 hover:bg-transparent hover:text-slate-600"
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
