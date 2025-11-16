import { InputBar } from './InputBar';

export default {
  title: 'Components/InputBar',
  component: InputBar,
  tags: ['autodocs'],
};

export const Default = {
  args: {
    onInput: (value) => alert(`Input: ${value}`),
  },
};
