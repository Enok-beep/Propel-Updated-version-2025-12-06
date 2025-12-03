import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Phone, Mail, Building, Edit2, Trash2, 
  CheckSquare, Briefcase, Lightbulb, PhoneCall, Copy
} from 'lucide-react';
import { ReminderBubble } from '../reminders/ReminderBubble';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function ContactProfile({ contact, onBack, onEdit }) {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  const [showQuickDial, setShowQuickDial] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date', 100),
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => base44.entities.QuickReminder.list('-priority', 100),
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      onBack();
    },
  });

  // Filter tasks that mention contact name or email
  const relatedTasks = tasks.filter(t => 
    t.title?.toLowerCase().includes(contact.name.toLowerCase()) ||
    t.description?.toLowerCase().includes(contact.name.toLowerCase()) ||
    (contact.email && t.description?.includes(contact.email))
  );

  // Filter projects
  const relatedProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(contact.name.toLowerCase()) ||
    p.description?.toLowerCase().includes(contact.name.toLowerCase())
  );

  // Filter reminders by phone numbers or contact name
  const relatedReminders = reminders.filter(r =>
    r.contact_names?.some(name => 
      name.toLowerCase().includes(contact.name.toLowerCase())
    ) ||
    r.phone_numbers?.some(phone => 
      contact.phone_numbers?.includes(phone)
    )
  );

  const handleQuickDial = (phoneNumber) => {
    setShowQuickDial(true);
    
    // Update last contacted
    updateContactMutation.mutate({
      id: contact.id,
      data: { ...contact, last_contacted: new Date().toISOString() }
    });

    // Attempt to initiate call (works on mobile devices)
    window.location.href = `tel:${phoneNumber}`;
    
    toast.success('Quick Dial activated - Reminders displayed');
  };

  const handleCopyPhone = (phone) => {
    navigator.clipboard.writeText(phone);
    toast.success('Phone number copied');
  };

  return (
    <div 
      className="min-h-screen p-6 pb-24 lg:pb-6"
      style={{ backgroundColor: tokens.bg }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold" style={{ color: tokens.color }}>
              {contact.name}
            </h1>
            {contact.company && (
              <p className="text-sm" style={{ color: tokens.subtle }}>
                {contact.role ? `${contact.role} at ` : ''}{contact.company}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={() => onEdit(contact)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              if (confirm('Delete this contact?')) {
                deleteContactMutation.mutate(contact.id);
              }
            }}
            className="text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Contact Card */}
        <div 
          className="rounded-2xl p-6 mb-6 border"
          style={{ 
            backgroundColor: tokens.card,
            borderColor: tokens.border
          }}
        >
          <div className="flex items-start gap-4 mb-6">
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
              style={{ backgroundColor: `${tokens.accent}15` }}
            >
              {contact.avatar || '👤'}
            </div>
            <div className="flex-1">
              <div className="space-y-3">
                {contact.phone_numbers?.map((phone, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Phone className="w-4 h-4" style={{ color: tokens.subtle }} />
                    <span style={{ color: tokens.color }}>{phone}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyPhone(phone)}
                      className="ml-auto"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleQuickDial(phone)}
                      style={{ backgroundColor: tokens.accent }}
                      className="text-white"
                    >
                      <PhoneCall className="w-4 h-4 mr-2" />
                      Quick Dial
                    </Button>
                  </div>
                ))}
                {contact.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4" style={{ color: tokens.subtle }} />
                    <a 
                      href={`mailto:${contact.email}`}
                      style={{ color: tokens.accent }}
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {contact.notes && (
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: tokens.bg }}
            >
              <p className="text-sm" style={{ color: tokens.color }}>
                {contact.notes}
              </p>
            </div>
          )}

          {contact.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {contact.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg text-sm"
                  style={{ backgroundColor: `${tokens.accent}15`, color: tokens.accent }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {contact.last_contacted && (
            <div className="text-xs mt-4 pt-4 border-t" style={{ color: tokens.subtle, borderColor: tokens.border }}>
              Last contacted: {format(new Date(contact.last_contacted), 'MMM d, yyyy h:mm a')}
            </div>
          )}
        </div>

        {/* Quick Dial Reminder Overlay */}
        {showQuickDial && relatedReminders.length > 0 && (
          <div 
            className="rounded-2xl p-6 mb-6 border-l-4 animate-in slide-in-from-top"
            style={{ 
              backgroundColor: tokens.card,
              borderLeftColor: tokens.accent,
              borderTop: `1px solid ${tokens.border}`,
              borderRight: `1px solid ${tokens.border}`,
              borderBottom: `1px solid ${tokens.border}`
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5" style={{ color: tokens.accent }} />
                <span className="font-semibold" style={{ color: tokens.color }}>
                  Quick Dial Active - Important Reminders
                </span>
              </div>
              <button
                onClick={() => setShowQuickDial(false)}
                className="text-sm"
                style={{ color: tokens.subtle }}
              >
                Dismiss
              </button>
            </div>
            <div className="space-y-3">
              {relatedReminders.slice(0, 3).map(reminder => (
                <ReminderBubble key={reminder.id} reminder={reminder} />
              ))}
            </div>
          </div>
        )}

        {/* Related Reminders */}
        {relatedReminders.length > 0 && (
          <div 
            className="rounded-2xl p-6 mb-6 border"
            style={{ 
              backgroundColor: tokens.card,
              borderColor: tokens.border
            }}
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: tokens.color }}>
              <Lightbulb className="w-5 h-5" style={{ color: tokens.accent }} />
              Quick Reminders ({relatedReminders.length})
            </h3>
            <div className="space-y-3">
              {relatedReminders.map(reminder => (
                <ReminderBubble key={reminder.id} reminder={reminder} compact />
              ))}
            </div>
          </div>
        )}

        {/* Related Tasks */}
        {relatedTasks.length > 0 && (
          <div 
            className="rounded-2xl p-6 mb-6 border"
            style={{ 
              backgroundColor: tokens.card,
              borderColor: tokens.border
            }}
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: tokens.color }}>
              <CheckSquare className="w-5 h-5" style={{ color: tokens.accent }} />
              Related Tasks ({relatedTasks.length})
            </h3>
            <div className="space-y-2">
              {relatedTasks.map(task => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: tokens.bg }}
                >
                  <div className="font-medium" style={{ color: tokens.color }}>
                    {task.title}
                  </div>
                  <div className="text-sm" style={{ color: tokens.subtle }}>
                    {task.status} • {task.priority} priority
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Projects */}
        {relatedProjects.length > 0 && (
          <div 
            className="rounded-2xl p-6 border"
            style={{ 
              backgroundColor: tokens.card,
              borderColor: tokens.border
            }}
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: tokens.color }}>
              <Briefcase className="w-5 h-5" style={{ color: tokens.accent }} />
              Related Projects ({relatedProjects.length})
            </h3>
            <div className="space-y-2">
              {relatedProjects.map(project => (
                <div
                  key={project.id}
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: tokens.bg }}
                >
                  <div className="font-medium" style={{ color: tokens.color }}>
                    {project.name}
                  </div>
                  {project.description && (
                    <div className="text-sm" style={{ color: tokens.subtle }}>
                      {project.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ContactProfile;