"use client";

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            const { data: metrics, error } = await supabase
                .from('spell_snare_metric')
                .select('*')
                .order('date', { ascending: true });

            if (!error) {
                setData(metrics);
            }
            setLoading(false);
        }
        fetchData();
    }, []);

    if (loading) return <div className="flex items-center justify-center h-screen bg-slate-900 text-white">Loading Metagame Data...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
            <header className="mb-12">
                <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                    MTG Meta Analytics
                </h1>
                <p className="mt-2 text-slate-400 text-lg">Competitive analysis and metagame trends.</p>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Metric Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-xl font-semibold mb-6 flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        Spell Snare Competitive Value
                    </h2>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#94a3b8"
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(str) => new Date(str).toLocaleDateString()}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    label={{ value: '% CMC 2', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                    itemStyle={{ color: '#38bdf8' }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="spell_snare_value"
                                    name="% of Non-Land Cards (CMC 2)"
                                    stroke="#38bdf8"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#38bdf8' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="mt-4 text-sm text-slate-500 italic">
                        Calculated as the percentage of all registered non-land cards with CMC 2.
                    </p>
                </div>

                {/* Info Card */}
                <div className="space-y-8">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-lg font-medium text-slate-200 mb-4">Metagame Snapshot</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg">
                                <span className="text-slate-400">Total Tournaments</span>
                                <span className="font-mono text-blue-400">{data.length}</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg">
                                <span className="text-slate-400">Baseline Window</span>
                                <span className="text-slate-200">30 Days</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg">
                                <span className="text-slate-400">Latest Metric Value</span>
                                <span className="font-mono text-purple-400">
                                    {data.length > 0 ? `${data[data.length - 1].spell_snare_value.toFixed(2)}%` : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-6">
                        <h3 className="text-lg font-medium text-indigo-300 mb-2">Pro Tip</h3>
                        <p className="text-indigo-400/80 text-sm leading-relaxed">
                            When the Spell Snare Value exceeds 25%, Maindeck inclusion of the card becomes significantly more viable in Modern.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
