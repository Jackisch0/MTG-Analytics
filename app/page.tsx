"use client";

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
    const [data, setData] = useState([]);
    const [topCards, setTopCards] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!supabase) {
                console.error("Supabase client not initialized");
                setLoading(false);
                return;
            }

            const [metricsRes, cardsRes] = await Promise.all([
                supabase.from('spell_snare_metric').select('*').order('date', { ascending: true }),
                supabase.from('top_2_mana_cards').select('*').limit(10)
            ]);

            if (!metricsRes.error) setData(metricsRes.data);
            if (!cardsRes.error) setTopCards(cardsRes.data);

            setLoading(false);
        }
        fetchData();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-slate-400 font-medium">Crunching Standard Metagame Data...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600">
                        Standard Meta Analytics
                    </h1>
                    <p className="mt-2 text-slate-400 text-lg">Detailed analysis of the current Standard metagame.</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-full text-xs font-mono text-slate-500">
                    Trailing 30 Days Baseline
                </div>
            </header>

            <main className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Main Metric Chart */}
                <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-xl font-semibold mb-6 flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        Standard 2-Mana Competitive Value
                    </h2>
                    <div className="h-[450px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#475569"
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#475569"
                                    label={{ value: '% CMC 2 Cards', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 13, dx: -10 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#38bdf8' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line
                                    type="monotone"
                                    dataKey="spell_snare_value"
                                    name="CMC 2 Prevalence (%)"
                                    stroke="#38bdf8"
                                    strokeWidth={4}
                                    dot={{ r: 4, fill: '#38bdf8', strokeWidth: 0 }}
                                    activeDot={{ r: 6, stroke: '#38bdf8', strokeWidth: 2, fill: '#0f172a' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="mt-4 text-xs text-slate-500 font-medium uppercase tracking-wider">
                        Formula: Σ (CMC 2 Non-Land Cards) / Σ (Total Non-Land Cards)
                    </p>
                </div>

                <div className="space-y-8">
                    {/* Top Cards List */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center">
                            <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                            Top 2-Mana Staples
                        </h3>
                        <div className="space-y-4">
                            {topCards.length > 0 ? topCards.map((card, idx) => (
                                <div key={card.name} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-slate-600 font-mono text-xs">{idx + 1}</span>
                                        <span className="text-sm font-medium text-slate-300">{card.name}</span>
                                    </div>
                                    <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded-md font-mono">
                                        {card.total_quantity} qty
                                    </span>
                                </div>
                            )) : (
                                <p className="text-slate-500 text-center py-12">Scrape data to see top cards.</p>
                            )}
                        </div>
                    </div>

                    {/* Meta Snapshot */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-lg font-medium text-slate-200 mb-4">Standard Snapshot</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg">
                                <span className="text-slate-400 text-sm">Tournaments Analyzed</span>
                                <span className="font-mono text-blue-400 font-bold">{data.length}</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg">
                                <span className="text-slate-400 text-sm">Latest CMC 2 Value</span>
                                <span className="font-mono text-purple-400 font-bold">
                                    {data.length > 0 ? `${data[data.length - 1].spell_snare_value.toFixed(2)}%` : '0.00%'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
