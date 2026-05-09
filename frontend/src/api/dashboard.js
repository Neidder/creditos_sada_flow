import api from './axios';

export const getDashboard = async () => {
    const response = await api.get('/dashboard/resumen/');
    return response.data;
};