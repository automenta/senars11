import {Server} from './interface/Server.js';
import {Reasoner} from './engine/Reasoner.js';

const reasoner = new Reasoner();
const server = new Server(reasoner, 3000);
server.start();
