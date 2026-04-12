import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { QRCodeSVG } from 'qrcode.react';

const FacultyDashboard = () => {
    const [classes, setClasses] = useState([]);
    const [newClass, setNewClass] = useState({ subject: '', department: '', semester: '' });
    const [activeSession, setActiveSession] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [attendanceList, setAttendanceList] = useState([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historySessions, setHistorySessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [historyAttendance, setHistoryAttendance] = useState([]);
    const [historyAbsentees, setHistoryAbsentees] = useState([]);
    const [studentGroups, setStudentGroups] = useState([]);

    useEffect(() => {
        fetchStudentGroups();
    }, []);

    const fetchStudentGroups = async () => {
        try {
            const res = await api.get('groups/');
            setStudentGroups(res.data);
        } catch (error) {
            console.error("Failed to fetch student groups", error);
        }
    };


    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        let interval;
        if (activeSession) {
            fetchSessionAttendance(activeSession.id);
            interval = setInterval(() => {
                fetchSessionAttendance(activeSession.id);
            }, 5000); // Poll every 5 seconds
        }
        return () => clearInterval(interval);
    }, [activeSession]);

    const fetchSessionAttendance = async (sessionId) => {
        try {
            const res = await api.get(`attendance/session/${sessionId}/`);
            setAttendanceList(res.data);

            // If session has a group, fetch group students to find absentees
            // We need to know the group ID. It's not in the attendance response directly usually, 
            // but we have activeSession.student_group (if we update session start response or fetch it)
            // Let's assume activeSession has student_group_id if we fetch it properly.
            // Actually, we might need to fetch session details again or rely on what we have.
            // The activeSession state comes from startSession response.
        } catch (error) {
            console.error("Failed to fetch attendance list", error);
        }
    };

    // We need to fetch group members if activeSession has a group
    const [absentees, setAbsentees] = useState([]);

    useEffect(() => {
        if (activeSession && activeSession.student_group) {
            fetchGroupStudents(activeSession.student_group);
        }
    }, [activeSession, attendanceList]);

    const fetchGroupStudents = async (groupId) => {
        try {
            const res = await api.get(`groups/${groupId}/details/`);
            const allStudents = res.data;
            const presentUsernames = attendanceList.map(a => a.student_name); // student_name is username
            const absent = allStudents.filter(s => !presentUsernames.includes(s.username));
            setAbsentees(absent);
        } catch (err) {
            console.error("Failed to fetch group students", err);
        }
    };

    const fetchClasses = async () => {
        const res = await api.get('classes/');
        setClasses(res.data);
    };

    const createClass = async (e) => {
        e.preventDefault();
        await api.post('classes/', newClass);
        setNewClass({ subject: '', department: '', semester: '' });
        fetchClasses();
    };

    const updateClassGroup = async (classId, groupId) => {
        try {
            await api.patch(`classes/${classId}/`, { student_group: groupId || null });
            fetchClasses();
        } catch (err) {
            console.error("Failed to update class group", err);
        }
    };

    const deleteClass = async (classId, subject) => {
        if (!window.confirm(`Are you sure you want to delete "${subject}"? This will also delete all session history for this class.`)) return;
        try {
            await api.delete(`classes/${classId}/`);
            fetchClasses();
        } catch (err) {
            console.error("Failed to delete class", err);
        }
    };

    const startSession = async (classId) => {
        if (!navigator.geolocation) {
             alert("Geolocation is not supported by your browser. Cannot start session.");
             return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const res = await api.post('sessions/start/', { 
                    class_instance: classId,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                setActiveSession(res.data);
                setTimeLeft(300);
            } catch(err) {
                console.error(err);
                alert("Failed to start session.");
            }
        }, (err) => {
            alert("Location access denied. Please enable location to start a session.");
        });
    };

    useEffect(() => {
        if (activeSession && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && activeSession) {
            // Auto-end session UI-wise, but backend handles actual expiry logic (or we call end endpoint)
            // Prompt says "End session manually" but "QR expires after 60s".
            // We'll just hide QR after 60s.
        }
    }, [activeSession, timeLeft]);

    const endSession = async () => {
        if (activeSession) {
            await api.patch(`sessions/${activeSession.id}/end/`);
            setActiveSession(null);
            setTimeLeft(0);
        }
    };

    const openHistory = async (classId) => {
        try {
            const res = await api.get(`sessions/class/${classId}/`);
            setHistorySessions(res.data);
            setShowHistoryModal(true);
            setSelectedSession(null);
            setHistoryAttendance([]);
        } catch (err) {
            console.error("Failed to fetch session history", err);
            alert("Failed to load session history. Please try again.");
        }
    };

    const viewSessionDetails = async (session) => {
        setSelectedSession(session);
        setHistoryAttendance([]);
        setHistoryAbsentees([]);
        try {
            const res = await api.get(`attendance/session/${session.id}/`);
            setHistoryAttendance(res.data);

            // Compute absentees if session has a student group
            if (session.student_group) {
                const groupRes = await api.get(`groups/${session.student_group}/details/`);
                const allStudents = groupRes.data;
                const presentUsernames = res.data.map(a => a.student_name);
                const absent = allStudents.filter(s => !presentUsernames.includes(s.username));
                setHistoryAbsentees(absent);
            }
        } catch (err) {
            console.error("Failed to fetch session attendance", err);
        }
    };

    const closeHistory = () => {
        setShowHistoryModal(false);
        setHistorySessions([]);
        setSelectedSession(null);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <Navbar />
            <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Faculty Dashboard</h2>



                {/* Create Class Form */}
                <div className="bg-gray-800 border border-gray-700 p-6 rounded shadow-lg mb-8">
                    <h3 className="text-xl font-semibold mb-4">Create New Class</h3>
                    <form onSubmit={createClass} className="flex gap-4 flex-wrap">
                        <input
                            placeholder="Subject"
                            className="border border-gray-600 bg-gray-700 text-white placeholder-gray-400 p-2 rounded flex-1 focus:outline-none focus:border-blue-500"
                            value={newClass.subject}
                            onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                            required
                        />
                        <input
                            placeholder="Department"
                            className="border border-gray-600 bg-gray-700 text-white placeholder-gray-400 p-2 rounded flex-1 focus:outline-none focus:border-blue-500"
                            value={newClass.department}
                            onChange={(e) => setNewClass({ ...newClass, department: e.target.value })}
                            required
                        />
                        <input
                            type="number"
                            placeholder="Semester"
                            className="border border-gray-600 bg-gray-700 text-white placeholder-gray-400 p-2 rounded w-24 focus:outline-none focus:border-blue-500"
                            value={newClass.semester}
                            onChange={(e) => setNewClass({ ...newClass, semester: e.target.value })}
                            required
                        />
                        <select
                            className="border border-gray-600 bg-gray-700 text-white p-2 rounded flex-1 focus:outline-none focus:border-blue-500"
                            value={newClass.student_group || ''}
                            onChange={(e) => setNewClass({ ...newClass, student_group: e.target.value })}
                        >
                            <option value="">Select Student Group (Optional)</option>
                            {studentGroups.map(group => (
                                <option key={group.id} value={group.id}>{group.name} ({group.student_count})</option>
                            ))}
                        </select>
                        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transform active:scale-95 transition-all duration-150">Add Class</button>
                    </form>
                </div>

                {/* Active Session / QR Code */}
                {activeSession && (
                    <div className="bg-gray-800 p-6 rounded shadow-lg mb-8 border-l-4 border-blue-500">
                        <div className="flex flex-col md:flex-row gap-8">
                            <div>
                                <h3 className="text-xl font-bold mb-4">Active Session</h3>
                                {timeLeft > 0 ? (
                                    <div>
                                        <QRCodeSVG value={activeSession.qr_token} size={256} />
                                        <p className="mt-2 text-center font-bold text-red-500">Expires in: {timeLeft}s</p>
                                    </div>
                                ) : (
                                    <div className="w-64 h-64 bg-gray-700 flex items-center justify-center rounded">
                                        <p className="text-gray-400">QR Code Expired</p>
                                    </div>
                                )}
                                <div className="mt-4">
                                    <p><strong>Class ID:</strong> {activeSession.class_instance}</p>
                                    <p><strong>Session ID:</strong> {activeSession.id}</p>
                                    <button onClick={endSession} className="bg-red-600 text-white px-4 py-2 rounded mt-2 w-full hover:bg-red-700 transform active:scale-95 transition-all duration-150 shadow">
                                        End Session
                                    </button>
                                </div>
                            </div>

                            {/* Attendance List */}
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold">Attendance Live Feed</h3>
                                    <button
                                        onClick={() => fetchSessionAttendance(activeSession.id)}
                                        className="text-blue-600 underline"
                                    >
                                        Refresh
                                    </button>
                                </div>
                                <div className="bg-gray-700 p-4 rounded h-48 overflow-y-auto">
                                    {attendanceList.length === 0 ? (
                                        <p className="text-gray-400 text-center">No attendance marked yet.</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {attendanceList.map((record) => (
                                                <li key={record.id} className="bg-gray-800 border border-gray-600 p-2 rounded shadow flex justify-between">
                                                    <span className="font-semibold">{record.student_name}</span>
                                                    <span className="text-sm text-gray-400">{new Date(record.timestamp).toLocaleTimeString()}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="mt-2 flex justify-between font-bold">
                                    <span className="text-green-600">✅ Present: {attendanceList.length}</span>
                                    {activeSession.student_group && (
                                        <span className="text-red-600">❌ Absent: {absentees.length}</span>
                                    )}
                                </div>

                                {/* Absentee List */}
                                {activeSession.student_group && absentees.length > 0 && (
                                    <div className="mt-4 border-t border-gray-700 pt-4">
                                        <h4 className="font-bold text-red-500 mb-2">Absentees ({absentees.length})</h4>
                                        <div className="bg-gray-800 border border-gray-700 p-3 rounded max-h-40 overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-gray-700">
                                                        <th className="text-left pb-1 text-gray-300">Name</th>
                                                        <th className="text-left pb-1 text-gray-300">Reg No.</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {absentees.map(s => (
                                                        <tr key={s.username} className="border-b border-gray-700">
                                                            <td className="py-1 text-red-500 font-semibold">{s.name}</td>
                                                            <td className="py-1 font-mono text-gray-400 text-xs">{s.register_number}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                                {activeSession.student_group && absentees.length === 0 && attendanceList.length > 0 && (
                                    <div className="mt-4 border-t pt-4">
                                        <p className="text-green-600 font-bold">🎉 All students are present!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Classes List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((cls) => (
                        <div key={cls.id} className="bg-gray-800 border border-gray-700 p-6 rounded shadow-lg">
                            <h4 className="text-xl font-bold">{cls.subject}</h4>
                            <p className="text-gray-400">{cls.department} - Sem {cls.semester}</p>
                            {cls.student_group_name ? (
                                <p className="text-sm text-purple-400 mt-1">📎 Group: {cls.student_group_name}</p>
                            ) : (
                                <p className="text-sm text-orange-400 mt-1">⚠️ No student group assigned</p>
                            )}
                            <select
                                className="border border-gray-600 bg-gray-700 text-white p-1 rounded text-sm w-full mt-2 focus:outline-none focus:border-blue-500"
                                value={cls.student_group || ''}
                                onChange={(e) => updateClassGroup(cls.id, e.target.value)}
                            >
                                <option value="">No Group</option>
                                {studentGroups.map(group => (
                                    <option key={group.id} value={group.id}>{group.name} ({group.student_count})</option>
                                ))}
                            </select>
                            <div className="mt-4 flex gap-2 flex-wrap">
                                <button
                                    onClick={() => startSession(cls.id)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transform active:scale-95 transition-all duration-150 shadow"
                                >
                                    Start Session
                                </button>
                                <button
                                    onClick={() => openHistory(cls.id)}
                                    className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-500 transform active:scale-95 transition-all duration-150 shadow"
                                >
                                    History
                                </button>
                                <button
                                    onClick={() => deleteClass(cls.id, cls.subject)}
                                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transform active:scale-95 transition-all duration-150 shadow"
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* History Modal */}
                {showHistoryModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 text-gray-100 rounded-lg shadow-2xl w-full max-w-4xl h-3/4 flex overflow-hidden border border-gray-700">
                            {/* Session List */}
                            <div className="w-1/3 border-r border-gray-700 overflow-y-auto p-4 bg-gray-900">
                                <h3 className="font-bold text-lg mb-4 text-white">Past Sessions</h3>
                                <ul className="space-y-2">
                                    {historySessions.map(session => (
                                        <li
                                            key={session.id}
                                            onClick={() => viewSessionDetails(session)}
                                            className={`p-3 rounded cursor-pointer transition-colors ${selectedSession?.id === session.id ? 'bg-blue-900 bg-opacity-40 border-l-4 border-blue-400' : 'bg-gray-800 hover:bg-gray-700'}`}
                                        >
                                            <p className="font-semibold text-gray-200">{new Date(session.start_time).toLocaleDateString()}</p>
                                            <p className="text-sm text-gray-400">{new Date(session.start_time).toLocaleTimeString()}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Attendance Details */}
                            <div className="w-2/3 p-6 overflow-y-auto">
                                <div className="flex justify-between items-start mb-6">
                                    <h3 className="text-xl font-bold text-white">
                                        {selectedSession ? `Attendance for ${new Date(selectedSession.start_time).toLocaleString()}` : 'Select a session'}
                                    </h3>
                                    <button onClick={closeHistory} className="text-gray-400 hover:text-white transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {selectedSession ? (
                                    <>
                                        <div className="bg-gray-700 p-4 rounded mb-4 flex justify-between shadow-inner">
                                            <span className="text-green-400">✅ Present: <strong>{historyAttendance.length}</strong></span>
                                            {selectedSession.student_group && (
                                                <span className="text-red-400">❌ Absent: <strong>{historyAbsentees.length}</strong></span>
                                            )}
                                            <span>Status: <span className={selectedSession.is_active ? "text-green-400" : "text-gray-400"}>{selectedSession.is_active ? 'Active' : 'Ended'}</span></span>
                                        </div>

                                        {/* Present Students */}
                                        <h4 className="font-bold text-green-500 mb-2">Present Students</h4>
                                        <table className="w-full text-left mb-4">
                                            <thead>
                                                <tr className="border-b border-gray-600">
                                                    <th className="pb-2">Student Name</th>
                                                    <th className="pb-2">Time Marked</th>
                                                    <th className="pb-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {historyAttendance.map(record => (
                                                    <tr key={record.id} className="border-b border-gray-700">
                                                        <td className="py-2 text-gray-200">{record.student_name}</td>
                                                        <td className="py-2 text-gray-400">{new Date(record.timestamp).toLocaleTimeString()}</td>
                                                        <td className="py-2"><span className="text-green-500">Present</span></td>
                                                    </tr>
                                                ))}
                                                {historyAttendance.length === 0 && (
                                                    <tr>
                                                        <td colSpan="3" className="py-4 text-center text-gray-500">No attendance records.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>

                                        {/* Absentees in History */}
                                        {historyAbsentees.length > 0 && (
                                            <div className="border-t border-gray-700 pt-4">
                                                <h4 className="font-bold text-red-500 mb-2">Absentees ({historyAbsentees.length})</h4>
                                                <div className="bg-gray-800 border border-gray-700 p-3 rounded">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b border-gray-700">
                                                                <th className="text-left pb-1 text-gray-300">Name</th>
                                                                <th className="text-left pb-1 text-gray-300">Reg No.</th>
                                                                <th className="text-left pb-1 text-gray-300">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {historyAbsentees.map(s => (
                                                                <tr key={s.username} className="border-b border-gray-700">
                                                                    <td className="py-1 text-red-500 font-semibold">{s.name}</td>
                                                                    <td className="py-1 font-mono text-gray-400 text-xs">{s.register_number}</td>
                                                                    <td className="py-1"><span className="text-red-500 font-bold">Absent</span></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                        {selectedSession.student_group && historyAbsentees.length === 0 && historyAttendance.length > 0 && (
                                            <div className="border-t border-gray-700 pt-4">
                                                <p className="text-green-500 font-bold">🎉 All students were present!</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500">
                                        Select a session from the left to view details.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FacultyDashboard;
