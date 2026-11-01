import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { DistributionNode } from '../types';
import { MetricCard } from '../components/common/MetricCard';

export const SupplyChainPage: React.FC = () => {
  const [nodes, setNodes] = useState<DistributionNode[]>([]);

  useEffect(() => {
    async function loadNodes() {
      const data = await apiService.getDistributionNodes();
      setNodes(data);
    }
    loadNodes();
  }, []);

  return (
    <div className="w-full px-space-lg py-space-lg flex flex-col gap-space-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Supply Chain &amp; Distribution Mesh</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Custody transfer topology, warehouse telemetry hubs, and transit route nodes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        <MetricCard title="Monitored Logistics Nodes" value="4,821" subtitle="DCs, Carriers &amp; Retailers" icon="hub" />
        <MetricCard title="Active Cold Route Fleets" value="312" subtitle="Continuous GPS &amp; Temp Tracking" icon="local_shipping" />
        <MetricCard title="Telemetry Sync Rate" value="99.98%" subtitle="Zero Packet Loss in 48h" icon="sensors" />
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm p-space-md flex flex-col gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Active Distribution Facilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
          {nodes.map((node) => (
            <div key={node.nodeId} className="p-space-md rounded-lg bg-surface-container-low border border-surface-container flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-on-surface">{node.name}</span>
                <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold">
                  {node.nodeType.replace(/_/g, ' ')}
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-outline">{node.location} • GLN: {node.gln}</span>
              <div className="mt-2 flex items-center justify-between text-xs text-outline font-data-mono">
                <span>Active Shipments: {node.activeShipmentCount}</span>
                <span className="text-secondary font-semibold">Sensor Mesh Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

