import { BryntumGantt } from '@bryntum/gantt-react';
import { ganttConfig } from './GanttConfig';
import './App.scss';
import { useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuid } from 'uuid';

const socket = io('ws://localhost:5000', { transports: ['websocket'] });

function App() {
    const 
        ganttRef = useRef(null),
        changeTimer = useRef(),
        remote = useRef(false),
        clientId = useRef(uuid()),
        changeTriggered = useRef(false),
        persistedData = useRef();

    useEffect(() => {
        const gantt = ganttRef.current?.instance;
        if (gantt) {
            const project = gantt.project;
            project?.addListener('change', () => {
                if (changeTimer.current) clearTimeout(changeTimer.current);
                changeTimer.current = setTimeout(() => {
                    if (!remote.current) {
                        if (changeTriggered.current) {
                            const store = gantt.store.toJSON();
                            socket.emit('data-change', { senderId: clientId.current, store });
                        } else {
                            changeTriggered.current = true;
                        }
                    }
                }, 800)
            });
            project?.addListener('load', () => {
                if (persistedData.current) {
                    const { store } = persistedData.current;
                    remote.current = true;
                    if (store) {
                        gantt.store.data = store
                    }
                    remote.current = false;
                    socket.off('just-joined');
                }
            });
            socket.on('just-joined', (data) => {
                if (data) persistedData.current = data;
            });

            socket.on('new-data-change', ({ senderId, store }) => {
                if (clientId.current !== senderId) {
                    remote.current = true;
                    gantt.store.data = store;
                    remote.current = false;
                }
            });
        }
        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <BryntumGantt
            ref = {ganttRef}
            {...ganttConfig}
        />
    );
}

// If you plan to use stateful React collections for data binding please check this guide
// https://bryntum.com/docs/gantt/guide/Gantt/integration/react/data-binding

export default App;
