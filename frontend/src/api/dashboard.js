import api from './axios';

export const getDashboard = async () => {
    const response = await api.get('/dashboard/resumen/');
    return response.data;
};

export const getCajaDiaria = async (fecha = null) => {
    const params = fecha ? `?fecha=${fecha}` : '';
    const response = await api.get(`/dashboard/caja/${params}`);
    return response.data;
};