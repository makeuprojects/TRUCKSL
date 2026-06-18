import React from 'react';
import DashboardDonSaul from './DashboardDonSaul';

interface AdminDashboardProps {
  token: string;
}

export default function AdminDashboard({ token }: AdminDashboardProps) {
  return <DashboardDonSaul token={token} />;
}
