import axios from 'axios';

// Para testes locais com simulador/device físico (coloque seu IP da rede local)
// Exemplo: 'http://192.168.1.8:5000/api'
const API_URL = 'torneiopraca.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
});

export default api;
