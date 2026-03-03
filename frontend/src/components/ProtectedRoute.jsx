import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div>Loading...</div>;

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (role) {
        if (role === 'STUDENT' && (user.role === 'STUDENT' || user.role === 'CLASS_REP')) {
            // Allow CR to access student routes
        } else if (user.role !== role) {
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
