import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Youtube, BarChart2, Sparkles, Key, AlertCircle, RefreshCw, LayoutDashboard, Clock, FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown, MoreVertical, Film, Video as VideoIcon, ThumbsUp, MessageCircle } from 'lucide-react';
import { ChannelDetails, Video, ChannelData, ChannelGroup } from './types';
import { fetchChannelByHandle, fetchLatestVideos } from './services/youtubeService';
import { analyzeChannelPerformance } from './services/geminiService';
import VideoTable from './components/VideoTable';
import VideoChart from './components/VideoChart';
import ReactMarkdown from 'react-markdown';

type VideoTypeFilter = 'all' | 'shorts' | 'long';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [handleInput, setHandleInput] = useState<string>('');
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [groups, setGroups] = useState<ChannelGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Selection State
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [showKeyInput, setShowKeyInput] = useState<boolean>(true);

  // Filter State
  const [videoFilter, setVideoFilter] = useState<VideoTypeFilter>('all');

  // New Group Input State
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [targetGroupId, setTargetGroupId] = useState<string>(''); 

  // Load Data from local storage
  useEffect(() => {
    const savedKey = localStorage.getItem('yt_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setShowKeyInput(false);
    }
    
    // Load persisted channels and groups
    const savedChannels = localStorage.getItem('yt_channels');
    if (savedChannels) {
      try {
        setChannels(JSON.parse(savedChannels));
      } catch (e) { console.error("Failed to parse channels", e); }
    }

    const savedGroups = localStorage.getItem('yt_groups');
    if (savedGroups) {
      try {
        setGroups(JSON.parse(savedGroups));
      } catch (e) { console.error("Failed to parse groups", e); }
    }
  }, []);

  // Persistence
  useEffect(() => {
    if (channels.length > 0) localStorage.setItem('yt_channels', JSON.stringify(channels));
    if (groups.length > 0) localStorage.setItem('yt_groups', JSON.stringify(groups));
  }, [channels, groups]);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('yt_api_key', key);
    setShowKeyInput(false);
  };

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: ChannelGroup = {
      id: Date.now().toString(),
      name: newGroupName,
      isOpen: true
    };
    setGroups(prev => [...prev, newGroup]);
    setNewGroupName('');
    setIsCreatingGroup(false);
  };

  const deleteGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Move channels out of the group (ungroup them)
    setChannels(prev => prev.map(c => c.groupId === groupId ? { ...c, groupId: undefined } : c));
    setGroups(prev => prev.filter(g => g.id !== groupId));
    if (selectedGroupId === groupId) setSelectedGroupId(null);
  };

  const toggleGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, isOpen: !g.isOpen } : g));
  };

  const addChannel = async () => {
    if (loading) return; // Prevent multiple clicks/enters
    
    if (!apiKey) {
      setError("먼저 YouTube API 키를 입력해주세요.");
      setShowKeyInput(true);
      return;
    }
    if (!handleInput) return;

    setLoading(true);
    setError(null);
    try {
      const details = await fetchChannelByHandle(handleInput, apiKey);
      if (details) {
        if (channels.some(c => c.details.id === details.id)) {
          setError("이미 추가된 채널입니다.");
        } else {
          const videos = await fetchLatestVideos(details.uploadsPlaylistId, apiKey);
          const newChannelData: ChannelData = { 
            details, 
            videos,
            groupId: targetGroupId || undefined
          };
          setChannels(prev => [...prev, newChannelData]);
          setHandleInput('');
        }
      } else {
        setError("채널을 찾을 수 없습니다. 핸들을 확인해주세요.");
      }
    } catch (err) {
      setError("채널 정보를 가져오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const removeChannel = (id: string) => {
    setChannels(prev => prev.filter(c => c.details.id !== id));
    if (selectedChannelId === id) {
      setSelectedChannelId(null);
      setAiAnalysis(null);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedChannelId(null);
    setAiAnalysis(null);
  };

  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    setSelectedGroupId(null);
    setAiAnalysis(null);
  };

  const handleSelectDashboard = () => {
    setSelectedChannelId(null);
    setSelectedGroupId(null);
    setAiAnalysis(null);
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, channelId: string) => {
    e.dataTransfer.setData('channelId', channelId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetGroupId: string | undefined) => {
    e.preventDefault();
    const channelId = e.dataTransfer.getData('channelId');
    if (channelId) {
      setChannels(prev => prev.map(c => c.details.id === channelId ? { ...c, groupId: targetGroupId } : c));
    }
  };
  // ---------------------------

  // Derived Data Logic
  const selectedChannelData = channels.find(c => c.details.id === selectedChannelId);
  const selectedGroupData = groups.find(g => g.id === selectedGroupId);

  // Helper: Filter videos by date and TYPE
  const getFilteredVideos = (videos: Video[]) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // 1. Date Filter
    let filtered = videos.filter(v => new Date(v.publishedAt) >= oneWeekAgo);

    // 2. Type Filter (Shorts <= 60s)
    if (videoFilter === 'shorts') {
      filtered = filtered.filter(v => v.durationSeconds <= 60 && v.durationSeconds > 0);
    } else if (videoFilter === 'long') {
      filtered = filtered.filter(v => v.durationSeconds > 60);
    }

    return filtered;
  };

  // Compute dashboard data (Global or Group)
  const dashboardData = useMemo(() => {
    let targetChannels = channels;
    
    // Filter by group if a group is selected
    if (selectedGroupId) {
      targetChannels = channels.filter(c => c.groupId === selectedGroupId);
    }

    const allWeeklyVideos = targetChannels.flatMap(c => getFilteredVideos(c.videos));
    // Sort by date desc initially
    allWeeklyVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    // Recalculate stats based on filters
    const totalLikes = allWeeklyVideos.reduce((acc, v) => acc + parseInt(v.stats?.likeCount || '0'), 0);
    const totalComments = allWeeklyVideos.reduce((acc, v) => acc + parseInt(v.stats?.commentCount || '0'), 0);

    return { 
      allWeeklyVideos, 
      channelCount: targetChannels.length,
      totalLikes,
      totalComments
    };
  }, [channels, selectedGroupId, videoFilter]); // Re-run when filter changes

  // Filter channels based on selected channel (if single channel view)
  const singleChannelVideos = useMemo(() => {
    if (!selectedChannelData) return [];
    return getFilteredVideos(selectedChannelData.videos);
  }, [selectedChannelData, videoFilter]);

  // Calculate stats for single channel view
  const singleChannelStats = useMemo(() => {
    const likes = singleChannelVideos.reduce((acc, v) => acc + parseInt(v.stats?.likeCount || '0'), 0);
    const comments = singleChannelVideos.reduce((acc, v) => acc + parseInt(v.stats?.commentCount || '0'), 0);
    return { 
        count: singleChannelVideos.length, 
        likes, 
        comments 
    };
  }, [singleChannelVideos]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAiAnalysis(null);
    try {
      let insight = "";
      if (selectedChannelId && selectedChannelData) {
        insight = await analyzeChannelPerformance(selectedChannelData.details.title, singleChannelVideos);
      } else {
        const contextName = selectedGroupData ? `그룹 "${selectedGroupData.name}"` : "모든 추적 채널";
        const topVideos = dashboardData.allWeeklyVideos.slice(0, 15);
        
        if (topVideos.length === 0) {
          insight = "선택한 조건에 해당하는 분석할 동영상이 없습니다.";
        } else {
          insight = await analyzeChannelPerformance(`${contextName} (주간 개요)`, topVideos);
        }
      }
      setAiAnalysis(insight);
    } catch (e) {
      setAiAnalysis("분석 생성에 실패했습니다.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Format Helpers
  const formatCompact = (num: number) => new Intl.NumberFormat('ko-KR', { notation: "compact", maximumFractionDigits: 1 }).format(num);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col md:flex-row">
      
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-auto md:h-screen sticky top-0 z-10">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
            <Youtube className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">유튜브 분석기</h1>
            <p className="text-xs text-slate-500">채널 추적 & 최적화</p>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          
           {/* Add Channel Section */}
           <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">채널 추가</h3>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm">@</span>
                <input
                  type="text"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  placeholder="핸들 입력 (예: google)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                  onKeyDown={(e) => e.key === 'Enter' && addChannel()}
                />
              </div>
              
              <div className="flex gap-2">
                <select 
                  value={targetGroupId}
                  onChange={(e) => setTargetGroupId(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">그룹 없음</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <button 
                  onClick={addChannel}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                </button>
              </div>

              {error && (
                <div className="text-xs text-red-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-1">
             <div 
                onClick={handleSelectDashboard}
                className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${!selectedChannelId && !selectedGroupId ? 'bg-indigo-600/10 border border-indigo-600/20 text-indigo-400' : 'hover:bg-slate-800 border border-transparent text-slate-400'}`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-sm font-medium">전체 채널</span>
              </div>

            <div className="flex items-center justify-between mt-6 mb-2 px-1">
               <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">내 폴더</h3>
               <button onClick={() => setIsCreatingGroup(!isCreatingGroup)} className="text-slate-500 hover:text-blue-400 transition-colors">
                 <FolderPlus className="w-4 h-4" />
               </button>
            </div>

            {/* Create Group Input */}
            {isCreatingGroup && (
              <div className="flex gap-2 mb-3 px-1">
                <input 
                  autoFocus
                  type="text" 
                  value={newGroupName} 
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addGroup()}
                  placeholder="폴더명"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                />
                <button onClick={addGroup} className="bg-slate-700 hover:bg-slate-600 text-white px-2 rounded text-xs">확인</button>
              </div>
            )}

            {/* Groups List (Drop Zone) */}
            {groups.map(group => {
              const groupChannels = channels.filter(c => c.groupId === group.id);
              const isSelected = selectedGroupId === group.id;
              
              return (
                <div 
                  key={group.id} 
                  className="mb-1"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, group.id)}
                >
                  <div 
                    onClick={() => handleSelectGroup(group.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer group/item transition-colors ${isSelected ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 text-slate-300'}`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden pointer-events-none">
                       <button onClick={(e) => { e.stopPropagation(); toggleGroup(group.id, e); }} className="text-slate-500 hover:text-white pointer-events-auto">
                         {group.isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                       </button>
                       <Folder className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                       <span className="text-sm font-medium truncate">{group.name}</span>
                       <span className="text-xs text-slate-600">({groupChannels.length})</span>
                    </div>
                    <button 
                      onClick={(e) => deleteGroup(group.id, e)}
                      className="opacity-0 group-hover/item:opacity-100 text-slate-600 hover:text-red-400 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Nested Channels (Draggable) */}
                  {group.isOpen && (
                    <div className="ml-4 pl-2 border-l border-slate-800 space-y-0.5 mt-1">
                      {groupChannels.map(channel => {
                        const weeklyCount = getFilteredVideos(channel.videos).length;
                        return (
                          <div 
                            key={channel.details.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, channel.details.id)}
                            onClick={() => handleSelectChannel(channel.details.id)}
                            className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-colors active:cursor-grabbing hover:bg-slate-800/50 ${selectedChannelId === channel.details.id ? 'bg-blue-600/20 text-blue-300' : 'text-slate-400'}`}
                          >
                             <img src={channel.details.thumbnailUrl} className="w-5 h-5 rounded-full pointer-events-none" />
                             <span className="text-xs truncate flex-1 pointer-events-none">{channel.details.title}</span>
                             {weeklyCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                          </div>
                        );
                      })}
                      {groupChannels.length === 0 && (
                        <div className="text-[10px] text-slate-600 px-2 py-1 italic">여기로 드래그하세요</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Ungrouped Channels (Drop Zone) */}
            <div 
              className="mt-6"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, undefined)}
            >
               <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">그룹 없음</h3>
               {channels.filter(c => !c.groupId).length === 0 && (
                 <div className="text-[10px] text-slate-600 px-1 italic">여기로 드래그하세요</div>
               )}
               {channels.filter(c => !c.groupId).map((channel) => {
                  const weeklyCount = getFilteredVideos(channel.videos).length;
                  return (
                    <div 
                      key={channel.details.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, channel.details.id)}
                      onClick={() => handleSelectChannel(channel.details.id)}
                      className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all active:cursor-grabbing ${selectedChannelId === channel.details.id ? 'bg-blue-600/10 border border-blue-600/20' : 'hover:bg-slate-800 border border-transparent'}`}
                    >
                      <img src={channel.details.thumbnailUrl} alt="" className="w-8 h-8 rounded-full bg-slate-800 pointer-events-none" />
                      <div className="flex-1 min-w-0 pointer-events-none">
                        <div className="flex justify-between items-center">
                          <div className={`text-sm font-medium truncate ${selectedChannelId === channel.details.id ? 'text-blue-400' : 'text-slate-300'}`}>
                            {channel.details.title}
                          </div>
                          {weeklyCount > 0 && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                              {weeklyCount} 신규
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {parseInt(channel.details.subscriberCount).toLocaleString('ko-KR')}명
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeChannel(channel.details.id); }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
               })}
            </div>

          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
           <button 
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors py-2 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700"
           >
             <Key className="w-3 h-3" />
             {apiKey ? 'API 키 업데이트' : 'API 키 설정'}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto relative scroll-smooth">
        {/* API Key Modal */}
        {showKeyInput && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-600/20 rounded-xl">
                   <Key className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-white">YouTube Data API 키</h2>
              </div>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                실시간 채널 통계를 가져오려면 <strong>YouTube Data API v3</strong> 키가 필요합니다. 
                <br /><br />
                키는 브라우저에 로컬로 저장되며 서버로 전송되지 않습니다.
              </p>
              <input 
                type="password" 
                placeholder="여기에 API 키 붙여넣기..." 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none mb-4 transition-all"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <div className="flex gap-3">
                 <button 
                  onClick={() => setShowKeyInput(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={() => saveApiKey(apiKey)}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  키 저장
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-8 max-w-7xl mx-auto space-y-8">
           {/* Top Navigation / Filter Bar */}
           <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded-xl border border-slate-800">
              <div className="flex gap-1">
                <button 
                  onClick={() => setVideoFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${videoFilter === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                  전체
                </button>
                <button 
                  onClick={() => setVideoFilter('long')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${videoFilter === 'long' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                  <VideoIcon className="w-4 h-4" />
                  일반 영상
                </button>
                <button 
                  onClick={() => setVideoFilter('shorts')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${videoFilter === 'shorts' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                  <Film className="w-4 h-4" />
                  숏폼 (Shorts)
                </button>
              </div>
           </div>

           {selectedChannelData ? (
            // SINGLE CHANNEL VIEW
            <>
              <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-6">
                  <img 
                    src={selectedChannelData.details.thumbnailUrl} 
                    className="w-24 h-24 rounded-full border-4 border-slate-800 shadow-xl" 
                    alt={selectedChannelData.details.title}
                  />
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{selectedChannelData.details.title}</h1>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          구독자 {parseInt(selectedChannelData.details.subscriberCount).toLocaleString('ko-KR')}명
                        </span>
                        {selectedChannelData.groupId && (
                          <span className="flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 text-indigo-400">
                            <Folder className="w-3 h-3" />
                            {groups.find(g => g.id === selectedChannelData.groupId)?.name}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-900/20 transition-all transform hover:scale-105 disabled:opacity-70 disabled:scale-100"
                >
                  {analyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {analyzing ? '분석 중...' : 'Gemini 채널 분석'}
                </button>
              </div>

              {/* Single Channel Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center gap-3 text-slate-400 mb-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium uppercase tracking-wide">동영상 (최근 7일)</span>
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {singleChannelStats.count}개
                  </div>
                </div>
                
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center gap-3 text-slate-400 mb-2">
                    <ThumbsUp className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-medium uppercase tracking-wide">좋아요 (최근 7일)</span>
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {formatCompact(singleChannelStats.likes)}
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center gap-3 text-slate-400 mb-2">
                    <MessageCircle className="w-5 h-5 text-indigo-500" />
                    <span className="text-sm font-medium uppercase tracking-wide">댓글 (최근 7일)</span>
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {formatCompact(singleChannelStats.comments)}
                  </div>
                </div>
              </div>

              {aiAnalysis && (
                <div className="bg-slate-900/50 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden animate-fade-in">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-32 h-32 text-indigo-500" /></div>
                  <h3 className="text-indigo-400 font-semibold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5" />Gemini AI 인사이트</h3>
                  <div className="prose prose-invert prose-sm max-w-none text-slate-300"><ReactMarkdown>{aiAnalysis}</ReactMarkdown></div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-3">
                  <VideoChart videos={singleChannelVideos} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-slate-500" />
                    최근 업로드 (선택됨)
                  </h2>
                </div>
                <VideoTable videos={singleChannelVideos} />
              </div>
            </>
          ) : (
            // DASHBOARD OVERVIEW (GLOBAL OR GROUP)
            <>
              <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                      {selectedGroupData ? (
                        <>
                          <FolderOpen className="w-8 h-8 text-blue-500" />
                          {selectedGroupData.name} 대시보드
                        </>
                      ) : (
                        "주간 대시보드"
                      )}
                    </h1>
                    <p className="text-slate-400">
                      {selectedGroupData ? `"${selectedGroupData.name}" 그룹` : '모든 추적 채널'}의 최근 7일간 현황입니다.
                    </p>
                </div>
                <button 
                    onClick={handleAnalyze}
                    disabled={analyzing || dashboardData.allWeeklyVideos.length === 0}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-105 disabled:opacity-70 disabled:scale-100 disabled:saturate-0"
                  >
                    {analyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {analyzing ? '분석 중...' : '트렌드 분석'}
                  </button>
              </div>

              {aiAnalysis && (
                <div className="bg-slate-900/50 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden animate-fade-in">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-32 h-32 text-emerald-500" /></div>
                  <h3 className="text-emerald-400 font-semibold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5" />Gemini 트렌드 분석</h3>
                  <div className="prose prose-invert prose-sm max-w-none text-slate-300"><ReactMarkdown>{aiAnalysis}</ReactMarkdown></div>
                </div>
              )}

              {dashboardData.channelCount === 0 ? (
                <div className="h-[50vh] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-3xl">
                  <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800">
                    <FolderPlus className="w-10 h-10 text-slate-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {selectedGroupData ? '이 폴더는 비어있습니다' : '채널 추적 시작하기'}
                  </h2>
                  <p className="text-slate-400 max-w-md">
                    {selectedGroupData ? '사이드바에서 채널을 드래그하여 이 폴더에 추가하세요.' : '사이드바에 유튜브 핸들(예: @Google)을 입력하여 대시보드를 채우세요.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Updated Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center gap-3 text-slate-400 mb-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        <span className="text-sm font-medium uppercase tracking-wide">동영상 (최근 7일)</span>
                      </div>
                      <div className="text-4xl font-bold text-white">
                        {dashboardData.allWeeklyVideos.length}개
                      </div>
                    </div>
                    
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center gap-3 text-slate-400 mb-2">
                        <ThumbsUp className="w-5 h-5 text-emerald-500" />
                        <span className="text-sm font-medium uppercase tracking-wide">총 좋아요</span>
                      </div>
                      <div className="text-4xl font-bold text-white">
                        {formatCompact(dashboardData.totalLikes)}
                      </div>
                    </div>

                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center gap-3 text-slate-400 mb-2">
                        <MessageCircle className="w-5 h-5 text-indigo-500" />
                        <span className="text-sm font-medium uppercase tracking-wide">총 댓글</span>
                      </div>
                      <div className="text-4xl font-bold text-white">
                        {formatCompact(dashboardData.totalComments)}
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Chart (Top 10 videos of the week) */}
                  {dashboardData.allWeeklyVideos.length > 0 && (
                    <div className="grid grid-cols-1">
                        <VideoChart videos={dashboardData.allWeeklyVideos.slice(0, 10)} />
                    </div>
                  )}

                  {/* All Weekly Videos Table */}
                  <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-slate-500" />
                      최근 업로드 (최근 7일)
                    </h2>
                    {dashboardData.allWeeklyVideos.length > 0 ? (
                      <VideoTable videos={dashboardData.allWeeklyVideos} />
                    ) : (
                      <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-slate-800 text-slate-500">
                          선택한 조건에 맞는 최근 영상이 없습니다.
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;