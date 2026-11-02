/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Megaphone, AlertTriangle, AlertCircle, Info, X, ChevronRight } from 'lucide-react';
import { db, collection, query, where, onSnapshot } from '../firebase/config';
import { SystemAlert } from '../types';

export const SystemAlertBanner: React.FC = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('linkup_dismissed_alerts') || '[]');
    } catch {
      return [];
    }
  });
  const [expandedAlert, setExpandedAlert] = useState<SystemAlert | null>(null);

  useEffect(() => {
    try {
      const q = query(collection(db, 'systemAlerts'), where('isActive', '==', true));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched: SystemAlert[] = [];
          snapshot.forEach((docSnap) => {
            fetched.push({ id: docSnap.id, ...docSnap.data() } as SystemAlert);
          });
          setAlerts(fetched);
        },
        (error) => {
          // If offline or permission check, ignore gracefully
        }
      );
      return () => unsubscribe();
    } catch (e) {
      // Fallback
    }
  }, []);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      sessionStorage.setItem('linkup_dismissed_alerts', JSON.stringify(updated));
    } catch {}
  };

  const activeVisibleAlerts = alerts.filter((a) => !dismissedIds.includes(a.id));
  if (activeVisibleAlerts.length === 0) return null;

  const current = activeVisibleAlerts[0];

  const typeConfig = {
    urgent: {
      bg: 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300',
      badge: 'bg-rose-500 text-white',
      icon: AlertCircle,
      accent: 'text-rose-600 dark:text-rose-400',
    },
    warning: {
      bg: 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-200',
      badge: 'bg-amber-500 text-white',
      icon: AlertTriangle,
      accent: 'text-amber-600 dark:text-amber-400',
    },
    announcement: {
      bg: 'bg-blue-500/15 border-blue-500/30 text-blue-800 dark:text-blue-200',
      badge: 'bg-blue-600 text-white',
      icon: Megaphone,
      accent: 'text-blue-600 dark:text-blue-400',
    },
    info: {
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-200',
      badge: 'bg-emerald-600 text-white',
      icon: Info,
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
  }[current.type] || {
    bg: 'bg-blue-500/15 border-blue-500/30 text-blue-800 dark:text-blue-200',
    badge: 'bg-blue-600 text-white',
    icon: Megaphone,
    accent: 'text-blue-600 dark:text-blue-400',
  };

  const Icon = typeConfig.icon;

  return (
    <>
      <div
        className={`w-full border-b px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-medium z-40 transition-all ${typeConfig.bg}`}
      >
        <div
          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
          onClick={() => setExpandedAlert(current)}
        >
          <span className={`p-1 rounded-md ${typeConfig.badge} shrink-0`}>
            <Icon className="w-3.5 h-3.5" />
          </span>
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold tracking-tight uppercase text-[10px] sm:text-xs">
              [{current.type}]
            </span>
            <span className="font-semibold truncate">{current.title}:</span>
            <span className="opacity-90 truncate">{current.message}</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-60 shrink-0 ml-1 hidden sm:inline" />
        </div>

        <button
          onClick={(e) => handleDismiss(current.id, e)}
          className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-current transition-colors ml-3 shrink-0 cursor-pointer"
          title="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Alert Modal */}
      {expandedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${typeConfig.badge}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase opacity-70">
                    Official Server Broadcast
                  </span>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                    {expandedAlert.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setExpandedAlert(null)}
                className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
              {expandedAlert.message}
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setExpandedAlert(null)}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
