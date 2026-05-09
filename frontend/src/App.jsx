import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Clientes from './pages/Clientes';
import Proveedores from './pages/Proveedores';
import Compras from './pages/Compras';
import PlanesSepare from './pages/PlanesSepare';
import Pagos from './pages/Pagos';
import Ventas from './pages/Ventas';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/productos" element={<ProtectedRoute><Productos /></ProtectedRoute>} />
                <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
                <Route path="/proveedores" element={<ProtectedRoute><Proveedores /></ProtectedRoute>} />
                <Route path="/compras" element={<ProtectedRoute><Compras /></ProtectedRoute>} />
                <Route path="/planes-separe" element={<ProtectedRoute><PlanesSepare /></ProtectedRoute>} />
                <Route path="/pagos" element={<ProtectedRoute><Pagos /></ProtectedRoute>} />
                <Route path="/ventas" element={<ProtectedRoute><Ventas /></ProtectedRoute>} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;