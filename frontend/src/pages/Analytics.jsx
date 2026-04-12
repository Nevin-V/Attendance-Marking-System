import React, { useState, useEffect, useContext } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AuthContext from '../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);
ChartJS.defaults.color = '#9ca3af';

const calculateClassesRequired = (present, total) => {
    if (total === 0) return 0;
    const currentPct = present / total;
    if (currentPct >= 0.85) return 0;
    const required = Math.ceil((0.85 * total - present) / 0.15);
    return required > 0 ? required : 0;
};

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

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { grid: { color: '#374151' }, ticks: { color: '#9ca3af' } },
            y: { grid: { color: '#374151' }, ticks: { color: '#9ca3af' } }
        },
        plugins: {
            legend: { labels: { color: '#e5e7eb' } }
        }
    };

    const studentClassChartData = studentData?.class_breakdown ? {
        labels: studentData.class_breakdown.map(c => c.subject),
        datasets: [
            {
                label: 'Attendance %',
                data: studentData.class_breakdown.map(c => c.attendance_pct),
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
            }
        ],
    } : null;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <Navbar />
            <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Analytics Dashboard</h2>

                <div className="bg-gray-800 border border-gray-700 p-6 rounded shadow-lg">
                    {user.role === 'FACULTY' ? (
                        <div>
                            <h3 className="text-xl font-semibold mb-4 text-white">Class Performance</h3>
                            <div className="h-96">
                                <Bar data={facultyChartData} options={chartOptions} />
                            </div>
                        </div>
                    ) : (
                        studentData && (
                            <div>
                                <h3 className="text-xl font-semibold mb-4 text-white">My Engagement Score: {studentData.engagement_score}%</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    <div className="h-64 flex justify-center w-full">
                                        {studentClassChartData && studentClassChartData.labels.length > 0 ? (
                                            <Bar data={studentClassChartData} options={chartOptions} />
                                        ) : (
                                            <p className="text-gray-500 self-center">No class attendance data available yet.</p>
                                        )}
                                    </div>
                                    <div className="flex flex-col justify-center space-y-4">
                                        <div className="p-4 bg-blue-900 bg-opacity-30 border border-blue-800 rounded">
                                            <p className="text-gray-400">Total Scans</p>
                                            <p className="text-2xl font-bold text-blue-300">{studentData.attendance_count}</p>
                                        </div>
                                        <div className="p-4 bg-green-900 bg-opacity-30 border border-green-800 rounded">
                                            <p className="text-gray-400">Possible Sessions</p>
                                            <p className="text-2xl font-bold text-green-300">{studentData.total_sessions_possible}</p>
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold mb-6 text-white border-b border-gray-700 pb-2">Subject Breakdown</h3>
                                <div className="space-y-4">
                                    {studentData.class_breakdown.map((cls, idx) => {
                                        const classesNeeded = calculateClassesRequired(cls.attended, cls.total_sessions);
                                        const isLow = cls.attendance_pct < 85 && cls.total_sessions > 0;
                                        
                                        return (
                                            <div key={idx} className={`p-4 rounded border ${isLow ? 'bg-red-900 bg-opacity-20 border-red-800' : 'bg-gray-800 border-gray-700 shadow-lg'}`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="font-bold text-lg text-gray-200">{cls.subject}</h4>
                                                    <span className={`font-bold text-xl ${isLow ? 'text-red-500' : 'text-green-500'}`}>{cls.attendance_pct}%</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-gray-400 items-center">
                                                    <span>Attended: {cls.attended} / {cls.total_sessions}</span>
                                                    {isLow && classesNeeded > 0 && (
                                                        <span className="text-yellow-500 font-bold bg-yellow-900 bg-opacity-30 px-3 py-1 rounded">🎯 Attend {classesNeeded} more class{classesNeeded > 1 ? 'es' : ''} to hit 85%</span>
                                                    )}
                                                    {cls.total_sessions > 0 && !isLow && (
                                                        <span className="text-green-500 font-semibold">Safe Zone</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
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
