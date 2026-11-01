import React from 'react';
import { Button } from '../components/common/Button';

export const SettingsPage: React.FC = () => {
  return (
    <div className="w-full px-space-lg py-space-lg flex flex-col gap-space-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">System Configuration &amp; Governance</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Organization metadata, AWS SNS emergency distribution lists, and automated EDI parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-space-md">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Tenant Organization</h2>
          <div className="flex flex-col gap-space-sm font-body-sm text-body-sm">
            <div>
              <label className="text-outline block mb-1">Organization Legal Name</label>
              <input
                type="text"
                defaultValue="Apex Nutrition Global, LLC"
                className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-on-surface outline-none"
                readOnly
              />
            </div>
            <div>
              <label className="text-outline block mb-1">FDA Food Facility Registration #</label>
              <input
                type="text"
                defaultValue="10829103981"
                className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-on-surface outline-none font-data-mono"
                readOnly
              />
            </div>
            <div>
              <label className="text-outline block mb-1">Primary Headquarters</label>
              <input
                type="text"
                defaultValue="Salinas, CA 93901"
                className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-on-surface outline-none"
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-space-md">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Emergency Recall Notification Channel</h2>
          <div className="flex flex-col gap-space-sm font-body-sm text-body-sm">
            <div>
              <label className="text-outline block mb-1">Amazon SNS Recall Topic ARN</label>
              <input
                type="text"
                defaultValue="arn:aws:sns:us-east-1:123456789012:batchguard-recall-notifications-dev"
                className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-on-surface outline-none font-data-mono text-xs"
                readOnly
              />
            </div>
            <div>
              <label className="text-outline block mb-1">2FA Security Policy</label>
              <div className="p-space-sm rounded-lg bg-surface-container flex items-center justify-between">
                <span>Mandatory cryptographic token before recall</span>
                <span className="text-secondary font-bold">ENFORCED</span>
              </div>
            </div>
          </div>
          <div className="mt-auto pt-space-sm">
            <Button variant="secondary" size="sm">
              Manage Security Keys
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

