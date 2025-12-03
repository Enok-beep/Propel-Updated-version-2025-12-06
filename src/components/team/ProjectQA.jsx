import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '../ui-custom/Card';
import { MessageSquare, Loader2, Sparkles, FileText } from 'lucide-react';

export function ProjectQA({ projectId, teamId }) {
  const { tokens } = useTheme();
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isAsking, setIsAsking] = useState(false);

  const { data: documents = [] } = useQuery({
    queryKey: ['projectDocs', projectId],
    queryFn: () => base44.entities.ProjectDocument.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: async () => {
      const allTasks = await base44.entities.Task.list();
      return allTasks.filter(t => t.project_id === projectId);
    },
    enabled: !!projectId,
  });

  const askQuestion = async () => {
    if (!question.trim()) return;

    const userMessage = { role: 'user', content: question };
    setConversation(prev => [...prev, userMessage]);
    setQuestion('');
    setIsAsking(true);

    try {
      // Build context from project docs and tasks
      const context = {
        documents: documents.map(d => ({
          title: d.title,
          content: d.content.substring(0, 2000) // Limit length
        })),
        tasks: tasks.map(t => ({
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          assigned_to: t.assigned_to
        }))
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI assistant helping answer questions about a project. Use the provided context to answer accurately.

Project Context:
Documents: ${JSON.stringify(context.documents, null, 2)}
Tasks: ${JSON.stringify(context.tasks, null, 2)}

Previous conversation:
${conversation.map(m => `${m.role}: ${m.content}`).join('\n')}

User question: ${question}

Provide a helpful, accurate answer based on the context. If you don't have enough information, say so.`,
        response_json_schema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            sources: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const aiMessage = {
        role: 'assistant',
        content: result.answer,
        confidence: result.confidence,
        sources: result.sources
      };

      setConversation(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Q&A failed:', error);
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        error: true
      }]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  return (
    <Card>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5" style={{ color: tokens.accent }} />
          <h3 className="font-semibold" style={{ color: tokens.color }}>
            Project Q&A Assistant
          </h3>
        </div>

        {documents.length === 0 && tasks.length === 0 && (
          <div className="text-center py-8" style={{ color: tokens.subtle }}>
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Add project documents to enable AI-powered Q&A</p>
          </div>
        )}

        {/* Conversation */}
        {conversation.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'ml-8' 
                    : 'mr-8'
                }`}
                style={{
                  backgroundColor: msg.role === 'user' 
                    ? tokens.accent 
                    : msg.error 
                    ? '#FEE2E2' 
                    : `${tokens.accent}10`,
                  color: msg.role === 'user' ? 'white' : tokens.color
                }}
              >
                <div className="flex items-start gap-2">
                  {msg.role === 'assistant' && <Sparkles className="w-4 h-4 mt-1 flex-shrink-0" />}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.confidence && (
                      <div className="mt-2 text-xs opacity-75">
                        Confidence: {msg.confidence}
                      </div>
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 text-xs opacity-75">
                        Sources: {msg.sources.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        {(documents.length > 0 || tasks.length > 0) && (
          <div className="flex gap-2">
            <Input
              placeholder="Ask about the project..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isAsking}
              style={{ borderColor: tokens.border }}
            />
            <Button
              onClick={askQuestion}
              disabled={!question.trim() || isAsking}
              style={{ backgroundColor: tokens.accent }}
              className="text-white"
            >
              {isAsking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default ProjectQA;