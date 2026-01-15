import { Component } from './Component.js';
import { UIConfig } from '../config/UIConfig.js';

export class ConsolePanel extends Component {
    constructor(container) {
        super(container);
    }

    initialize(app) {
        if (!this.container) return;

        // Unified Console Structure
        this.container.innerHTML = `
            <div class="console-wrapper" style="display:flex; flex-direction:column; height:100%; background:var(--bg-panel);">
                <!-- Header / Toolbar -->
                <div class="panel-header" style="justify-content: flex-end; padding: 4px; border-bottom:1px solid var(--border-color);">
                     <div class="control-toolbar" style="display:flex; gap:4px;">
                        <button class="icon-btn" id="${UIConfig.ELEMENT_IDS.btnPlayPause}" title="Play/Pause">▶</button>
                        <button class="icon-btn" id="${UIConfig.ELEMENT_IDS.btnStep}" title="Single Step">⏯</button>
                        <button class="icon-btn" id="${UIConfig.ELEMENT_IDS.btnReset}" title="Reset System">🔄</button>
                        <div class="divider" style="width:1px; background:var(--border-color); margin:0 4px;"></div>
                        <button class="icon-btn" id="btn-clear-console" title="Clear Console">🚫</button>
                     </div>
                </div>

                <!-- Scrollable Log Area -->
                <div class="logs-container" id="${UIConfig.ELEMENT_IDS.logsContainer}" style="flex:1; overflow-y:auto; padding:10px; font-family:var(--font-mono); font-size:12px;"></div>

                <!-- Input Area -->
                <div class="input-section" style="padding: 10px; background: var(--bg-header); border-top: 1px solid var(--border-color);">
                    <div class="input-mode-toggle" style="margin-bottom:8px; display:flex; justify-content:space-between;">
                        <div>
                            <label class="mode-option" style="margin-right:10px; color:var(--text-muted); font-size:11px; cursor:pointer;">
                                <input type="radio" name="input-mode" value="narsese" id="${UIConfig.ELEMENT_IDS.inputModeNarsese}" checked> NARSESE
                            </label>
                            <label class="mode-option" style="color:var(--text-muted); font-size:11px; cursor:pointer;">
                                <input type="radio" name="input-mode" value="agent" id="${UIConfig.ELEMENT_IDS.inputModeAgent}"> AGENT
                            </label>
                        </div>
                        <div id="voice-status" style="font-size:10px; color:var(--accent-warn); display:none;">Listening...</div>
                    </div>
                    <div class="input-group" style="display:flex; gap:4px;">
                        <input type="text" id="${UIConfig.ELEMENT_IDS.commandInput}" placeholder="Input command... (or press Mic)" autocomplete="off" style="flex:1; background:var(--bg-input); border:1px solid var(--border-color); color:var(--text-main); padding:8px;">
                        <button id="btn-mic" title="Voice Input" style="width:32px;">🎙️</button>
                        <button id="${UIConfig.ELEMENT_IDS.sendButton}" style="background:var(--accent-primary); color:#000; border:none; font-weight:bold;">SEND</button>
                    </div>
                </div>
            </div>
        `;

        // Register Elements
        const ids = ['commandInput', 'sendButton', 'btnPlayPause', 'btnStep', 'btnReset', 'inputModeNarsese', 'inputModeAgent', 'logsContainer'];
        ids.forEach(id => {
            const el = this.container.querySelector(`#${UIConfig.ELEMENT_IDS[id]}`);
            if (el) app.uiElements.register(id, el);
        });

        // Setup Clear Button
        this.container.querySelector('#btn-clear-console').addEventListener('click', () => {
            const logs = this.container.querySelector(`#${UIConfig.ELEMENT_IDS.logsContainer}`);
            if(logs) logs.innerHTML = '';
        });

        // Voice Support (Placeholder for later step)
        const micBtn = this.container.querySelector('#btn-mic');
        micBtn.addEventListener('click', () => {
            const event = new CustomEvent('senars:voice:toggle');
            document.dispatchEvent(event);
        });
    }
}
