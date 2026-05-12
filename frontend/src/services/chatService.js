import axios from 'axios';

const ML_API_URL = 'http://127.0.0.1:8000';

const chatService = {
  sendMessage: (message) => axios.post(`${ML_API_URL}/chat`, { message })
};

export default chatService;
