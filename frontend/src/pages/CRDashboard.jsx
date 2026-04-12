import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AuthContext from '../context/AuthContext';

const CRDashboard = () => {
    const { user } = useContext(AuthContext);
    const [groups, setGroups] = useState([]);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [groupStudents, setGroupStudents] = useState([]);
    const [newStudentsInput, setNewStudentsInput] = useState('');
    const [createdCredentials, setCreatedCredentials] = useState([]);
    const [editingStudent, setEditingStudent] = useState(null);
    const [editName, setEditName] = useState('');
    const [editRegNo, setEditRegNo] = useState('');

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        const res = await api.get('groups/');
        setGroups(res.data);
    };

    const createGroup = async (e) => {
        e.preventDefault();
        try {
            await api.post('groups/', { name: newGroupName });
            setNewGroupName('');
            fetchGroups();
        } catch (err) {
            console.error(err);
        }
    };

    const viewGroupDetails = async (group) => {
        setSelectedGroup(group);
        if (!selectedGroup || selectedGroup.id !== group.id) {
            setCreatedCredentials([]);
        }
        const res = await api.get(`groups/${group.id}/details/`);
        setGroupStudents(res.data);
    };

    const refreshStudentList = async () => {
        if (selectedGroup) {
            const res = await api.get(`groups/${selectedGroup.id}/details/`);
            setGroupStudents(res.data);
            fetchGroups();
        }
    };

    const addStudents = async () => {
        const lines = newStudentsInput.split('\n');
        const students = lines.map(line => {
            const [name, regNo] = line.split(',');
            if (name && regNo) {
                return { name: name.trim(), register_number: regNo.trim() };
            }
            return null;
        }).filter(Boolean);

        if (students.length === 0) return;

        try {
            const res = await api.post(`groups/${selectedGroup.id}/students/`, { students });
            setCreatedCredentials(res.data);
            setNewStudentsInput('');
            refreshStudentList();
        } catch (err) {
            console.error("Failed to add students", err);
        }
    };

    const startEdit = (student) => {
        setEditingStudent(student.id);
        setEditName(student.name);
        setEditRegNo(student.register_number);
    };

    const cancelEdit = () => {
        setEditingStudent(null);
        setEditName('');
        setEditRegNo('');
    };

    const saveEdit = async (studentId) => {
        try {
            await api.put(`groups/${selectedGroup.id}/students/${studentId}/update/`, {
                name: editName,
                register_number: editRegNo
            });
            setEditingStudent(null);
            refreshStudentList();
        } catch (err) {
            console.error("Failed to update student", err);
        }
    };

    const removeStudent = async (studentId) => {
        if (!window.confirm('Are you sure you want to remove this student? This will permanently delete their account.')) return;
        try {
            await api.delete(`groups/${selectedGroup.id}/students/${studentId}/remove/`);
            // Optimistic UI update or just refresh
            setGroupStudents(prev => prev.filter(s => s.id !== studentId));
            fetchGroups(); // Update student count in groups list
            alert("Student removed successfully.");
        } catch (err) {
            console.error("Failed to remove student", err);
            const errMsg = err.response?.data?.error || "Failed to remove student. Please try again.";
            alert(errMsg);
        }
    };

    const copyAllCredentials = () => {
        const studentsWithCreds = groupStudents.filter(s => s.login_username);
        if (studentsWithCreds.length === 0) {
            alert('No credentials available yet. Add students first.');
            return;
        }
        const text = studentsWithCreds.map(s => `${s.name} | ${s.login_username} | ${s.login_password}`).join('\n');
        navigator.clipboard.writeText(text);
        alert('Credentials copied to clipboard!');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <Navbar />
            <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Class Representative Dashboard</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Groups Management */}
                    <div>
                        <div className="bg-gray-800 border border-gray-700 p-6 rounded shadow-lg mb-6">
                            <h3 className="text-xl font-semibold mb-4">Create Student Group</h3>
                            <form onSubmit={createGroup} className="flex gap-4">
                                <input
                                    className="border border-gray-600 bg-gray-700 text-white placeholder-gray-400 p-2 rounded flex-1 focus:outline-none focus:border-blue-500"
                                    placeholder="Group Name (e.g. CSE Sem 5)"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    required
                                />
                                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transform active:scale-95 transition-all duration-150">Create</button>
                            </form>
                        </div>

                        <div className="bg-gray-800 border border-gray-700 p-6 rounded shadow-lg">
                            <h3 className="text-xl font-semibold mb-4">Your Groups</h3>
                            <ul className="space-y-2">
                                {groups.map(group => (
                                    <li
                                        key={group.id}
                                        onClick={() => viewGroupDetails(group)}
                                        className={`p-3 rounded cursor-pointer border transition-colors ${selectedGroup?.id === group.id ? 'bg-blue-900 bg-opacity-40 border-blue-500' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}
                                    >
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-gray-200">{group.name}</span>
                                            <span className="text-gray-400">{group.student_count} Students</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Group Details & Add Students */}
                    {selectedGroup && (
                        <div>
                            <div className="bg-gray-800 border border-gray-700 p-6 rounded shadow-lg mb-6">
                                <h3 className="text-xl font-semibold mb-4">Add Students to {selectedGroup.name}</h3>
                                <p className="text-sm text-gray-400 mb-2">Enter details (Name, RegisterNumber) one per line.</p>
                                <textarea
                                    className="w-full border border-gray-600 bg-gray-700 text-white placeholder-gray-500 p-2 rounded h-32 focus:outline-none focus:border-blue-500"
                                    placeholder={"John Doe, REG001\nJane Smith, REG002"}
                                    value={newStudentsInput}
                                    onChange={(e) => setNewStudentsInput(e.target.value)}
                                ></textarea>
                                <button onClick={addStudents} className="bg-blue-600 text-white px-4 py-2 rounded mt-2 hover:bg-blue-700 transform active:scale-95 transition-all duration-150 shadow">Generate Credentials</button>
                            </div>

                            {/* Newly Created Credentials (flash display) */}
                            {createdCredentials.length > 0 && (
                                <div className="bg-yellow-900 bg-opacity-20 p-6 rounded shadow mb-6 border border-yellow-800">
                                    <h3 className="text-lg font-bold text-yellow-500 mb-2">🔑 Just Created</h3>
                                    <p className="text-sm text-yellow-400 mb-3">These credentials are also saved permanently below.</p>
                                    <div className="max-h-40 overflow-y-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-yellow-800/50">
                                                    <th className="pb-2 text-gray-300">Name</th>
                                                    <th className="pb-2 text-gray-300">Username</th>
                                                    <th className="pb-2 text-gray-300">Password</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {createdCredentials.map((creds, idx) => (
                                                    <tr key={idx} className="border-b border-yellow-800/50">
                                                        <td className="py-1 text-gray-300">{creds.name}</td>
                                                        <td className="py-1 font-mono text-gray-300">{creds.username}</td>
                                                        <td className="py-1 font-mono font-bold text-green-500">{creds.password}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Students List WITH Credentials */}
                            <div className="bg-gray-800 border border-gray-700 p-6 rounded shadow-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-semibold">Students & Credentials ({groupStudents.length})</h3>
                                    <button
                                        onClick={copyAllCredentials}
                                        className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transform active:scale-95 transition-all duration-150 shadow"
                                    >
                                        📋 Copy All Credentials
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-700 bg-gray-700">
                                                <th className="p-2 text-gray-300">Name</th>
                                                <th className="p-2 text-gray-300">Reg No.</th>
                                                <th className="p-2 text-gray-300">Login Username</th>
                                                <th className="p-2 text-gray-300">Password</th>
                                                <th className="p-2 text-gray-300">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {groupStudents.map(student => (
                                                <tr key={student.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                                                    {editingStudent === student.id ? (
                                                        <>
                                                            <td className="p-2">
                                                                <input className="border border-gray-600 bg-gray-700 text-white p-1 rounded w-full focus:outline-none focus:border-blue-500" value={editName} onChange={(e) => setEditName(e.target.value)} />
                                                            </td>
                                                            <td className="p-2">
                                                                <input className="border border-gray-600 bg-gray-700 text-white p-1 rounded w-full focus:outline-none focus:border-blue-500" value={editRegNo} onChange={(e) => setEditRegNo(e.target.value)} />
                                                            </td>
                                                            <td className="p-2 font-mono text-gray-500">—</td>
                                                            <td className="p-2 font-mono text-gray-500">—</td>
                                                            <td className="p-2">
                                                                <button onClick={() => saveEdit(student.id)} className="text-green-500 mr-2 text-sm hover:text-green-400">✓ Save</button>
                                                                <button onClick={cancelEdit} className="text-gray-500 text-sm hover:text-gray-400">✕ Cancel</button>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="p-2 font-semibold text-gray-200">{student.name}</td>
                                                            <td className="p-2 font-mono text-gray-400">{student.register_number}</td>
                                                            <td className="p-2 font-mono text-blue-400">{student.login_username || '—'}</td>
                                                            <td className="p-2 font-mono font-bold text-gray-200">{student.login_password || '—'}</td>
                                                            <td className="p-2">
                                                                <button onClick={() => startEdit(student)} className="text-blue-400 hover:text-blue-300 text-sm mr-2 transform active:scale-90 transition-transform">✏️</button>
                                                                <button onClick={() => removeStudent(student.id)} className="text-red-400 hover:text-red-300 text-sm transform active:scale-90 transition-transform">🗑️</button>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {groupStudents.length === 0 && (
                                        <p className="text-center text-gray-400 py-4">No students added yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CRDashboard;
