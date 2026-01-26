import { ReactiveState, div, input, button } from '../core/index.js';
import { Component } from './Component.js';

export class AgentChat extends Component {
    constructor(container) {
        super(container);
        this.state = new ReactiveState({
            messages: [],
            inputText: ''
        });

        this.state.watch('messages', () => this.renderMessages());
    }

    initialize() {
        this.render();
        this.addMessage('agent', 'Hello! I am a simple agent. How can I help you?');
    }

    addMessage(role, text) {
        this.state.messages = [...this.state.messages, { role, text, time: new Date() }];
    }

    sendMessage() {
        const text = this.inputEl.value.trim();
        if (!text) return;

        this.addMessage('user', text);
        this.inputEl.value = '';

        // Simulate agent response
        setTimeout(() => {
            this.addMessage('agent', `I received: "${text}". This is a simulated response.`);
        }, 1000);
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const ui = div().class('chat-container').child(
            div().class('messages').id('messages-list'),
            div().class('input-area').child(
                this.inputEl = input()
                    .attr('placeholder', 'Type a message...')
                    .on('keydown', (e) => {
                        if (e.key === 'Enter') this.sendMessage();
                    })
                    .build(),
                button('Send').on('click', () => this.sendMessage())
            )
        );

        ui.mount(this.container);
        this.messagesList = document.getElementById('messages-list');
        this.renderMessages();
    }

    renderMessages() {
        if (!this.messagesList) return;
        this.messagesList.innerHTML = '';

        this.state.messages.forEach(msg => {
            div()
                .class('message', msg.role)
                .text(`${msg.role === 'agent' ? '🤖' : '👤'} ${msg.text}`)
                .mount(this.messagesList);
        });

        this.messagesList.scrollTop = this.messagesList.scrollHeight;
    }
}
