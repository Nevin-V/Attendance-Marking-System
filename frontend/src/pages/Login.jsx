import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const user = await login(username, password);
            if (user.role === 'FACULTY') {
                navigate('/faculty');
            } else if (user.role === 'CLASS_REP') {
                navigate('/cr');
            } else {
                navigate('/student');
            }
        } catch (err) {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="bg-gray-800 p-8 rounded shadow-lg w-96 border border-gray-700">
                <h2 className="text-2xl font-bold mb-6 text-center text-white">Smart Attendance</h2>
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-300">Username</label>
                        <input
                            type="text"
                            className="w-full p-2 border border-gray-600 rounded mt-1 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-300">Password</label>
                        <input
                            type="password"
                            className="w-full p-2 border border-gray-600 rounded mt-1 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transform active:scale-95 transition-all duration-150"
                    >
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
