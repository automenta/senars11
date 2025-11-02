import { useUiStore } from '../stores/uiStore.js';

let isRecording = false;
let recordedEvents = [];
let startTime = null;
let recordingInterval = null;

const formatTimestamp = () => new Date().toISOString();

export const startRecording = async () => {
  if (isRecording) {
    console.warn('Recording already in progress');
    return;
  }
  
  isRecording = true;
  recordedEvents = [];
  startTime = Date.now();
  console.log('Recording started at:', formatTimestamp());
  subscribeToEvents();
  recordEvent({ type: 'recording.start', timestamp: startTime, data: { startTime: formatTimestamp() } });
};

export const stopRecording = async () => {
  if (!isRecording) {
    console.warn('No recording in progress');
    return recordedEvents;
  }
  
  isRecording = false;
  const stopTime = Date.now();
  recordEvent({ 
    type: 'recording.stop', 
    timestamp: stopTime, 
    data: { stopTime: formatTimestamp(), duration: stopTime - startTime } 
  });
  
  console.log('Recording stopped at:', formatTimestamp(), 'Duration:', (stopTime - startTime) / 1000, 'seconds');
  unsubscribeFromEvents();
  return recordedEvents;
};

export const recordEvent = (event) => {
  if (!isRecording) return;
  
  const timestamp = event.timestamp || Date.now();
  const recordedEvent = { ...event, timestamp, relativeTime: timestamp - startTime };
  recordedEvents.push(recordedEvent);
  console.log('Recorded event:', recordedEvent.type, 'at', formatTimestamp());
};

const subscribeToEvents = () => {
  window.addEventListener('reasoning.event', (event) => {
    if (isRecording) recordEvent({ type: 'reasoning.event', data: event.detail, timestamp: Date.now() });
  });
  
  window.addEventListener('ui.interaction', (event) => {
    if (isRecording) recordEvent({ type: 'ui.interaction', data: event.detail, timestamp: Date.now() });
  });
  
  recordingInterval = setInterval(() => {
    if (isRecording) recordEvent({
      type: 'recording.status',
      data: { eventCount: recordedEvents.length, currentDuration: Date.now() - startTime },
      timestamp: Date.now()
    });
  }, 5000);
};

const unsubscribeFromEvents = () => {
  if (recordingInterval) {
    clearInterval(recordingInterval);
    recordingInterval = null;
  }
};

export const captureReasoningSequence = async (durationMs = 10000) => {
  await startRecording();
  return new Promise((resolve) => setTimeout(async () => resolve(await stopRecording()), durationMs));
};

export const exportRecording = async (events = recordedEvents, filename = 'seNARS-recording') => {
  try {
    const dataStr = JSON.stringify(events, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${formatTimestamp().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Recording exported:', a.download);
  } catch (error) {
    console.error('Recording export failed:', error);
    throw error;
  }
};

export const importRecording = async (file) => 
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const events = JSON.parse(event.target.result);
        console.log('Recording imported:', events.length, 'events');
        resolve(events);
      } catch (error) {
        console.error('Failed to parse recording file:', error);
        reject(error);
      }
    };
    reader.onerror = (error) => {
      console.error('Failed to read recording file:', error);
      reject(error);
    };
    reader.readAsText(file);
  });

export const playbackRecording = async (events, callback) => {
  if (!Array.isArray(events) || events.length === 0) {
    console.warn('No events to playback');
    return;
  }
  
  const sortedEvents = events.sort((a, b) => a.relativeTime - b.relativeTime);
  const playbackStart = Date.now();
  console.log('Starting playback of', sortedEvents.length, 'events');
  
  for (const event of sortedEvents) {
    const elapsed = Date.now() - playbackStart;
    const delay = Math.max(0, event.relativeTime - elapsed);
    
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
    if (typeof callback === 'function') callback(event);
    console.log('Played back event:', event.type, 'at', formatTimestamp());
  }
  
  console.log('Playback completed');
};

export const getRecordingStatus = () => ({
  isRecording,
  eventCount: recordedEvents.length,
  duration: isRecording ? Date.now() - startTime : 0,
  startTime: startTime ? formatTimestamp() : null
});

export const clearRecording = () => {
  recordedEvents = [];
  console.log('Recording cleared');
};

export default {
  startRecording,
  stopRecording,
  recordEvent,
  captureReasoningSequence,
  exportRecording,
  importRecording,
  playbackRecording,
  getRecordingStatus,
  clearRecording
};