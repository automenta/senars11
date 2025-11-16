import { useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import AppLayout from './components/AppLayout';
import useNarStore from './store/nar-store';
import 'reactflow/dist/style.css';
import './App.css';

function App() {
    const { actions } = useNarStore();

    useEffect(() => {
        actions.requestSnapshot();
    }, [actions]);

    return (
        <ReactFlowProvider>
            <AppLayout />
        </ReactFlowProvider>
    );
}

export default App;
