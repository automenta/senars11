import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Function to generate demo movies using Playwright's built-in video recording
async function generateDemoMovies() {
  const browser = await chromium.launch({ 
    headless: false, // Set to true to run in headless mode 
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: './demo-videos',
      size: { width: 1280, height: 720 },
    }
  });

  // Create directory if it doesn't exist
  const videosDir = './demo-videos';
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  const page = await context.newPage();

  try {
    // Navigate to the app
    console.log('Navigating to the Reasoning Engine UI...');
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load and WebSocket to connect
    await page.waitForSelector('#websocket-status', { state: 'visible', timeout: 15000 });
    console.log('Connected to WebSocket, starting demo recordings...');

    // FIRST FUNCTION: Wait for demos to load - wait for "Demos" panel to be visible first
    await page.waitForSelector('text=Demos', { timeout: 15000 });
    
    // Wait longer for WebSocket data to populate the demo list
    await page.waitForTimeout(8000); // Wait longer for demos to be populated via WebSocket simulation
    
    // Wait specifically for the "Start" buttons to appear (they should appear after demo data loads)
    try {
      await page.waitForSelector('button:has-text("Start")', { timeout: 15000 });
      console.log('Start buttons found!');
    } catch (e) {
      console.log('Start buttons still not found after waiting - this may be expected if no demos are available');
      // Continue anyway, as there might be no demos available
    }
    
    // Get all demo start buttons - try multiple approaches if needed
    let demoButtons = await page.locator('text=Start').locator('..button').all(); // buttons that contain "Start" text
    
    if (demoButtons.length === 0) {
      // Alternative approach: look for buttons within demo panels
      demoButtons = await page.locator('button:has-text("Start")').all();
    }
    
    if (demoButtons.length === 0) {
      // If still no buttons found, try to locate any buttons in the demo area
      const demoPanel = await page.locator('text=Demos').first().locator('..').locator('..'); // Move up to panel container
      demoButtons = await demoPanel.locator('button').all();
    }
    
    // Filter buttons to only those with "Start" text
    const startButtons = [];
    for (const button of demoButtons) {
      const buttonText = await button.textContent();
      if (buttonText && buttonText.trim() === 'Start') {
        startButtons.push(button);
      }
    }
    
    console.log(`Found ${startButtons.length} demo start buttons to record`);

    for (let i = 0; i < startButtons.length; i++) {
      const demoButton = startButtons[i];
      
      // Get the demo name from the parent element
      const demoNameElement = demoButton.locator('xpath=../../..//div[contains(@class, "panel-title") or contains(text(), "Demo")]').first();
      let demoName = `Demo-${i + 1}`;
      
      try {
        demoName = await demoNameElement.textContent();
        demoName = demoName.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').trim();
      } catch (e) {
        console.log(`Could not extract demo name for demo ${i + 1}, using default name`);
      }

      console.log(`Starting recording for demo: ${demoName}`);
      
      // Click the start button for this demo
      await demoButton.click();

      // Wait for the demo to start running
      await page.waitForSelector(`text=running`, { timeout: 10000 });
      
      // Wait for the demo to complete (up to 30 seconds per demo)
      const maxWaitTime = 30000; // 30 seconds
      const checkInterval = 1000; // Check every second
      let timeWaited = 0;
      
      while (timeWaited < maxWaitTime) {
        const isRunning = await page.isVisible('text=running');
        const isCompleted = await page.isVisible('text=completed');
        
        if (isCompleted) {
          console.log(`Demo ${demoName} completed`);
          break;
        }
        
        await page.waitForTimeout(checkInterval);
        timeWaited += checkInterval;
      }
      
      // Move to the next demo by ensuring we're ready for the next iteration
      // Add a small delay before starting the next demo
      await page.waitForTimeout(2000);
      
      console.log(`Completed recording for demo: ${demoName}`);
    }

    console.log('All demo recordings completed!');
  } catch (error) {
    console.error('Error during demo recording:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

// More sophisticated version with true FPS control via screenshots
async function generateDemoMoviesWithFPSControl() {
  // Since Playwright doesn't provide direct FPS control for video recording,
  // we'll implement a screenshot-based approach with custom FPS
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Set viewport
  await page.setViewportSize({ width: 1280, height: 720 });

  try {
    // Navigate to the app
    console.log('Navigating to the Reasoning Engine UI...');
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load and WebSocket to connect
    await page.waitForSelector('#websocket-status', { state: 'visible', timeout: 15000 });
    console.log('Connected to WebSocket, starting demo recordings...');

    // SECOND FUNCTION: Wait for demos to load - wait for "Demos" panel to be visible first
    await page.waitForSelector('text=Demos', { timeout: 15000 });
    
    // Wait longer for WebSocket data to populate the demo list
    await page.waitForTimeout(8000); // Wait longer for demos to be populated via WebSocket simulation
    
    // Wait specifically for the "Start" buttons to appear (they should appear after demo data loads)
    try {
      await page.waitForSelector('button:has-text("Start")', { timeout: 15000 });
      console.log('Start buttons found!');
    } catch (e) {
      console.log('Start buttons still not found after waiting - this may be expected if no demos are available');
      // Continue anyway, as there might be no demos available
    }
    
    // Get all demo start buttons - try multiple approaches if needed
    let demoButtons = await page.locator('text=Start').locator('..button').all(); // buttons that contain "Start" text
    
    if (demoButtons.length === 0) {
      // Alternative approach: look for buttons within demo panels
      demoButtons = await page.locator('button:has-text("Start")').all();
    }
    
    if (demoButtons.length === 0) {
      // If still no buttons found, try to locate any buttons in the demo area
      const demoPanel = await page.locator('text=Demos').first().locator('..').locator('..'); // Move up to panel container
      demoButtons = await demoPanel.locator('button').all();
    }
    
    // Filter buttons to only those with "Start" text
    const startButtons = [];
    for (const button of demoButtons) {
      const buttonText = await button.textContent();
      if (buttonText && buttonText.trim() === 'Start') {
        startButtons.push(button);
      }
    }
    
    // Create directory for screenshots
    const screenshotsDir = './demo-screenshots';
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    if (startButtons.length > 0) {
      console.log(`Found ${startButtons.length} demo start buttons to record`);
      
      // Process each demo
      for (let i = 0; i < startButtons.length; i++) {
        const demoButton = startButtons[i];
        
        // Get the demo name - try multiple selector approaches
        let demoName = `Demo-${i + 1}`;
        try {
          // Try to find demo name in the same container as the button
          const demoContainer = demoButton.locator('..').locator('..').locator('..'); // Go up 3 levels
          const nameElement = demoContainer.locator('div:has-text("Basic Reasoning Demo")').first()
            .or(demoContainer.locator('div:has-text("Syllogistic Reasoning")').first())
            .or(demoContainer.locator('div:has-text("Complex Inference")').first());
          
          let demoText = await nameElement.textContent();
          if (demoText) {
            // Extract just the demo name part
            if (demoText.includes('Basic Reasoning')) demoName = 'Basic_Reasoning_Demo';
            else if (demoText.includes('Syllogistic')) demoName = 'Syllogistic_Reasoning';
            else if (demoText.includes('Complex')) demoName = 'Complex_Inference';
            else demoName = demoText.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').trim();
          }
        } catch (e) {
          console.log(`Could not extract demo name for demo ${i + 1}, using default name`);
        }

        console.log(`Starting recording for demo: ${demoName}`);
        
        // Create directory for this demo's screenshots
        const demoDir = path.join(screenshotsDir, demoName);
        if (!fs.existsSync(demoDir)) {
          fs.mkdirSync(demoDir, { recursive: true });
        }

        // Click the start button for this demo
        await demoButton.click();

        // Wait for the demo to start running
        await page.waitForSelector(`text=running`, { timeout: 10000 });
        
        // Start capturing screenshots at low FPS (e.g., 1 FPS)
        const fps = 1; // Frames per second
        const interval = 1000 / fps; // Interval in ms
        let frameCount = 0;
        const maxFrames = 60; // Max 60 frames per demo (1 minute at 1fps)
        
        const startTime = Date.now();
        while (frameCount < maxFrames) {
          // Capture screenshot
          const screenshotPath = path.join(demoDir, `frame_${String(frameCount).padStart(4, '0')}.png`);
          await page.screenshot({ path: screenshotPath });
          
          frameCount++;
          
          // Check if demo has completed early
          const isCompleted = await page.isVisible('text=completed');
          if (isCompleted) {
            console.log(`Demo ${demoName} completed early at frame ${frameCount}`);
            break;
          }
          
          // Wait for next frame
          await page.waitForTimeout(interval);
        }
        
        console.log(`Captured ${frameCount} frames for demo: ${demoName}`);
      }
      console.log('All demo screenshot captures completed!');
    } else {
      console.log(`No start buttons found. Taking general UI screenshots instead...`);
      
      // Create a general screenshots directory
      const generalDir = path.join(screenshotsDir, 'general_ui');
      if (!fs.existsSync(generalDir)) {
        fs.mkdirSync(generalDir, { recursive: true });
      }
      
      // Take periodic screenshots of the general UI
      const fps = 1; // Frames per second
      const interval = 1000 / fps; // Interval in ms
      let frameCount = 0;
      const maxFrames = 30; // Max 30 frames (30 seconds at 1fps)
      
      while (frameCount < maxFrames) {
        const screenshotPath = path.join(generalDir, `frame_${String(frameCount).padStart(4, '0')}.png`);
        await page.screenshot({ path: screenshotPath });
        frameCount++;
        await page.waitForTimeout(interval);
      }
      
      console.log(`Captured ${frameCount} general UI screenshots for visual verification.`);
    }
    console.log('Note: To create actual movies from these screenshots, you can use tools like ffmpeg:');
    console.log('ffmpeg -r 1 -f image2 -s 1280x720 -i frame_%04d.png -vcodec libx264 -crf 25 -pix_fmt yuv420p demo_recording.mp4');
  } catch (error) {
    console.error('Error during demo recording:', error);
  } finally {
    await browser.close();
  }
}

// Main function with command-line arguments support
async function main() {
  const args = process.argv.slice(2);
  const useFPSControl = args.includes('--fps-control') || args.includes('-f');
  
  console.log('Demo Movie Generator');
  console.log('=====================');
  console.log('Starting demo movie generation...');
  console.log(`Using FPS control mode: ${useFPSControl ? 'Yes' : 'No'}`);
  console.log('(Note: Use --fps-control or -f flag to use screenshot-based FPS control)');
  
  if (useFPSControl) {
    await generateDemoMoviesWithFPSControl();
  } else {
    await generateDemoMovies();
  }
  
  console.log('Demo movie generation complete! Check the demo-videos or demo-screenshots directory.');
}

// Run the main function if this file is called directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// For ES modules, we use this approach to detect if the script is run directly
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this module is the main module being executed
if (process.argv[1] === __filename) {
  main().catch(console.error);
}

export { generateDemoMovies, generateDemoMoviesWithFPSControl };