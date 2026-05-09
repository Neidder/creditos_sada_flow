import api from './axios';

export const getPagos = async () => {
    const response = await api.get('/pagos/pagos/');
    return response.data;
};

export const crearPago = async (data) => {
    const response = await api.post('/pagos/pagos/', data);
    return response.data;
};

export const getPagosPorPlan = async (idPlan) => {
    const response = await api.get(`/pagos/pagos/plan/${idPlan}/`);
    return response.data;
};