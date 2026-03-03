import React, { useState, useEffect, useContext } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AuthContext from '../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Analytics = () => {
    const { user } = useContext(AuthContext);
    const [classData, setClassData] = useState([]);
    const [studentData, setStudentData] = useState(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        if (user.role === 'FACULTY') {
            const res = await api.get('analytics/class/');
            setClassData(res.data);
        } else {
            const res = await api.get('analytics/student/');
            setStudentData(res.data);
        }
    };

    const facultyChartData = {
        labels: classData.map(c => c.subject),
        datasets: [
            {
                label: 'Total Sessions',
                data: classData.map(c => c.total_sessions),
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
            {
                label: 'Total Attendance',
                data: classData.map(c => c.total_attendance_records),
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
            },
        ],
    };

    const studentChartData = studentData ? {
        labels: ['Attendance %', 'Participation %'],
        datasets: [
            {
                label: 'Engagement',
                data: [studentData.attendance_pct, studentData.participation_pct],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                ],
                borderWidth: 1,
            },
        ],
    } : null;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Analytics Dashboard</h2>

                <div className="bg-white p-6 rounded shadow">
                    {user.role === 'FACULTY' ? (
                        <div>
                            <h3 className="text-xl font-semibold mb-4">Class Performance</h3>
                            <div className="h-96">
                                <Bar data={facultyChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                            </div>
                        </div>
                    ) : (
                        studentData && (
                            <div>
                                <h3 className="text-xl font-semibold mb-4">My Engagement Score: {studentData.engagement_score}%</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="h-64">
                                        <Pie data={studentChartData} />
                                    </div>
                                    <div className="flex flex-col justify-center space-y-4">
                                        <div className="p-4 bg-blue-50 rounded">
                                            <p className="text-gray-600">Total Scans</p>
                                            <p className="text-2xl font-bold">{studentData.attendance_count}</p>
                                        </div>
                                        <div className="p-4 bg-green-50 rounded">
                                            <p className="text-gray-600">Possible Sessions</p>
                                            <p className="text-2xl font-bold">{studentData.total_sessions_possible}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
