import api from './axios';

export const login = async (correo, contrasena) => {
    const response = await api.post('/usuarios/login/', { correo, contrasena });
    return response.data;
};

export const getUsuarios = async () => {
    const response = await api.get('/usuarios/usuarios/');
    return response.data;
};

export const crearUsuario = async (data) => {
    const response = await api.post('/usuarios/usuarios/', data);
    return response.data;
};

export const actualizarUsuario = async (id, data) => {
    const response = await api.put(`/usuarios/usuarios/${id}/`, data);
    return response.data;
};

export const desactivarUsuario = async (id) => {
    const response = await api.delete(`/usuarios/usuarios/${id}/`);
    return response.data;
};

export const getRoles = async () => {
    const response = await api.get('/usuarios/roles/');
    return response.data;
};