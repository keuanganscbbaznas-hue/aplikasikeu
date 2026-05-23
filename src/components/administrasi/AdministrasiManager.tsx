import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DonationList } from './DonationList';
import { DonationSummaryReports } from './DonationSummaryReports';
import { Briefcase, ListFilter, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface AdministrasiManagerProps {
  isAdmin?: boolean;
}

export const AdministrasiManager = ({ isAdmin = false }: AdministrasiManagerProps) => {
  return (
    <div className="space-y-6 bg-slate-50/50 p-2 md:p-6 rounded-[2.5rem]">
      <div className="flex items-center gap-4 mb-2">
        <div className="h-12 w-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
          <Briefcase size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Laporan Donasi</h1>
          <p className="text-sm font-medium text-slate-500">Kelola dokumen dan konfirmasi donasi dalam satu tempat.</p>
        </div>
      </div>

      <Tabs defaultValue={isAdmin ? "list" : "none"} className="w-full">
        <TabsList className="bg-white/50 p-1.5 rounded-2xl h-auto flex flex-wrap shadow-sm border border-slate-100 mb-8">
          {isAdmin && (
            <>
              <TabsTrigger 
                value="list" 
                className="flex-1 py-3 px-6 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all gap-2"
              >
                <ListFilter size={14} />
                Semua Data
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="flex-1 py-3 px-6 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all gap-2"
              >
                <TrendingUp size={14} />
                Laporan Bulanan & Tahunan
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {isAdmin && (
            <>
              <TabsContent value="list">
                <DonationList />
              </TabsContent>
              <TabsContent value="reports">
                <DonationSummaryReports />
              </TabsContent>
            </>
          )}
        </motion.div>
      </Tabs>
    </div>
  );
};
