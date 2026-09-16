import React from 'react';
import { MonthlyDonationLedger } from './MonthlyDonationLedger';

interface AdministrasiManagerProps {
  isAdmin?: boolean;
}

export const AdministrasiManager = ({ isAdmin = false }: AdministrasiManagerProps) => {
  return (
    <div className="w-full">
      <MonthlyDonationLedger />
    </div>
  );
};

