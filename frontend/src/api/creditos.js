import api from './axios';

export const getPlanes = async () => {
    const response = await api.get('/planes-separe/planes/');
    return response.data;
};

export const crearPlan = async (data) => {
    const response = await api.post('/planes-separe/planes/', data);
    return response.data;
};

export const cancelarPlan = async (id) => {
    const response = await api.delete(`/planes-separe/planes/${id}/`);
    return response.data;
};