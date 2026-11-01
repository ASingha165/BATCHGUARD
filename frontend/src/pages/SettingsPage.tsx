import React from 'react';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const SettingsPage: React.FC = () => {
  const { addToast } = useToast();

  const handleSaveSettings = () => {
    addToast({
      type: 'success',
      title: 'Settings Saved',
      description: 'Tenant organization parameters and notification routing updated.',
    });
  };

  return (
    <div className="w-full px-space-md sm:px-space-lg py-space-lg flex flex-col gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">System Configuration &amp; Governance</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Organization metadata, AWS SNS emergency distribution lists, and automated EDI parameters.
          </p>
        </div>
        <Button variant="primary" icon="save" onClick={handleSaveSettings}>
          Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {/* Tenant Profile */}
        <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">corporate_fare</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Tenant Organization</h2>
          </div>
          <div className="flex flex-col gap-space-sm font-body-sm text-body-sm">
            <div>
              <label className="text-outline block mb-1">Organization Legal Name</label>
              <input
                type="text"
                defaultValue="Apex Nutrition Global, LLC"
                className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-lowest text-on-surface outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-outline block mb-1">FDA Food Facility Registration #</label>
              <input
                type="text"
                defaultValue="10829103981"
                className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-lowest text-on-surface outline-none font-data-mono focus:border-primary"
              />
            </div>
            <div>
              <label className="text-outline block mb-1">Primary Operational Headquarters</label>
              <input
                type="text"
                defaultValue="Salinas, CA 93901"
                className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-lowest text-on-surface outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* AWS Infrastructure & Security */}
        <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">cloud_sync</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">AWS Serverless Integration Targets</h2>
          </div>
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
              <label className="text-outline block mb-1">DynamoDB Table Name</label>
              <input
                type="text"
                defaultValue="BatchGuard-Main-dev"
                className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-on-surface outline-none font-data-mono text-xs"
                readOnly
              />
            </div>
            <div>
              <label className="text-outline block mb-1">Two-Factor Authentication Security Policy</label>
              <div className="p-space-sm rounded-lg bg-surface-container-low border border-surface-container flex items-center justify-between">
                <div>
                  <span className="font-semibold block text-on-surface">Mandatory Cryptographic MFA for Recalls</span>
                  <span className="text-xs text-outline">Enforces dynamic security tokens before executing Step Functions</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm font-bold">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
