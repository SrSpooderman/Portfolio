import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const colors = ['#84cc16', '#2563eb', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6'];

export function AnalyticsCharts({ data }: { data: any }) {
  const devices = Object.entries(data.overview?.by_device ?? {}).map(([name, value]) => ({ name, value: Number(value) }));
  const projects = (data.projects ?? []).slice(0, 8).map((item: any) => ({ name: String(item.project_id).slice(0, 8), value: Number(item.count) }));
  return <div className="analytics-charts">
    <section><h3>Actividad diaria</h3><ResponsiveContainer width="100%" height={190}><LineChart data={data.timeseries ?? []}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" hide/><YAxis width={32}/><Tooltip/><Line type="monotone" dataKey="count" stroke="#65a30d" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></section>
    <section><h3>Proyectos</h3><ResponsiveContainer width="100%" height={190}><BarChart data={projects}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis width={32}/><Tooltip/><Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]}/></BarChart></ResponsiveContainer></section>
    <section><h3>Dispositivos</h3><ResponsiveContainer width="100%" height={190}><PieChart><Pie data={devices} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72}>{devices.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></section>
  </div>;
}
