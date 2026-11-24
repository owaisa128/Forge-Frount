import api from './axios';

/**
 * Send a chat message to the backend AI Assistant endpoint
 * @param {string} message 
 * @param {Array<{role: string, content: string}>} history 
 * @param {Object} [options]
 * @param {string} [options.persona]
 * @param {string} [options.model]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{success: boolean, reply?: string, reasoning?: string, generativeUi?: Object, model?: string, errorType?: string, message?: string}>}
 */
export const sendChatMessage = async (message, history = [], options = {}) => {
  const { persona, model, signal } = options;
  const response = await api.post(
    '/chat',
    { message, history, persona, model },
    { timeout: 45000, signal }
  );
  return response.data;
};

/**
 * Check configuration status of the AI Assistant backend
 * @returns {Promise<{success: boolean, configured: boolean, model?: string, personas?: Array, message?: string}>}
 */
export const fetchChatStatus = async () => {
  const response = await api.get('/chat/status');
  return response.data;
};
