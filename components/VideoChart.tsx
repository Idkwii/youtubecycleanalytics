import React from 'react';
import { Video } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface VideoChartProps {
  videos: Video[];
}

const VideoChart: React.FC<VideoChartProps> = ({ videos }) => {
  // Take top 10 recent videos, reverse for chronological left-to-right
  const data = [...videos].reverse().map(v => ({
    name: v.title.length > 15 ? v.title.substring(0, 15) + '...' : v.title,
    fullTitle: v.title,
    views: parseInt(v.stats?.viewCount || '0'),
    likes: parseInt(v.stats?.likeCount || '0'),
    comments: parseInt(v.stats?.commentCount || '0'),
  }));

  return (
    <div className="h-[300px] w-full mt-6 bg-slate-800/30 p-4 rounded-xl border border-slate-700">
      <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">최근 성과 개요 (최근 10개 영상)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8" 
            tick={{fontSize: 12}} 
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            tick={{fontSize: 12}} 
            tickFormatter={(value) => new Intl.NumberFormat('ko-KR', { notation: "compact" }).format(value)}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            cursor={{fill: '#334155', opacity: 0.4}}
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px', color: '#f1f5f9' }}
            itemStyle={{ color: '#f1f5f9' }}
            labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
            formatter={(value: number, name: string) => [new Intl.NumberFormat('ko-KR').format(value), name === 'views' ? '조회수' : name]}
          />
          <Bar dataKey="views" name="조회수" radius={[4, 4, 0, 0]}>
             {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#3b82f6" />
              ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VideoChart;