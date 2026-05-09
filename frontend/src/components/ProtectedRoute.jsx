import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const usuario = localStorage.getItem('usuario');
    if (!usuario) {
        return <Navigate to="/login" />;
    }
    return children;
};

export default ProtectedRoute;