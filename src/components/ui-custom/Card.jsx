
import { Card } from '@/components/ui/card';

// Re-export for components that import from ui-custom/Card
export { Card } from '@/components/ui/card';

export default {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'accent'],
    },
  },
};

export const Default = {
  args: {
    children: (
      <div className="p-6">
        <h3 className="text-lg font-bold mb-2">Card Title</h3>
        <p className="text-sm">This is a default card component with some content inside.</p>
      </div>
    ),
  },
};

export const Accent = {
  args: {
    variant: 'accent',
    children: (
      <div className="p-6">
        <h3 className="text-lg font-bold mb-2">Accent Card</h3>
        <p className="text-sm">This card uses the accent variant for emphasis.</p>
      </div>
    ),
  },
};

export const WithStats = {
  args: {
    children: (
      <div className="p-6">
        <div className="text-3xl font-bold mb-2">42</div>
        <div className="text-sm opacity-80">Tasks Completed</div>
      </div>
    ),
  },
};
