import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Leaderboard({ teamId, limit = 10 }) {
  const { tokens } = useTheme();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: stats = [], isLoading } = useQuery({
    queryKey: ['userStats', teamId],
    queryFn: () => base44.entities.UserStats.list('-total_points', limit),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', teamId],
    queryFn: () => base44.entities.TeamMember.list(),
    enabled: !!teamId,
  });

  const filteredStats = teamId
    ? stats.filter(s => teamMembers.some(m => m.user_email === s.user_email && m.team_id === teamId))
    : stats;

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <span className="text-sm font-bold" style={{ color: tokens.subtle }}>{rank}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8" style={{ color: tokens.subtle }}>
        Loading leaderboard...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredStats.length === 0 ? (
        <div className="text-center py-8" style={{ color: tokens.subtle }}>
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <div className="text-sm">No data yet. Complete tasks to appear on the leaderboard!</div>
        </div>
      ) : (
        filteredStats.map((stat, index) => {
          const rank = index + 1;
          const isCurrentUser = stat.user_email === user?.email;
          
          return (
            <div
              key={stat.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-all",
                isCurrentUser && "ring-2"
              )}
              style={{
                borderColor: isCurrentUser ? tokens.accent : tokens.border,
                backgroundColor: isCurrentUser ? `${tokens.accent}08` : tokens.card,
                ringColor: tokens.accent
              }}
            >
              <div className="w-8 flex items-center justify-center flex-shrink-0">
                {getRankIcon(rank)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate" style={{ color: tokens.color }}>
                  {stat.user_email.split('@')[0]}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs font-normal" style={{ color: tokens.accent }}>
                      (You)
                    </span>
                  )}
                </div>
                <div className="text-xs flex items-center gap-3 mt-1" style={{ color: tokens.subtle }}>
                  <span>{stat.tasks_completed} tasks</span>
                  {stat.current_streak > 0 && (
                    <span>🔥 {stat.current_streak} day streak</span>
                  )}
                </div>
              </div>
              
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-lg" style={{ color: tokens.color }}>
                  {stat.total_points.toLocaleString()}
                </div>
                <div className="text-xs" style={{ color: tokens.subtle }}>
                  points
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default Leaderboard;