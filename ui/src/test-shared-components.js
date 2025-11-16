/**
 * Test application to verify the new shared components work correctly
 */

import React from 'react';
import {createRoot} from 'react-dom/client';
import {BaseApp} from './components/BaseApp.js';
import {
    Button,
    Card,
    EmptyState,
    ErrorState,
    FeatureCard,
    GenericInputField,
    KeyValueDisplay,
    LoadingSpinner,
    StatCard,
    StatusBadge,
    TimeDisplay,
    ToggleSwitch
} from './components/shared/index.js';
import {themeUtils} from './utils/themeUtils.js';

// A simple test component to verify all shared components work
const TestApp = () => {
    const [count, setCount] = React.useState(0);
    const [checked, setChecked] = React.useState(false);
    const [inputValue, setInputValue] = React.useState('Hello World');

    const handleIncrement = () => {
        setCount(count + 1);
    };

    const data = {
        'Status': 'Active',
        'Count': count,
        'Checked': checked ? 'Yes' : 'No',
        'Input Value': inputValue
    };

    return React.createElement('div', {style: {padding: themeUtils.get('SPACING.LG')}},
        React.createElement('h1', null, 'Shared Components Test'),

        // Test cards
        React.createElement('div', {
                style: {
                    display: 'flex',
                    gap: themeUtils.get('SPACING.MD'),
                    marginBottom: themeUtils.get('SPACING.LG')
                }
            },
            React.createElement(StatCard, {
                title: 'Total Items',
                value: count,
                description: 'Current count of items',
                icon: '📊',
                trend: count > 0 ? `+${count}` : '0'
            }),
            React.createElement(FeatureCard, {
                title: 'Test Feature',
                description: 'This is a sample feature card component',
                icon: '✨',
                onClick: handleIncrement
            })
        ),

        // Test basic components
        React.createElement('div', {
                style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: themeUtils.get('SPACING.MD'),
                    marginBottom: themeUtils.get('SPACING.LG')
                }
            },
            React.createElement(Card, {title: 'Control Panel'},
                React.createElement('div', {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: themeUtils.get('SPACING.SM')
                        }
                    },
                    React.createElement(Button, {onClick: handleIncrement}, `Count: ${count}`),
                    React.createElement(StatusBadge, {
                        status: count % 2 === 0 ? 'success' : 'warning',
                        label: count % 2 === 0 ? 'Even' : 'Odd'
                    }),
                    React.createElement(ToggleSwitch, {
                        checked: checked,
                        onChange: setChecked,
                        label: 'Toggle Me'
                    }),
                    React.createElement(GenericInputField, {
                        label: 'Input Field',
                        value: inputValue,
                        onChange: setInputValue,
                        placeholder: 'Enter text...'
                    })
                )
            ),

            React.createElement(Card, {title: 'Status Info'},
                React.createElement('div', {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: themeUtils.get('SPACING.SM')
                        }
                    },
                    React.createElement('div', null,
                        React.createElement('span', null, 'Current Time: '),
                        React.createElement(TimeDisplay, {timestamp: Date.now(), formatType: 'datetime'})
                    ),
                    React.createElement(KeyValueDisplay, {data})
                )
            )
        ),

        // Test state components
        React.createElement('div', {
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: themeUtils.get('SPACING.MD')
                }
            },
            count < 3 ?
                React.createElement(EmptyState, {
                    message: 'Count is low',
                    description: 'Click the button to increase the count',
                    icon: '📈'
                }) :
                React.createElement('div', null,
                    React.createElement(LoadingSpinner, {size: themeUtils.get('SPACING.LG')}),
                    React.createElement('p', null, 'Count is greater than 2!')
                ),

            count > 5 ?
                React.createElement(ErrorState, {
                    message: 'Count too high!',
                    description: 'The count has exceeded the recommended limit',
                    onRetry: () => setCount(0)
                }) : null
        )
    );
};

// Render the test app
const root = createRoot(document.getElementById('root'));
root.render(
    React.createElement(
        React.StrictMode,
        null,
        React.createElement(BaseApp, {appId: 'test-app', appConfig: {title: 'Component Test App'}},
            React.createElement(TestApp)
        )
    )
);