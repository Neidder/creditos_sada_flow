import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Clientes from './pages/Clientes';
import Proveedores from './pages/Proveedores';
import Compras from './pages/Compras';
import CajaDiaria from './pages/CajaDiaria';
import Creditos from './pages/Creditos';
import Pagos from './pages/Pagos';
import Cambios from './pages/Cambios';
import Ventas from './pages/Ventas';
import Usuarios from './pages/Usuarios'; // 1. Importamos la nueva página de Usuarios
import ProtectedRoute from './components/ProtectedRoute';


function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Redirección inicial y Login */}
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<Login />} />

                {/* =========================================================
                    RUTAS COMPARTIDAS (Tanto Administrador (1) como Vendedor (2))
                   ========================================================= */}
                <Route path="/dashboard" element={
                    <ProtectedRoute allowedRoles={[1, 2]}><Dashboard /></ProtectedRoute>
                } />
                <Route path="/productos" element={
                    <ProtectedRoute allowedRoles={[1, 2]}><Productos /></ProtectedRoute>
                } />
                <Route path="/clientes" element={
                    <ProtectedRoute allowedRoles={[1, 2]}><Clientes /></ProtectedRoute>
                } />
                <Route path="/creditos" element={
                    <ProtectedRoute allowedRoles={[1, 2]}><Creditos /></ProtectedRoute>
                } />
                <Route path="/pagos" element={
                    <ProtectedRoute allowedRoles={[1, 2]}><Pagos /></ProtectedRoute>
                } />
                <Route path="/ventas" element={
                    <ProtectedRoute allowedRoles={[1, 2]}><Ventas /></ProtectedRoute>
                } />

                <Route path="/cambios" element={
                    <ProtectedRoute allowedRoles={[1, 2]}><Cambios /></ProtectedRoute>
                } />

                <Route path="/caja" element={
                    <ProtectedRoute allowedRoles={[1, 2]}><CajaDiaria /></ProtectedRoute>
                } />


                {/* =========================================================
                    RUTAS EXCLUSIVAS (Solo Administrador (1))
                   ========================================================= */}
                <Route path="/proveedores" element={
                    <ProtectedRoute allowedRoles={[1]}><Proveedores /></ProtectedRoute>
                } />
                <Route path="/compras" element={
                    <ProtectedRoute allowedRoles={[1]}><Compras /></ProtectedRoute>
                } />
                <Route path="/usuarios" element={
                    <ProtectedRoute allowedRoles={[1]}><Usuarios /></ProtectedRoute>
                } />

                {/* Ruta comodín por si intentan escribir una URL que no existe */}
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;