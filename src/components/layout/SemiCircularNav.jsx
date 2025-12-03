import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useTheme } from '../theme/ThemeProvider';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Timer, 
  Settings,
  CalendarDays,
  TrendingUp,
  Users,
  Plus,
  Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const getNavItems = (workMode) => {
  const baseItems = [
    { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
    { name: 'Calendar', page: 'Calendar', icon: CalendarDays },
    { name: 'Tasks', page: 'Tasks', icon: CheckSquare },
  ];

  const modeSpecificItems = workMode === 'team' 
    ? [
        { name: 'Team Board', page: 'TeamDashboard', icon: TrendingUp },
        { name: 'Meetings', page: 'Meetings', icon: Users }
      ]
    : [{ name: 'Focus', page: 'Focus', icon: Timer }];

  return [
    ...baseItems,
    ...modeSpecificItems,
    { name: 'Settings', page: 'Settings', icon: Settings },
  ];
};

export function SemiCircularNav({ currentPageName }) {
  const { tokens } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ bottom: 30, left: window.innerWidth / 2 - 40 });
  const [isDragging, setIsDragging] = useState(false);
  const navRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0, left: 0, bottom: 0 });

  const { data: preferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => base44.entities.UserPreferences.list(),
  });

  const workMode = preferences[0]?.work_mode || 'personal';
  const navItems = getNavItems(workMode);

  const handleMouseDown = (e) => {
    if (e.target.closest('.toggle-btn') || e.target.closest('a')) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      left: position.left,
      bottom: position.bottom
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = dragStart.current.y - e.clientY;
    const newLeft = dragStart.current.left + deltaX;
    const newBottom = dragStart.current.bottom + deltaY;
    
    const maxLeft = window.innerWidth - 80;
    const maxBottom = window.innerHeight - 80;
    
    setPosition({
      left: Math.max(0, Math.min(newLeft, maxLeft)),
      bottom: Math.max(20, Math.min(newBottom, maxBottom))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <nav
      ref={navRef}
      className={cn("fixed z-50 flex items-center justify-center", isDragging && "cursor-grabbing")}
      style={{
        bottom: `${position.bottom}px`,
        left: `${position.left}px`,
        width: '80px',
        height: '80px',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div 
        className={cn(
          "relative flex items-center justify-center transition-all duration-600"
        )}
      >
        {/* Toggle Button */}
        <button
          className="toggle-btn relative z-50 flex items-center justify-center rounded-full shadow-lg transition-all duration-600"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '60px',
            height: '60px',
            backgroundColor: tokens.card,
            border: `2px solid ${tokens.border}`,
            boxShadow: isOpen ? `0 0 20px ${tokens.accent}40` : undefined
          }}
        >
          {isOpen ? (
            <Circle 
              className="w-7 h-7 transition-all" 
              strokeWidth={3}
              style={{ 
                color: '#FFFFFF',
                filter: 'drop-shadow(0 0 8px #FFFFFF)'
              }} 
            />
          ) : (
            <Plus className="w-6 h-6" style={{ color: tokens.accent }} />
          )}
        </button>

        {/* Navigation Items */}
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentPageName === item.page;
          const totalItems = navItems.length;
          const angle = 180 - ((180 / (totalItems + 1)) * (index + 1));
          const radius = 150;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = -Math.sin((angle * Math.PI) / 180) * radius;
          const translation = `translate(${x}px, ${y}px)`;
          
          return (
            <span
              key={item.page}
              className={cn(
                "absolute transition-all duration-600",
                isOpen ? "opacity-100" : "opacity-0"
              )}
              style={{
                transform: isOpen ? translation : 'translate(0, 0)',
                transitionDelay: isOpen ? `${index * 50}ms` : '0ms'
              }}
            >
              <Link
                to={createPageUrl(item.page)}
                className="flex items-center justify-center rounded-full shadow-lg transition-all"
                style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: isActive ? tokens.accent : tokens.card,
                  border: `2px solid ${isActive ? tokens.accent : tokens.border}`
                }}
                title={item.name}
                onClick={(e) => e.stopPropagation()}
              >
                <Icon 
                  className="w-5 h-5 transition-transform hover:scale-110" 
                  style={{ 
                    color: isActive ? '#FFFFFF' : tokens.color
                  }} 
                />
              </Link>
            </span>
          );
        })}
      </div>
    </nav>
  );
}

export default SemiCircularNav;