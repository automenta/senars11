import LogEntry from '../components/LogEntry';

export default {
  title: 'Components/LogEntry',
  component: LogEntry,
};

const Template = (args) => <LogEntry {...args} />;

export const Default = Template.bind({});
Default.args = {
  message: 'This is a log entry.',
};
