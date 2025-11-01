import { useUiStore } from '../stores/uiStore.js';

const getTargetElement = element => 
  typeof element === 'string' ? document.querySelector(element) : element;

const formatTimestamp = () => new Date().toISOString().slice(0, 19).replace(/:/g, '-');

export const captureScreenshot = async (element, options = {}) => {
  try {
    const { default: html2canvas } = await import('html2canvas');
    const targetElement = getTargetElement(element);
    if (!targetElement) throw new Error('Target element not found for screenshot capture');
    
    const canvas = await html2canvas(targetElement, {
      backgroundColor: '#ffffff',
      scale: options.scale || 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: targetElement.scrollWidth,
      height: targetElement.scrollHeight,
      ...options
    });
    
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
    console.log('Screenshot captured:', { width: canvas.width, height: canvas.height, timestamp: new Date().toISOString() });
    return blob;
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    throw error;
  }
};

export const captureFullPageScreenshot = async () => 
  await captureScreenshot(document.body, {
    width: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    scale: 1.5
  });

export const downloadScreenshot = async (blob, filename = 'seNARS-screenshot') => {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${formatTimestamp()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Screenshot downloaded:', a.download);
  } catch (error) {
    console.error('Screenshot download failed:', error);
    throw error;
  }
};

export const capturePanelScreenshot = async (panelId, panelName = 'panel') => {
  try {
    const element = document.getElementById(panelId);
    if (!element) throw new Error(`Panel with ID ${panelId} not found`);
    const blob = await captureScreenshot(element);
    await downloadScreenshot(blob, `seNARS-${panelName}`);
  } catch (error) {
    console.error(`Failed to capture panel ${panelId}:`, error);
    throw error;
  }
};

export const captureApplicationScreenshot = async () => {
  try {
    const blob = await captureFullPageScreenshot();
    await downloadScreenshot(blob, 'seNARS-application');
  } catch (error) {
    console.error('Failed to capture application screenshot:', error);
    throw error;
  }
};

export const captureAnnotatedScreenshot = async (element, annotations = []) => {
  try {
    const { default: html2canvas } = await import('html2canvas');
    const targetElement = getTargetElement(element);
    if (!targetElement) throw new Error('Target element not found for screenshot capture');
    
    const annotationElements = [];
    annotations.forEach((annotation, index) => {
      const annotationEl = document.createElement('div');
      Object.assign(annotationEl.style, {
        position: 'absolute',
        left: `${annotation.x}px`,
        top: `${annotation.y}px`,
        backgroundColor: 'rgba(255, 255, 0, 0.7)',
        border: '2px solid red',
        borderRadius: '4px',
        padding: '4px',
        zIndex: '10000',
        fontSize: '12px',
        fontWeight: 'bold'
      });
      annotationEl.textContent = `${index + 1}`;
      annotationEl.dataset.annotationId = `annotation-${index}`;
      annotationElements.push(annotationEl);
      targetElement.appendChild(annotationEl);
    });
    
    const canvas = await html2canvas(targetElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    });
    
    annotationElements.forEach(el => el.parentNode?.removeChild(el));
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
  } catch (error) {
    console.error('Annotated screenshot capture failed:', error);
    throw error;
  }
};

export const uploadScreenshot = async (blob, options = {}) => {
  console.log('Simulating screenshot upload...', {
    size: blob.size,
    type: blob.type,
    timestamp: new Date().toISOString()
  });
  const placeholderUrl = `https://example.com/seNARS-screenshots/${Date.now()}.png`;
  console.log('Screenshot uploaded to:', placeholderUrl);
  return placeholderUrl;
};

export default {
  captureScreenshot,
  captureFullPageScreenshot,
  downloadScreenshot,
  capturePanelScreenshot,
  captureApplicationScreenshot,
  captureAnnotatedScreenshot,
  uploadScreenshot
};