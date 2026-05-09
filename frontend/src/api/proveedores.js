import api from './axios';

export const getProveedores = async () => {
    const response = await api.get('/proveedores/proveedores/');
    return response.data;
};

export const crearProveedor = async (data) => {
    const response = await api.post('/proveedores/proveedores/', data);
    return response.data;
};

export const actualizarProveedor = async (id_proveedor, data) => {
    const response = await api.patch(`/proveedores/proveedores/${id_proveedor}/`, data);
    return response.data;
};

export const eliminarProveedor = async (id_proveedor) => {
    const response = await api.delete(`/proveedores/proveedores/${id_proveedor}/`);
    return response.data;
};

