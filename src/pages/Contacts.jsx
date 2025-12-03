import React, { useState } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Phone, Users } from 'lucide-react';
import { ContactProfile } from '@/components/contacts/ContactProfile';
import { ContactForm } from '@/components/contacts/ContactForm';
import { cn } from '@/lib/utils';

export default function Contacts() {
  const { tokens } = useTheme();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list('-last_contacted', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setShowForm(false);
      setEditingContact(null);
    },
  });

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setSelectedContact(null);
    setShowForm(true);
  };

  if (selectedContact) {
    return (
      <ContactProfile
        contact={selectedContact}
        onBack={() => setSelectedContact(null)}
        onEdit={() => handleEdit(selectedContact)}
      />
    );
  }

  return (
    <div 
      className="min-h-screen p-6 pb-24 lg:pb-6"
      style={{ backgroundColor: tokens.bg }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: tokens.color }}>
              <Users className="w-8 h-8" style={{ color: tokens.accent }} />
              Contacts
            </h1>
            <p className="text-sm mt-1" style={{ color: tokens.subtle }}>
              Manage contacts with linked tasks, projects, and reminders
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            style={{ backgroundColor: tokens.accent }}
            className="text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: tokens.subtle }} />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
            style={{ backgroundColor: tokens.card, color: tokens.color }}
          />
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => (
            <button
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={cn(
                "p-5 rounded-2xl border text-left transition-all",
                "hover:scale-[1.02] hover:shadow-lg"
              )}
              style={{
                backgroundColor: tokens.card,
                borderColor: tokens.border
              }}
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${tokens.accent}15` }}
                >
                  {contact.avatar || '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate" style={{ color: tokens.color }}>
                    {contact.name}
                  </div>
                  {contact.company && (
                    <div className="text-sm truncate" style={{ color: tokens.subtle }}>
                      {contact.company}
                    </div>
                  )}
                  {contact.phone_numbers?.length > 0 && (
                    <div className="flex items-center gap-1 text-xs mt-1" style={{ color: tokens.subtle }}>
                      <Phone className="w-3 h-3" />
                      {contact.phone_numbers[0]}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredContacts.length === 0 && (
          <div 
            className="text-center py-16 rounded-2xl border"
            style={{ 
              color: tokens.subtle,
              borderColor: tokens.border
            }}
          >
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No contacts found</p>
          </div>
        )}

        {/* Contact Form Dialog */}
        {showForm && (
          <>
            <div 
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
              onClick={() => {
                setShowForm(false);
                setEditingContact(null);
              }}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div 
                className="w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                style={{ backgroundColor: tokens.card }}
                onClick={(e) => e.stopPropagation()}
              >
                <ContactForm
                  contact={editingContact}
                  onSubmit={(data) => {
                    if (editingContact) {
                      updateMutation.mutate({ id: editingContact.id, data });
                    } else {
                      createMutation.mutate(data);
                    }
                  }}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingContact(null);
                  }}
                  isLoading={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}