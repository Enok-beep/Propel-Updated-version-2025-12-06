import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from '../ui-custom/Card';
import { Trophy } from 'lucide-react';
import { PointsDisplay } from '../gamification/PointsDisplay';
import { AchievementBadge } from '../gamification/AchievementBadge';
import { Leaderboard } from '../gamification/Leaderboard';

export function GamificationSection({ userStats, recentAchievements }) {
  const { tokens } = useTheme();

  if (!userStats) return null;

  return (
    <div className="grid lg:grid-cols-2 gap-6 mb-8">
      {/* Points & Achievements */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5" style={{ color: tokens.accent }} />
          <h3 className="text-lg font-semibold" style={{ color: tokens.color }}>
            Your Progress
          </h3>
        </div>
        
        <PointsDisplay 
          points={userStats.total_points} 
          streak={userStats.current_streak}
        />

        {recentAchievements.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-medium mb-2" style={{ color: tokens.subtle }}>
              Recent Achievements
            </div>
            <div className="flex gap-2 flex-wrap">
              {recentAchievements.map(achievementId => (
                <AchievementBadge 
                  key={achievementId}
                  achievement={{ id: achievementId }}
                  unlocked
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Leaderboard */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: tokens.accent }} />
            <h3 className="text-lg font-semibold" style={{ color: tokens.color }}>
              Leaderboard
            </h3>
          </div>
        </div>
        <Leaderboard limit={5} />
      </Card>
    </div>
  );
}

export default GamificationSection;