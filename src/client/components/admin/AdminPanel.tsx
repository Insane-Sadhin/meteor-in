import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Database,
  Terminal,
  Cpu,
  History,
  CheckCircle,
  XCircle,
  Merge,
  RefreshCw,
  Server,
  Zap,
} from 'lucide-react';
import {
  CitizenReportItem,
  DataSourceItem,
  SystemHealthData,
  IngestionLog,
  WeatherEventItem,
} from '../../types/index.ts';
import {
  fetchReports,
  fetchSources,
  fetchSystemHealth,
  fetchIngestionLogs,
  fetchAuditLogs,
  updateReportStatus,
  mergeDuplicateReports,
  dismissWeatherEvent,
  triggerManualIngestion,
} from '../../utils/api.ts';
import {
  formatISTDateTime,
  formatISTTime,
  getVerificationBadge,
  getSourceStatusStyle,
  getSeverityBadge,
} from '../../utils/formatters.ts';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshAll: () => Promise<void>;
}

type AdminTab = 'overview' | 'reports' | 'verification' | 'events' | 'sources' | 'ingestion' | 'health' | 'audit';

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, onRefreshAll }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const [reports, setReports] = useState<CitizenReportItem[]>([]);
  const [sources, setSources] = useState<DataSourceItem[]>([]);
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Merge modal state
  const [mergePrimaryId, setMergePrimaryId] = useState<number | null>(null);
  const [mergeDuplicateId, setMergeDuplicateId] = useState<number | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [repsRes, srcsRes, healthRes, logsRes, auditRes] = await Promise.all([
        fetchReports(),
        fetchSources(),
        fetchSystemHealth(),
        fetchIngestionLogs(),
        fetchAuditLogs(),
      ]);

      setReports(repsRes.reports || []);
      setSources(srcsRes.sources || []);
      setHealth(healthRes);
      setLogs(logsRes.logs || []);
      setAuditLogs(auditRes.logs || []);
    } catch (err: any) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAdminData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showActionToast = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await updateReportStatus(id, status, 'Admin operational decision');
      showActionToast(`Report #${id} marked as ${status}`);
      await loadAdminData();
      await onRefreshAll();
    } catch (err: any) {
      alert(`Error updating report: ${err.message}`);
    }
  };

  const handleMerge = async () => {
    if (!mergePrimaryId || !mergeDuplicateId) return;
    try {
      await mergeDuplicateReports(mergePrimaryId, mergeDuplicateId);
      showActionToast(`Report #${mergeDuplicateId} merged into Report #${mergePrimaryId}`);
      setMergePrimaryId(null);
      setMergeDuplicateId(null);
      await loadAdminData();
      await onRefreshAll();
    } catch (err: any) {
      alert(`Error merging reports: ${err.message}`);
    }
  };

  const handleDismissEvent = async (id: number) => {
    try {
      await dismissWeatherEvent(id, 'Acknowledged and stood down by operations');
      showActionToast(`Event #${id} acknowledged and dismissed`);
      await loadAdminData();
      await onRefreshAll();
    } catch (err: any) {
      alert(`Error dismissing event: ${err.message}`);
    }
  };

  const handleTriggerIngestion = async () => {
    try {
      showActionToast('Initiating manual ingestion cycle...');
      await triggerManualIngestion();
      showActionToast('Manual ingestion completed successfully');
      await loadAdminData();
      await onRefreshAll();
    } catch (err: any) {
      alert(`Ingestion failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden font-mono text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Admin Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0b1324]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-sky-950 border border-sky-600/50 text-sky-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white uppercase text-sm tracking-wider">
                  METEOROLOGICAL OPERATIONS & INTELLIGENCE CENTER
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                  ACTIVE SESSION
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                National Weather Data Pipeline Control, Ground-Truth Verification & Health Diagnostics
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadAdminData}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh Admin Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Toast */}
        {actionMessage && (
          <div className="bg-emerald-950 border-b border-emerald-800 px-4 py-2 text-emerald-200 text-xs flex items-center space-x-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Admin Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-1 px-4 py-2 bg-[#0c1424] border-b border-slate-800 select-none overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'reports', label: `Citizen Reports (${reports.length})`, icon: FileText },
            { id: 'verification', label: 'Ground-Truth Verification', icon: ShieldCheck },
            { id: 'sources', label: 'Data Sources & Adapters', icon: Database },
            { id: 'ingestion', label: 'Ingestion Pipeline & Logs', icon: Terminal },
            { id: 'health', label: 'System Health & Metrics', icon: Server },
            { id: 'audit', label: 'Audit Trail', icon: History },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#090f1d]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#111c30] p-4 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px] mb-1">TOTAL OBSERVATIONS INGESTED</div>
                  <div className="text-2xl font-bold text-white">{health?.database.totalObservations ?? 'N/A'}</div>
                  <div className="text-[10px] text-emerald-400 mt-1">PostgreSQL Timeseries Engine</div>
                </div>

                <div className="bg-[#111c30] p-4 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px] mb-1">CITIZEN REPORTS LOGGED</div>
                  <div className="text-2xl font-bold text-white">{reports.length}</div>
                  <div className="text-[10px] text-sky-400 mt-1">
                    {reports.filter(r => r.status === 'VERIFIED').length} Correlated with ground truth
                  </div>
                </div>

                <div className="bg-[#111c30] p-4 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px] mb-1">ACTIVE DATA SOURCES</div>
                  <div className="text-2xl font-bold text-white">
                    {sources.filter(s => s.api_status === 'ONLINE').length} / {sources.length}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Open-Meteo Primary Online</div>
                </div>

                <div className="bg-[#111c30] p-4 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px] mb-1">REAL-TIME SSE SUBSCRIBERS</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {health?.realtime.activeConnections ?? 1}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-1">Zero-Reload Live Streaming</div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-[#111c30] p-4 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-white text-xs uppercase">Manual Ingestion Control</h4>
                  <p className="text-[11px] text-slate-400">
                    Trigger an out-of-cycle synchronization across all 51 Indian meteorological observation stations.
                  </p>
                </div>
                <button
                  onClick={handleTriggerIngestion}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium shadow transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Execute Sync Now</span>
                </button>
              </div>

              {/* Ingestion Pipeline Summary */}
              <div className="bg-[#111c30] p-4 rounded-lg border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-xs uppercase flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-sky-400" />
                  <span>Latest Pipeline Execution</span>
                </h4>
                {logs.length > 0 ? (
                  <div className="p-3 bg-[#0a1120] rounded border border-slate-800 font-mono text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Source: <strong className="text-white">{logs[0].source}</strong></span>
                      <span>Target: <strong className="text-white">{logs[0].location}</strong></span>
                      <span>HTTP Status: <strong className="text-emerald-400">{logs[0].http_code}</strong></span>
                    </div>
                    <div className="text-slate-300">Message: {logs[0].message}</div>
                    <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800 text-[10px]">
                      <span>Latency: {logs[0].duration_ms}ms</span>
                      <span>Timestamp: {formatISTDateTime(logs[0].created_at)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">No ingestion logs recorded yet.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CITIZEN REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs uppercase">Crowdsourced Citizen Meteorological Reports</h4>
                  <p className="text-[11px] text-slate-400">
                    Review incoming reports, inspect ground-truth correlation, confirm or reject, and merge duplicate sightings.
                  </p>
                </div>
              </div>

              {/* Merge Dialog if active */}
              {mergeDuplicateId && (
                <div className="p-3 bg-purple-950/80 border border-purple-800 rounded-lg flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-2">
                    <Merge className="w-4 h-4 text-purple-400" />
                    <span>
                      Merge duplicate Report #{mergeDuplicateId} into primary Report #
                      <input
                        type="number"
                        placeholder="Primary ID"
                        value={mergePrimaryId || ''}
                        onChange={e => setMergePrimaryId(parseInt(e.target.value, 10))}
                        className="w-20 px-2 py-0.5 ml-2 bg-slate-900 border border-purple-700 rounded text-white"
                      />
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleMerge}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium"
                    >
                      Confirm Merge
                    </button>
                    <button
                      onClick={() => setMergeDuplicateId(null)}
                      className="px-2 py-1 bg-slate-800 text-slate-300 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-[#111c30] border border-slate-800 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-[#0b1324] text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">ID</th>
                      <th className="py-2 px-3">EVENT / LOCATION</th>
                      <th className="py-2 px-3">DESCRIPTION</th>
                      <th className="py-2 px-3">REPORTER</th>
                      <th className="py-2 px-3">STATUS</th>
                      <th className="py-2 px-3">CORRELATION</th>
                      <th className="py-2 px-3">REPORTED (IST)</th>
                      <th className="py-2 px-3 text-right">ADMIN ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          No citizen reports submitted yet.
                        </td>
                      </tr>
                    ) : (
                      reports.map(rep => {
                        const badge = getVerificationBadge(rep.status);
                        return (
                          <tr key={rep.id} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3 font-bold text-white">#{rep.id}</td>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-sky-300">{rep.event_type}</div>
                              <div className="text-[10px] text-slate-400">{rep.location_name}</div>
                            </td>
                            <td className="py-2 px-3 max-w-[220px]">
                              <p className="truncate" title={rep.description}>{rep.description}</p>
                            </td>
                            <td className="py-2 px-3 text-slate-300">{rep.reporter_name}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] border ${badge.bg} ${badge.text} ${badge.border}`}>
                                {rep.status}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {rep.verification_status ? (
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-emerald-400">
                                    {rep.verification_status} ({Math.round((rep.verification_confidence || 0) * 100)}%)
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {rep.distance_km} km away
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-500">Pending</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                              {formatISTTime(rep.observed_at)}
                            </td>
                            <td className="py-2 px-3 text-right whitespace-nowrap space-x-1">
                              {rep.status !== 'VERIFIED' && (
                                <button
                                  onClick={() => handleUpdateStatus(rep.id, 'VERIFIED')}
                                  className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900"
                                  title="Manually Verify"
                                >
                                  Verify
                                </button>
                              )}
                              {rep.status !== 'REJECTED' && (
                                <button
                                  onClick={() => handleUpdateStatus(rep.id, 'REJECTED')}
                                  className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 hover:bg-rose-900"
                                  title="Reject Report"
                                >
                                  Reject
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setMergeDuplicateId(rep.id);
                                  setMergePrimaryId(rep.duplicate_of_id || null);
                                }}
                                className="px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800 hover:bg-purple-900"
                                title="Merge with duplicate"
                              >
                                Merge
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: GROUND-TRUTH VERIFICATION */}
          {activeTab === 'verification' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-white text-xs uppercase">Ground-Truth Verification Engine Records</h4>
                <p className="text-[11px] text-slate-400">
                  Automated correlation matrix calculating geospatial distance, temporal delta, and weather physical consistency.
                </p>
              </div>

              <div className="space-y-3">
                {reports.filter(r => r.verification_rationale).length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-[#111c30] rounded-lg border border-slate-800">
                    No verification records logged yet. Submit a citizen report to test the correlation engine.
                  </div>
                ) : (
                  reports
                    .filter(r => r.verification_rationale)
                    .map(r => (
                      <div key={r.id} className="bg-[#111c30] border border-slate-800 rounded-lg p-3.5 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white">Report #{r.id}: {r.event_type}</span>
                            <span className="text-slate-400">&bull;</span>
                            <span className="text-slate-300">{r.location_name}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.verification_status === 'CORRELATED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {r.verification_status} ({Math.round((r.verification_confidence || 0) * 100)}% Confidence)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] text-slate-400">
                          <div>Proximity: <strong className="text-slate-200">{r.distance_km} km</strong></div>
                          <div>Temporal Delta: <strong className="text-slate-200">{r.time_diff_minutes} minutes</strong></div>
                          <div>Status: <strong className="text-emerald-400">{r.status}</strong></div>
                        </div>

                        <div className="p-2.5 bg-[#090f1d] border border-slate-800 rounded text-slate-300 text-[11px] leading-relaxed">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Verification Rationale:</div>
                          {r.verification_rationale}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: DATA SOURCES */}
          {activeTab === 'sources' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-white text-xs uppercase">National Data Sources & Provider Adapters</h4>
                <p className="text-[11px] text-slate-400">
                  Registry of external meteorological, environmental, and government data providers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sources.map(src => {
                  const statusStyle = getSourceStatusStyle(src.api_status);
                  return (
                    <div key={src.id} className="bg-[#111c30] border border-slate-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-white text-xs">{src.name}</h5>
                          <span className="text-[10px] font-mono text-slate-400">{src.code} &bull; Type: {src.type}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 font-bold">
                          <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`}></span>
                          <span className={statusStyle.text}>{src.api_status}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 bg-[#090f1d] p-2.5 rounded border border-slate-800">
                        <div>Latency: <strong className="text-slate-200">{src.latency_ms}ms</strong></div>
                        <div>Total Records: <strong className="text-slate-200">{src.records_count}</strong></div>
                        <div>Last Success: <strong className="text-slate-200">{formatISTTime(src.last_success_at)}</strong></div>
                        <div>Status: <strong className={statusStyle.text}>{src.api_status}</strong></div>
                      </div>

                      {src.id === 'openaq' && src.api_status === 'CONFIG_REQUIRED' && (
                        <div className="p-2 bg-amber-950/60 border border-amber-800/80 rounded text-amber-300 text-[10px]">
                          OPENAQ CONFIGURATION REQUIRED: Configure server environment credentials to enable live particulate (PM2.5, PM10) environmental data ingestion.
                        </div>
                      )}

                      {src.id === 'imd' && (
                        <div className="p-2 bg-slate-900 border border-slate-800 rounded text-slate-400 text-[10px]">
                          Official IMD transport adapter ready for integration when government AWS/GIS certificates are provisioned. Undocumented endpoints are not fabricated.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: INGESTION LOGS */}
          {activeTab === 'ingestion' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs uppercase">Live Ingestion Telemetry & Execution Logs</h4>
                  <p className="text-[11px] text-slate-400">
                    Real-time audit log of external API fetches, batch sizes, HTTP status codes, and execution latencies.
                  </p>
                </div>
                <button
                  onClick={handleTriggerIngestion}
                  className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium"
                >
                  Trigger Ingestion Cycle
                </button>
              </div>

              <div className="bg-[#111c30] border border-slate-800 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#0b1324] text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">TIMESTAMP (IST)</th>
                      <th className="py-2 px-3">SOURCE</th>
                      <th className="py-2 px-3">LOCATION TARGET</th>
                      <th className="py-2 px-3">STATUS</th>
                      <th className="py-2 px-3">HTTP</th>
                      <th className="py-2 px-3">RECORDS</th>
                      <th className="py-2 px-3">LATENCY</th>
                      <th className="py-2 px-3">MESSAGE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {logs.map(l => (
                      <tr key={l.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{formatISTDateTime(l.created_at)}</td>
                        <td className="py-2 px-3 font-semibold text-white">{l.source}</td>
                        <td className="py-2 px-3 text-slate-300">{l.location}</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            l.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono">{l.http_code}</td>
                        <td className="py-2 px-3 font-mono">{l.records_count}</td>
                        <td className="py-2 px-3 font-mono">{l.duration_ms}ms</td>
                        <td className="py-2 px-3 text-slate-400">{l.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: SYSTEM HEALTH */}
          {activeTab === 'health' && health && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-white text-xs uppercase">Authentic Backend Telemetry & Diagnostic Health</h4>
                <p className="text-[11px] text-slate-400">
                  Genuine system metrics extracted directly from the runtime server process and PostgreSQL storage engine.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Database Metrics */}
                <div className="bg-[#111c30] p-4 rounded-lg border border-slate-800 space-y-2">
                  <h5 className="font-bold text-white uppercase text-xs flex items-center space-x-2">
                    <Database className="w-4 h-4 text-sky-400" />
                    <span>Database Engine Status</span>
                  </h5>
                  <div className="space-y-1 text-slate-300 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Engine:</span>
                      <span className="font-semibold text-white">{health.database.engine}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Connection Status:</span>
                      <span className="font-semibold text-emerald-400">{health.database.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ping Latency:</span>
                      <span className="font-semibold text-sky-300">{health.database.queryLatencyMs}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Observations:</span>
                      <span className="font-semibold text-white">{health.database.totalObservations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active System Events:</span>
                      <span className="font-semibold text-amber-300">{health.database.activeEvents}</span>
                    </div>
                  </div>
                </div>

                {/* Runtime & Process Metrics */}
                <div className="bg-[#111c30] p-4 rounded-lg border border-slate-800 space-y-2">
                  <h5 className="font-bold text-white uppercase text-xs flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-teal-400" />
                    <span>Server Runtime Diagnostics</span>
                  </h5>
                  <div className="space-y-1 text-slate-300 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Node Runtime:</span>
                      <span className="font-semibold text-white">{health.system.nodeVersion} ({health.system.platform})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Server Uptime:</span>
                      <span className="font-semibold text-slate-200">{health.system.uptimeSeconds} seconds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Process Memory (RSS):</span>
                      <span className="font-semibold text-slate-200">{health.system.memoryRssMb} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">V8 Heap Used:</span>
                      <span className="font-semibold text-slate-200">{health.system.memoryHeapUsedMb} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Realtime SSE Stream:</span>
                      <span className="font-semibold text-emerald-400">
                        {health.realtime.transport} ({health.realtime.activeConnections} active)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-white text-xs uppercase">Operations Audit Trail</h4>
                <p className="text-[11px] text-slate-400">
                  Immutable security and operations log of all citizen submissions, admin verifications, and merges.
                </p>
              </div>

              <div className="bg-[#111c30] border border-slate-800 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#0b1324] text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">TIMESTAMP</th>
                      <th className="py-2 px-3">ACTION</th>
                      <th className="py-2 px-3">ACTOR</th>
                      <th className="py-2 px-3">ENTITY</th>
                      <th className="py-2 px-3">DETAILS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No audit entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map(a => (
                        <tr key={a.id} className="hover:bg-slate-800/40">
                          <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{formatISTDateTime(a.created_at)}</td>
                          <td className="py-2 px-3 font-semibold text-sky-300">{a.action}</td>
                          <td className="py-2 px-3 text-white">{a.actor}</td>
                          <td className="py-2 px-3 text-slate-400">{a.entity_type} #{a.entity_id}</td>
                          <td className="py-2 px-3 text-slate-300">{a.details}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
