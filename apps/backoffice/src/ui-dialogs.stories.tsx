import type { Meta, StoryObj } from '@storybook/react-vite';
import { CreatePageDialog } from './ui-dialogs';

const meta = {
  title: 'Backoffice/CreatePageDialog',
  component: CreatePageDialog,
  args: {
    open: true,
    isFirstPage: false,
    onOpenChange: () => undefined,
    onCreate: async () => undefined,
  },
} satisfies Meta<typeof CreatePageDialog>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const FirstPage: Story = { args: { isFirstPage: true } };
