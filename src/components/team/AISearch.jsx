import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '../ui-custom/Card';
import { Search, Loader2, FileText, Calendar, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export function AISearch({ teamId }) {
  const { tokens } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const { data: documents = [] } = useQuery({
    queryKey: ['allDocuments', teamId],
    queryFn: () => base44.entities.ProjectDocument.filter({ team_id: teamId }),
    enabled: !!teamId,
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['allMeetings', teamId],
    queryFn: () => base44.entities.Meeting.filter({ team_id: teamId }),
    enabled: !!teamId,
  });

  const performSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      // Prepare search context
      const documentContext = documents.map(doc => ({
        id: doc.id,
        type: 'document',
        title: doc.title,
        content: doc.content.substring(0, 1000),
        tags: doc.tags,
        created_date: doc.created_date,
        project_id: doc.project_id
      }));

      const meetingContext = meetings.map(meeting => ({
        id: meeting.id,
        type: 'meeting',
        title: meeting.title,
        notes: meeting.notes?.substring(0, 1000),
        ai_summary: meeting.ai_summary,
        date: meeting.date,
        project_id: meeting.project_id,
        key_decisions: meeting.key_decisions
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI search assistant. A user is searching project content with this query:

"${query}"

Available Content:
Documents: ${JSON.stringify(documentContext, null, 2)}
Meetings: ${JSON.stringify(meetingContext, null, 2)}

Analyze the query intent and find the most relevant content. Return:
1. Top 5 most relevant items (documents or meetings)
2. Brief explanation of why each is relevant
3. Key excerpts or highlights from the content
4. Confidence score (0-100) for each result

Consider:
- Semantic meaning, not just keyword matching
- Context and relationships between items
- Recency if time-relevant
- Direct answers if the query is a question`,
        response_json_schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  type: { type: "string" },
                  title: { type: "string" },
                  relevance_reason: { type: "string" },
                  excerpt: { type: "string" },
                  confidence: { type: "number" }
                }
              }
            },
            summary: { type: "string" },
            direct_answer: { type: "string" }
          }
        }
      });

      setResults(result);
    } catch (error) {
      console.error('Search failed:', error);
      setResults({ results: [], summary: 'Search failed. Please try again.' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  const getFullItem = (resultId, resultType) => {
    if (resultType === 'document') {
      return documents.find(d => d.id === resultId);
    } else {
      return meetings.find(m => m.id === resultId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
            style={{ color: tokens.subtle }} 
          />
          <Input
            placeholder="Search documents and meetings... (e.g., 'What was decided about the redesign?')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSearching}
            className="pl-10"
            style={{ borderColor: tokens.border }}
          />
        </div>
        <Button
          onClick={performSearch}
          disabled={!query.trim() || isSearching}
          style={{ backgroundColor: tokens.accent }}
          className="text-white"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Direct Answer */}
          {results.direct_answer && (
            <Card variant="accent">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: tokens.accent }} />
                <div>
                  <div className="text-sm font-semibold mb-1" style={{ color: tokens.color }}>
                    Quick Answer
                  </div>
                  <p className="text-sm" style={{ color: tokens.subtle }}>
                    {results.direct_answer}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Summary */}
          {results.summary && (
            <div className="text-sm" style={{ color: tokens.subtle }}>
              {results.summary}
            </div>
          )}

          {/* Search Results */}
          {results.results?.length > 0 ? (
            <div className="space-y-3">
              {results.results.map((result, idx) => {
                const fullItem = getFullItem(result.id, result.type);
                if (!fullItem) return null;

                return (
                  <Card key={idx} className="hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      {result.type === 'document' ? (
                        <FileText className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: tokens.accent }} />
                      ) : (
                        <Calendar className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: tokens.accent }} />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-sm" style={{ color: tokens.color }}>
                            {result.title}
                          </h4>
                          <div 
                            className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ 
                              backgroundColor: result.confidence > 80 
                                ? '#DEF7EC' 
                                : result.confidence > 60 
                                ? '#FEF3C7' 
                                : '#FEE2E2',
                              color: result.confidence > 80 
                                ? '#03543F' 
                                : result.confidence > 60 
                                ? '#92400E' 
                                : '#991B1B'
                            }}
                          >
                            {result.confidence}% match
                          </div>
                        </div>

                        <p className="text-xs mb-2" style={{ color: tokens.subtle }}>
                          {result.type === 'document' ? '📄 Document' : '📅 Meeting'}
                          {fullItem.created_date && (
                            <> • {format(new Date(fullItem.created_date), 'MMM d, yyyy')}</>
                          )}
                          {result.type === 'meeting' && fullItem.date && (
                            <> • {format(new Date(fullItem.date), 'MMM d, yyyy')}</>
                          )}
                        </p>

                        <div 
                          className="text-xs mb-2 p-2 rounded-lg"
                          style={{ backgroundColor: `${tokens.accent}05`, color: tokens.subtle }}
                        >
                          <div className="font-medium mb-1" style={{ color: tokens.accent }}>
                            Why this is relevant:
                          </div>
                          {result.relevance_reason}
                        </div>

                        {result.excerpt && (
                          <div 
                            className="text-xs p-2 rounded-lg border-l-2"
                            style={{ 
                              backgroundColor: `${tokens.accent}05`,
                              borderColor: tokens.accent,
                              color: tokens.subtle
                            }}
                          >
                            "{result.excerpt}"
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <div className="text-center py-8" style={{ color: tokens.subtle }}>
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No results found for "{query}"</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Initial State */}
      {!results && !isSearching && (documents.length > 0 || meetings.length > 0) && (
        <Card>
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: tokens.accent }} />
            <p className="text-sm mb-2" style={{ color: tokens.color }}>
              AI-Powered Search
            </p>
            <p className="text-xs" style={{ color: tokens.subtle }}>
              Ask questions or search using natural language
            </p>
            <div className="mt-4 space-y-1 text-xs" style={{ color: tokens.subtle }}>
              <p>Try: "What was decided in the last sprint planning?"</p>
              <p>Or: "Show me documents about the API redesign"</p>
            </div>
          </div>
        </Card>
      )}

      {!isSearching && documents.length === 0 && meetings.length === 0 && (
        <Card>
          <div className="text-center py-8" style={{ color: tokens.subtle }}>
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No documents or meetings to search</p>
          </div>
        </Card>
      )}
    </div>
  );
}

export default AISearch;