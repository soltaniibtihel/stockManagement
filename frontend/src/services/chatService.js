import api from './api';

const chatService = {
  // Passe par le backend Java (port 8080) qui relaye vers le service ML Python
  sendMessage: (message) => api.post('/ml/chat', { message })
};

export default chatService;
