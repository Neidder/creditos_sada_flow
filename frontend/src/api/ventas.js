import api from './axios';

export const getVentas = async () => {
    const response = await api.get('/ventas/ventas/');
    return response.data;
};

export const crearVenta = async (data) => {
    const response = await api.post('/ventas/ventas/', data);
    return response.data;
};

export const getVentasHoy = async () => {
    const response = await api.get('/ventas/ventas/hoy/');
    return response.data;
};

export const getResumenVentas = async () => {
    const response = await api.get('/ventas/ventas/resumen/');
    return response.data;
};