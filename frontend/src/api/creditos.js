import api from './axios';

export const getCreditos = async () => {
    const response = await api.get('/creditos/creditos/');
    return response.data;
};

export const crearCredito = async (data) => {
    const response = await api.post('/creditos/creditos/', data);
    return response.data;
};

export const cancelarCredito = async (id) => {
    const response = await api.delete(`/creditos/creditos/${id}/`);
    return response.data;
};