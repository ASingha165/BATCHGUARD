import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { DistributionNode } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const SupplyChainPage: React.FC = () => {
  const { addToast } = useToast();
  const [nodes, setNodes] = useState<DistributionNode[]>([]);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedNode, setSelectedNode] = useState<DistributionNode | null>(null);

  useEffect(() => {
    async function loadNodes() {
      const data = await apiService.getDistributionNodes();
      setNodes(data);
    }
    loadNodes();
  }, []);

  const filteredNodes = selectedType === 'ALL'
    ? nodes
    : nodes.filter((n) => n.nodeType === selectedType);

  return (
    <div className="w-full px-space-md sm:px-space-lg py-space-lg flex flex-col gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Supply Chain &amp; Distribution Mesh</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Multi-node custody topology, real-time carrier telemetry, and cold storage warehouse hubs.
          </p>
        </div>
        <div className="flex items-center gap-space-xs">
          <Button
            variant="secondary"
            icon="refresh"
            onClick={() => addToast({ type: 'info', title: 'Telemetry Mesh Synced', description: 'Updated sensor logs across 4,821 active distribution points.' })}
          >
            Sync Telemetry Mesh
          </Button>
        </div>
      </div>

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        <MetricCard title="Monitored Logistics Nodes" value="4,821" subtitle="DCs, Carriers &amp; Retailers" icon="hub" />
        <MetricCard title="Active Cold Route Fleets" value="312" subtitle="Continuous GPS &amp; Temp Tracking" icon="local_shipping" />
        <MetricCard title="Telemetry Sync Rate" value="99.98%" subtitle="Zero Packet Loss in 48h" icon="sensors" />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'PRIMARY_DC', 'TRANSIT_FLEET', 'RETAIL_STORE'].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-3 py-1.5 rounded-lg font-label-md text-label-md font-medium transition-colors ${
              selectedType === type
                ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-surface-container'
            }`}
            type="button"
          >
            {type.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Logistics Hubs Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {filteredNodes.map((node) => (
          <div
            key={node.nodeId}
            onClick={() => setSelectedNode(node)}
            className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container hover:shadow-md cursor-pointer transition-all flex flex-col justify-between gap-3 group"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-data-mono-sm text-data-mono-sm text-primary font-bold">{node.nodeId}</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold uppercase">
                  {node.nodeType.replace(/_/g, ' ')}
                </span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold group-hover:text-primary transition-colors">
                {node.name}
              </h3>
              <p className="font-body-sm text-body-sm text-outline mt-0.5">{node.location} • GLN: {node.gln}</p>
            </div>

            <div className="pt-2 border-t border-surface-container flex items-center justify-between text-xs font-data-mono">
              <span className="text-outline">Active Shipments: <strong className="text-on-surface">{node.activeShipmentCount}</strong></span>
              <span className="text-secondary font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                Live Sensor Sync
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Simulated Map Visualizer */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-space-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">map</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Geographic Logistics Mesh</h2>
          </div>
          <span className="font-data-mono-sm text-xs text-outline">Real-time GPS Fleet Position</span>
        </div>

        {/* Visual Map Canvas Simulation */}
        <div className="w-full h-72 rounded-xl bg-slate-900 relative overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
          
          {/* Simulated node pins */}
          <div className="absolute top-1/3 left-1/4 flex flex-col items-center cursor-pointer group">
            <span className="w-4 h-4 rounded-full bg-secondary ring-4 ring-secondary/30 animate-pulse" />
            <span className="mt-1 px-2 py-0.5 rounded bg-slate-800 text-white text-[10px] font-mono border border-slate-700">
              Salinas Farm Hub
            </span>
          </div>

          <div className="absolute top-1/2 left-1/2 flex flex-col items-center cursor-pointer group">
            <span className="w-4 h-4 rounded-full bg-tertiary-fixed ring-4 ring-sky-400/30 animate-pulse" />
            <span className="mt-1 px-2 py-0.5 rounded bg-slate-800 text-white text-[10px] font-mono border border-slate-700">
              ColdRoute #204 (I-80)
            </span>
          </div>

          <div className="absolute top-1/4 right-1/4 flex flex-col items-center cursor-pointer group">
            <span className="w-4 h-4 rounded-full bg-error ring-4 ring-red-400/30 animate-pulse" />
            <span className="mt-1 px-2 py-0.5 rounded bg-slate-800 text-white text-[10px] font-mono border border-slate-700">
              Northeast DC (Newark)
            </span>
          </div>

          {/* SVG Connection line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 25 35 Q 50 40 50 50 T 75 25" fill="none" stroke="#10b981" strokeWidth="0.8" strokeDasharray="2,2" />
          </svg>
        </div>
      </div>

      {/* Node Detail Drawer Modal */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl border border-surface-container overflow-hidden p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{selectedNode.name}</span>
                <span className="font-data-mono-sm text-xs text-primary">{selectedNode.nodeId}</span>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-outline hover:text-on-surface" type="button">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between py-1 border-b border-surface-container/50">
                <span className="text-outline">Facility GLN:</span>
                <span className="font-data-mono font-medium">{selectedNode.gln}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-container/50">
                <span className="text-outline">Node Classification:</span>
                <span className="font-semibold">{selectedNode.nodeType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-container/50">
                <span className="text-outline">Location:</span>
                <span>{selectedNode.location}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-container/50">
                <span className="text-outline">Dispatch Contact:</span>
                <span className="font-mono text-xs">{selectedNode.contactEmail}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-outline">Active Pallet Count:</span>
                <span className="font-bold text-secondary">{selectedNode.activeShipmentCount} Pallets</span>
              </div>
            </div>

            <Button variant="primary" onClick={() => setSelectedNode(null)}>
              Close Facility Dossier
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
