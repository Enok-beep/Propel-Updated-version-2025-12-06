import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus } from 'lucide-react';

export function ContactForm({ contact, onSubmit, onCancel, isLoading }) {
  const { tokens } = useTheme();
  
  const [formData, setFormData] = useState({
    name: contact?.name || '',
    phone_numbers: contact?.phone_numbers || [],
    email: contact?.email || '',
    company: contact?.company || '',
    role: contact?.role || '',
    avatar: contact?.avatar || '',
    notes: contact?.notes || '',
    tags: contact?.tags || []
  });

  const [phoneInput, setPhoneInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  const addPhone = () => {
    if (phoneInput.trim()) {
      setFormData({
        ...formData,
        phone_numbers: [...formData.phone_numbers, phoneInput.trim()]
      });
      setPhoneInput('');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: tokens.color }}>
          {contact ? 'Edit Contact' : 'Add Contact'}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-black/5"
          style={{ color: tokens.subtle }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-sm font-medium mb-1 block" style={{ color: tokens.color }}>
              Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="John Smith"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: tokens.color }}>
              Company
            </label>
            <Input
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              placeholder="Acme Inc."
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: tokens.color }}>
              Role
            </label>
            <Input
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              placeholder="CEO"
            />
          </div>

          <div className="col-span-2">
            <label className="text-sm font-medium mb-1 block" style={{ color: tokens.color }}>
              Email
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="john@example.com"
            />
          </div>

          <div className="col-span-2">
            <label className="text-sm font-medium mb-1 block" style={{ color: tokens.color }}>
              Avatar (emoji)
            </label>
            <Input
              value={formData.avatar}
              onChange={(e) => setFormData({...formData, avatar: e.target.value})}
              placeholder="👤"
              maxLength={2}
            />
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
            />
            <Button type="button" onClick={addPhone}>
              <Plus className="w-4 h-4" />
            </Button>
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
              placeholder="client, partner..."
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button type="button" onClick={addTag}>
              <Plus className="w-4 h-4" />
            </Button>
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

        <div>
          <label className="text-sm font-medium mb-1 block" style={{ color: tokens.color }}>
            Notes
          </label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Additional information..."
            className="h-20"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="flex-1 text-white"
            style={{ backgroundColor: tokens.accent }}
            disabled={isLoading}
          >
            {contact ? 'Update' : 'Create'} Contact
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ContactForm;