import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit2, Trash2, Lightbulb } from 'lucide-react';
import { ReminderBubble } from './ReminderBubble';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ReminderManager() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'other',
    priority: 'medium',
    phone_numbers: [],
    contact_names: [],
    tags: [],
    is_sensitive: false
  });

  const [phoneInput, setPhoneInput] = useState('');
  const [contactInput, setContactInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => base44.entities.QuickReminder.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.QuickReminder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QuickReminder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.QuickReminder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'other',
      priority: 'medium',
      phone_numbers: [],
      contact_names: [],
      tags: [],
      is_sensitive: false
    });
    setPhoneInput('');
    setContactInput('');
    setTagInput('');
    setEditingReminder(null);
    setShowForm(false);
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      content: reminder.content,
      type: reminder.type,
      priority: reminder.priority,
      phone_numbers: reminder.phone_numbers || [],
      contact_names: reminder.contact_names || [],
      tags: reminder.tags || [],
      is_sensitive: reminder.is_sensitive || false
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingReminder) {
      updateMutation.mutate({ id: editingReminder.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addPhone = () => {
    if (phoneInput.trim()) {
      setFormData({
        ...formData,
        phone_numbers: [...formData.phone_numbers, phoneInput.trim()]
      });
      setPhoneInput('');
    }
  };

  const addContact = () => {
    if (contactInput.trim()) {
      setFormData({
        ...formData,
        contact_names: [...formData.contact_names, contactInput.trim()]
      });
      setContactInput('');
    }
  };

  const addTag = () => {
    if (tagInput.trim()) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const filteredReminders = reminders.filter(r => {
    const matchesSearch = !searchQuery || 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.contact_names?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === 'all' || r.type === filterType;
    const matchesPriority = filterPriority === 'all' || r.priority === filterPriority;
    
    return matchesSearch && matchesType && matchesPriority;
  });

  return (
    <div 
      className="min-h-screen p-6"
      style={{ backgroundColor: tokens.bg }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: tokens.color }}>
              <Lightbulb className="w-8 h-8" style={{ color: tokens.accent }} />
              Quick Reminders
            </h1>
            <p className="text-sm mt-1" style={{ color: tokens.subtle }}>
              Important info at your fingertips - serial numbers, passwords, contact details
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            style={{ backgroundColor: tokens.accent }}
            className="text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Reminder
          </Button>
        </div>

        {/* Filters */}
        <div 
          className="rounded-2xl p-4 mb-6 border"
          style={{ 
            backgroundColor: tokens.card,
            borderColor: tokens.border
          }}
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: tokens.subtle }} />
              <Input
                placeholder="Search reminders, contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                style={{ backgroundColor: tokens.bg, color: tokens.color }}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40" style={{ color: tokens.color }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="serial_number">Serial Numbers</SelectItem>
                <SelectItem value="password">Passwords</SelectItem>
                <SelectItem value="contact_info">Contact Info</SelectItem>
                <SelectItem value="key_phrase">Key Phrases</SelectItem>
                <SelectItem value="instruction">Instructions</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full sm:w-40" style={{ color: tokens.color }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reminder List */}
        <div className="space-y-3">
          {filteredReminders.map(reminder => (
            <div key={reminder.id} className="relative group">
              <ReminderBubble reminder={reminder} compact />
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(reminder)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm('Delete this reminder?')) {
                      deleteMutation.mutate(reminder.id);
                    }
                  }}
                  className="text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {filteredReminders.length === 0 && (
            <div 
              className="text-center py-16 rounded-2xl border"
              style={{ 
                color: tokens.subtle,
                borderColor: tokens.border
              }}
            >
              <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No reminders found</p>
            </div>
          )}
        </div>

        {/* Form Dialog */}
        {showForm && (
          <>
            <div 
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
              onClick={resetForm}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div 
                className="w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                style={{ backgroundColor: tokens.card }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4" style={{ color: tokens.color }}>
                    {editingReminder ? 'Edit Reminder' : 'Add Quick Reminder'}
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block" style={{ color: tokens.color }}>
                        Title
                      </label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="e.g., Project X Serial Number"
                        required
                        style={{ color: tokens.color }}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block" style={{ color: tokens.color }}>
                        Content
                      </label>
                      <Textarea
                        value={formData.content}
                        onChange={(e) => setFormData({...formData, content: e.target.value})}
                        placeholder="The important information..."
                        className="h-24"
                        required
                        style={{ color: tokens.color }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block" style={{ color: tokens.color }}>
                          Type
                        </label>
                        <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="serial_number">🔢 Serial Number</SelectItem>
                            <SelectItem value="password">🔐 Password</SelectItem>
                            <SelectItem value="contact_info">📞 Contact Info</SelectItem>
                            <SelectItem value="key_phrase">💬 Key Phrase</SelectItem>
                            <SelectItem value="instruction">📋 Instruction</SelectItem>
                            <SelectItem value="other">💡 Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block" style={{ color: tokens.color }}>
                          Priority
                        </label>
                        <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="critical">🔴 Critical</SelectItem>
                            <SelectItem value="high">🟠 High</SelectItem>
                            <SelectItem value="medium">🟡 Medium</SelectItem>
                            <SelectItem value="low">🟢 Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 flex items-center gap-2" style={{ color: tokens.color }}>
                        <input
                          type="checkbox"
                          checked={formData.is_sensitive}
                          onChange={(e) => setFormData({...formData, is_sensitive: e.target.checked})}
                        />
                        Mark as Sensitive (blur by default)
                      </label>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block" style={{ color: tokens.color }}>
                        Associated Contacts
                      </label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={contactInput}
                          onChange={(e) => setContactInput(e.target.value)}
                          placeholder="Contact name"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addContact())}
                          style={{ color: tokens.color }}
                        />
                        <Button type="button" onClick={addContact}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.contact_names.map((contact, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-lg text-sm flex items-center gap-2"
                            style={{ backgroundColor: `${tokens.accent}15`, color: tokens.accent }}
                          >
                            {contact}
                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                contact_names: formData.contact_names.filter((_, idx) => idx !== i)
                              })}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block" style={{ color: tokens.color }}>
                        Phone Numbers
                      </label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="+1234567890"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPhone())}
                          style={{ color: tokens.color }}
                        />
                        <Button type="button" onClick={addPhone}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.phone_numbers.map((phone, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-lg text-sm flex items-center gap-2"
                            style={{ backgroundColor: `${tokens.accent}15`, color: tokens.accent }}
                          >
                            {phone}
                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                phone_numbers: formData.phone_numbers.filter((_, idx) => idx !== i)
                              })}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block" style={{ color: tokens.color }}>
                        Tags
                      </label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder="Add tag"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                          style={{ color: tokens.color }}
                        />
                        <Button type="button" onClick={addTag}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-lg text-sm flex items-center gap-2"
                            style={{ backgroundColor: `${tokens.accent}15`, color: tokens.accent }}
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                tags: formData.tags.filter((_, idx) => idx !== i)
                              })}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 text-white"
                        style={{ backgroundColor: tokens.accent }}
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {editingReminder ? 'Update' : 'Create'} Reminder
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ReminderManager;