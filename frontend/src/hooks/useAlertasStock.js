import { useState, useEffect } from 'react';
import { getAlertasStock } from '../api/productos';

export const useAlertasStock = () => {
    const [alertas, setAlertas] = useState(null);

    useEffect(() => {
        getAlertasStock()
            .then(setAlertas)
            .catch(() => setAlertas({ total_alertas: 0, criticos: 0, stock_bajo: 0, productos: [] }));
    }, []);

    return alertas;
};