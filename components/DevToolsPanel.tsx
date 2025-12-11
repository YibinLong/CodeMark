'use client';

/**
 * Development utilities panel for debugging and state inspection
 * Only visible when NEXT_PUBLIC_ENABLE_DEVTOOLS=true
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Download, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ClientLogger,
  ClientLogLevel,
  ClientLogNamespace,
  LogEntry,
} from '@/lib/clientLogger';
import { clientCorrelationManager } from '@/lib/correlation';
import { useReviewStore } from '@/lib/stores/reviewStore';

interface DevToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DevToolsPanel({ isOpen, onClose }: DevToolsPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterText, setFilterText] = useState('');
  const [filterLevel, setFilterLevel] = useState<ClientLogLevel | 'all'>('all');
  const [filterNamespace, setFilterNamespace] = useState<ClientLogNamespace | 'all'>('all');

  // Refresh logs periodically
  useEffect(() => {
    if (!isOpen) return;

    const refreshLogs = () => {
      setLogs(ClientLogger.getAllLogs());
    };

    refreshLogs();
    const interval = setInterval(refreshLogs, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (filterNamespace !== 'all' && log.namespace !== filterNamespace) return false;
    if (filterText && !log.message.toLowerCase().includes(filterText.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Download logs as JSON
  const downloadLogsJSON = useCallback(() => {
    const json = ClientLogger.exportLogsAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codemark-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Download logs as text
  const downloadLogsText = useCallback(() => {
    const text = ClientLogger.exportLogsAsText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codemark-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Clear logs
  const clearLogs = useCallback(() => {
    ClientLogger.clearLogs();
    setLogs([]);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[600px] h-[500px] bg-background border rounded-lg shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h2 className="font-semibold text-sm">DevTools</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="logs" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-3 mt-2">
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="state">State Inspector</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
        </TabsList>

        {/* Logs Tab */}
        <TabsContent value="logs" className="flex-1 flex flex-col overflow-hidden m-3 mt-2">
          {/* Filters */}
          <div className="flex gap-2 mb-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter logs..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as ClientLogLevel | 'all')}
              className="border rounded px-2 text-sm h-9"
            >
              <option value="all">All Levels</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
            <select
              value={filterNamespace}
              onChange={(e) => setFilterNamespace(e.target.value as ClientLogNamespace | 'all')}
              className="border rounded px-2 text-sm h-9"
            >
              <option value="all">All Namespaces</option>
              <option value="ui">UI</option>
              <option value="editor">Editor</option>
              <option value="thread">Thread</option>
              <option value="review">Review</option>
              <option value="storage">Storage</option>
              <option value="ai">AI</option>
              <option value="network">Network</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-2">
            <Button size="sm" variant="outline" onClick={downloadLogsJSON}>
              <Download className="h-3 w-3 mr-1" />
              JSON
            </Button>
            <Button size="sm" variant="outline" onClick={downloadLogsText}>
              <Download className="h-3 w-3 mr-1" />
              Text
            </Button>
            <Button size="sm" variant="outline" onClick={clearLogs}>
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
            <div className="ml-auto text-xs text-muted-foreground self-center">
              {filteredLogs.length} / {logs.length} logs
            </div>
          </div>

          {/* Log List */}
          <ScrollArea className="flex-1 border rounded">
            <div className="p-2 space-y-1 font-mono text-xs">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded ${
                    log.level === 'error'
                      ? 'bg-red-50 dark:bg-red-950/20'
                      : log.level === 'warn'
                      ? 'bg-yellow-50 dark:bg-yellow-950/20'
                      : log.level === 'info'
                      ? 'bg-blue-50 dark:bg-blue-950/20'
                      : 'bg-gray-50 dark:bg-gray-950/20'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`font-semibold whitespace-nowrap ${
                        log.level === 'error'
                          ? 'text-red-600 dark:text-red-400'
                          : log.level === 'warn'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : log.level === 'info'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      [{log.namespace}:{log.level}]
                    </span>
                    <span className="flex-1 break-all">{log.message}</span>
                  </div>
                  {log.args.length > 0 && (
                    <div className="mt-1 pl-2 text-muted-foreground">
                      {JSON.stringify(log.args, null, 2)}
                    </div>
                  )}
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="text-center text-muted-foreground py-8">No logs to display</div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* State Inspector Tab */}
        <TabsContent value="state" className="flex-1 overflow-hidden m-3 mt-2">
          <StateInspector />
        </TabsContent>

        {/* Network Tab */}
        <TabsContent value="network" className="flex-1 overflow-hidden m-3 mt-2">
          <NetworkInspector />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * State Inspector Component
 */
function StateInspector() {
  const reviewState = useReviewStore();

  return (
    <ScrollArea className="h-full border rounded">
      <div className="p-4 font-mono text-xs">
        <h3 className="font-semibold mb-2">Review Store</h3>
        <pre className="whitespace-pre-wrap break-all">
          {JSON.stringify(reviewState, null, 2)}
        </pre>
      </div>
    </ScrollArea>
  );
}

/**
 * Network Inspector Component
 */
function NetworkInspector() {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (clientCorrelationManager) {
        setRequests(clientCorrelationManager.getActiveRequests());
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollArea className="h-full border rounded">
      <div className="p-4 font-mono text-xs">
        <h3 className="font-semibold mb-2">Active Requests ({requests.length})</h3>
        {requests.length === 0 && (
          <div className="text-center text-muted-foreground py-8">No active requests</div>
        )}
        {requests.map((req) => (
          <div key={req.correlationId} className="mb-4 p-2 border rounded">
            <div className="font-semibold">
              Correlation ID: {req.correlationId.slice(0, 8)}...
            </div>
            <div className="text-muted-foreground">
              Duration: {Date.now() - req.startTime}ms
            </div>
            {req.metadata && (
              <pre className="mt-2 whitespace-pre-wrap break-all">
                {JSON.stringify(req.metadata, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

/**
 * Hook to manage DevTools panel visibility with keyboard shortcut
 */
export function useDevTools() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only enable in development or when explicitly enabled
    const isEnabled =
      process.env.NODE_ENV === 'development' ||
      process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS === 'true';

    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D or Cmd+Shift+D
      if (e.key === 'D' && e.shiftKey && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    setIsOpen,
  };
}
