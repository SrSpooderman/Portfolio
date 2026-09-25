import type { Preview } from '@storybook/react-vite';
import '../src/style.css';
import '../src/extras.css';

const preview: Preview = {
  parameters: { layout: 'centered', a11y: { test: 'error' } },
};

export default preview;
