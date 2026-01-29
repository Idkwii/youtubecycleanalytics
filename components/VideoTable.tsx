import React, { useState } from 'react';
import { Video, SortField, SortOrder } from '../types';
import { ArrowUpDown, ExternalLink, Eye, ThumbsUp, MessageCircle } from 'lucide-react';

interface VideoTableProps {
  videos: Video[];
}

const VideoTable: React.FC<VideoTableProps> = ({ videos }) => {
  const [sortField, setSortField] = useState<SortField>('publishedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedVideos = [...videos].sort((a, b) => {
    let valA: number | string = 0;
    let valB: number | string = 0;

    switch (sortField) {
      case 'publishedAt':
        valA = new Date(a.publishedAt).getTime();
        valB = new Date(b.publishedAt).getTime();
        break;
      case 'viewCount':
        valA = parseInt(a.stats?.viewCount || '0');
        valB = parseInt(b.stats?.viewCount || '0');
        break;
      case 'likeCount':
        valA = parseInt(a.stats?.likeCount || '0');
        valB = parseInt(b.stats?.likeCount || '0');
        break;
      case 'commentCount':
        valA = parseInt(a.stats?.commentCount || '0');
        valB = parseInt(b.stats?.commentCount || '0');
        break;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const formatNumber = (numStr?: string) => {
    if (!numStr) return '0';
    return new Intl.NumberFormat('ko-KR', { notation: "compact", maximumFractionDigits: 1 }).format(parseInt(numStr));
  };

  const TableHeader = ({ field, label, icon: Icon }: { field: SortField, label: string, icon?: React.ElementType }) => (
    <th 
      className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-blue-400' : 'text-slate-600'}`} />
      </div>
    </th>
  );

  return (
    <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700 shadow-xl backdrop-blur-sm">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-800">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">동영상</th>
            <TableHeader field="publishedAt" label="게시일" />
            <TableHeader field="viewCount" label="조회수" icon={Eye} />
            <TableHeader field="likeCount" label="좋아요" icon={ThumbsUp} />
            <TableHeader field="commentCount" label="댓글" icon={MessageCircle} />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50 bg-slate-900/30">
          {sortedVideos.map((video) => (
            <tr key={video.id} className="hover:bg-slate-800/50 transition-colors group">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-24 h-14 relative overflow-hidden rounded-lg border border-slate-700">
                    <img className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-300" src={video.thumbnailUrl} alt="" />
                  </div>
                  <div className="max-w-xs">
                    <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-200 hover:text-blue-400 truncate block transition-colors flex items-center gap-2">
                      {video.title}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <div className="text-xs text-slate-500 mt-1 truncate">{video.channelTitle}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                {new Date(video.publishedAt).toLocaleDateString('ko-KR')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200">
                {formatNumber(video.stats?.viewCount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-400">
                {formatNumber(video.stats?.likeCount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400">
                {formatNumber(video.stats?.commentCount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VideoTable;