import React, { useState } from 'react';
import { narService } from '../services/nar-service';

const InputBar = () => {
    const [inputValue, setInputValue] = useState('');

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    const handleSend = () => {
        narService.sendNarseseInput(inputValue);
        setInputValue('');
    };

    return (
        <div className="input-bar">
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
            />
            <button onClick={handleSend}>Send</button>
        </div>
    );
};

export default InputBar;
