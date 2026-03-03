import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <h1 className="text-xl font-bold">Smart Attendance</h1>
            <div className="flex items-center gap-4">
                {user && (
                    <>
                        <Link to={user.role === 'FACULTY' ? '/faculty' : user.role === 'CLASS_REP' ? '/cr' : '/student'} className="hover:underline">Dashboard</Link>
                        {user.role === 'CLASS_REP' && (
                            <Link to="/student" className="hover:underline">Scan QR</Link>
                        )}
                        <Link to="/analytics" className="hover:underline">Analytics</Link>
                    </>
                )}
                <span className="mr-2">Welcome, {user?.username} ({user?.role})</span>
                <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded">Logout</button>
            </div>
        </nav>
    );
};

export default Navbar;
