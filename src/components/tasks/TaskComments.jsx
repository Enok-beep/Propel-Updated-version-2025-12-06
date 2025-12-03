import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { notifyCommentMention } from '../notifications/NotificationService';

export function TaskComments({ taskId, task }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['taskComments', taskId],
    queryFn: () => base44.entities.TaskComment.filter({ task_id: taskId }, '-created_date'),
  });

  const { data: allTeamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    enabled: !!task?.team_id,
  });

  const teamMembers = allTeamMembers.filter(tm => 
    tm.team_id === task?.team_id && tm.status === 'active'
  );

  const addCommentMutation = useMutation({
    mutationFn: async (content) => {
      // Add comment
      await base44.entities.TaskComment.create({
        task_id: taskId,
        author_email: user.email,
        author_name: user.full_name || user.email,
        content
      });

      // Extract @mentions and notify
      const mentionRegex = /@(\S+)/g;
      const mentions = [...content.matchAll(mentionRegex)].map(m => m[1]);
      
      if (mentions.length > 0 && task?.team_id) {
        const mentionedEmails = [];
        for (const mention of mentions) {
          const mentioned = teamMembers.find(tm => 
            tm.user_email.includes(mention) || tm.user_email.split('@')[0] === mention
          );
          
          if (mentioned && mentioned.user_email !== user.email) {
            mentionedEmails.push(mentioned.user_email);
          }
        }
        
        if (mentionedEmails.length > 0) {
          await notifyCommentMention(task, mentionedEmails, user.email, content);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['taskComments', taskId]);
      setNewComment('');
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => base44.entities.TaskComment.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['taskComments', taskId]);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-5 h-5" style={{ color: tokens.accent }} />
        <h4 className="font-semibold" style={{ color: tokens.color }}>
          Comments ({comments.length})
        </h4>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder={task?.team_id ? "Add a comment... (use @username to mention team members)" : "Add a comment..."}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px]"
          style={{ borderColor: tokens.border, color: tokens.color }}
        />
        {task?.team_id && teamMembers.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: tokens.subtle }}>Mention:</span>
            {teamMembers.slice(0, 5).map(member => (
              <button
                key={member.user_email}
                type="button"
                onClick={() => setNewComment(prev => prev + `@${member.user_email.split('@')[0]} `)}
                className="text-xs px-2 py-1 rounded-lg hover:opacity-80 transition-opacity"
                style={{ backgroundColor: `${tokens.accent}15`, color: tokens.accent }}
              >
                @{member.user_email.split('@')[0]}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!newComment.trim() || addCommentMutation.isLoading}
            style={{ backgroundColor: tokens.accent }}
            className="text-white"
          >
            <Send className="w-3 h-3 mr-2" />
            Comment
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3 mt-4">
        {comments.length === 0 ? (
          <div className="text-center py-8" style={{ color: tokens.subtle }}>
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No comments yet. Start the conversation!</p>
          </div>
        ) : (
          comments.map(comment => (
            <div 
              key={comment.id}
              className="p-3 rounded-xl border"
              style={{ borderColor: tokens.border }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                    style={{ backgroundColor: tokens.accent }}
                  >
                    {comment.author_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: tokens.color }}>
                      {comment.author_name}
                    </div>
                    <div className="text-xs" style={{ color: tokens.subtle }}>
                      {format(new Date(comment.created_date), 'MMM d, h:mm a')}
                    </div>
                  </div>
                </div>
                {comment.author_email === user?.email && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCommentMutation.mutate(comment.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <p className="text-sm" style={{ color: tokens.color }}>
                {comment.content.split(/(@\S+)/).map((part, i) => 
                  part.startsWith('@') ? (
                    <span key={i} className="font-medium" style={{ color: tokens.accent }}>
                      {part}
                    </span>
                  ) : part
                )}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TaskComments;