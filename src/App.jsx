// Enhanced App.jsx: Fixed white screen issue on login and ensured dashboard renders correctly
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, LogOut, FileDown, Moon, Sun } from 'lucide-react';
import Lottie from 'lottie-react';
import financeAnimation from './assets/finance-lottie.json';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

//const api = axios.create({ baseURL: 'http://localhost:5001' });
//const api = axios.create({ baseURL: 'https://financetracker-kqqw.onrender.com' });

const api = axios.create({
  baseURL: 'https://financetracker-kqqw.onrender.com',
  withCredentials: true // 🛡️ needed for secure cross-origin requests
});


export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userRole, setUserRole] = useState('');
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);


  const isDark = darkMode ? 'dark bg-gray-900 text-white' : '';

  const [ocrLoading, setOcrLoading] = useState(false);

  const handleReceiptUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setOcrLoading(true);
    Tesseract.recognize(file, 'eng')
      .then(({ data: { text } }) => {
        setReceiptText(text);
        autoFillFromText(text);
      })
      .finally(() => setOcrLoading(false));
  };

  const autoFillFromText = (text) => {
    const amountMatch = text.match(/\$\s?\d+(\.\d{2})?/);
    const dateMatch = text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
    if (amountMatch) setAmount(amountMatch[0].replace('$', '').trim());
    if (dateMatch) setDescription(prev => `${prev} | Date: ${dateMatch[0]}`);
    const categoryKeywords = {
      food: ['restaurant', 'cafe', 'burger', 'pizza'],
      transport: ['uber', 'taxi', 'bus', 'train'],
      shopping: ['mall', 'store', 'receipt', 'item'],
      groceries: ['grocery', 'market', 'supermarket']
    };
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(k => text.toLowerCase().includes(k))) {
        setCategory(cat);
        break;
      }
    }
  };

  const fetchUserData = async (newToken) => {
    try {
      const userRes = await api.get('/me', { headers: { Authorization: `Bearer ${newToken}` } });
      setUserRole(userRes.data.role);
      await api.post('/profile', { display_name: userRes.data.email, dark_mode: false }, { headers: { Authorization: `Bearer ${newToken}` } });
      const profileRes = await api.get('/profile', { headers: { Authorization: `Bearer ${newToken}` } });
      setProfile(profileRes.data);
      setDarkMode(profileRes.data.dark_mode);
      if (userRes.data.role === 'admin') await getUsers(newToken);
    } catch (err) {
      console.error('User setup failed', err);
    }
  };

  const startEditing = (transaction) => {
    setEditingTransaction(transaction);
    setAmount(transaction.amount);
    setCategory(transaction.category);
    setCustomCategory(transaction.category); // in case it's a custom one
    setDescription(transaction.description);
  };
  
  const login = async () => {
    try {
      setLoading(true);
      const res = await api.post('/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      await fetchUserData(res.data.token);
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    try {
      setLoading(true);
      await api.post('/register', { email, password });
      alert('Registered successfully. Please login.');
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUserRole('');
    setEmail('');
    setPassword('');
    setTransactions([]);
    setProfile(null);
  };

  const updateProfile = async () => {
    try {
      await api.post('/profile', { display_name: editingName, dark_mode: darkMode }, { headers: { Authorization: `Bearer ${token}` } });
      const res = await api.get('/profile', { headers: { Authorization: `Bearer ${token}` } });
      setProfile(res.data);
      setEditing(false);
    } catch {
      alert('Failed to update profile');
    }
  };

  const getTransactions = async () => {
    const res = await api.get('/transactions', { headers: { Authorization: `Bearer ${token}` } });
    setTransactions(res.data);
  };

  const getCategories = async () => {
    const res = await api.get('/categories', { headers: { Authorization: `Bearer ${token}` } });
    setCategoriesList(res.data.map(c => c.name));
  };

  const getUsers = async (authToken) => {
    try {
      const res = await api.get('/users', { headers: { Authorization: `Bearer ${authToken}` } });
      setUsersList(res.data);
    } catch (err) {
      console.error('Failed to fetch users');
    }
  };

  const addTransaction = async () => {
    try {
      const selectedCategory = category === 'Other' ? customCategory : category;
  
      if (editingTransaction) {
        await api.put(`/transactions/${editingTransaction._id}`, {
          amount,
          category: selectedCategory,
          description
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await api.post('/transactions', {
          amount,
          category: selectedCategory,
          description
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
  
      setAmount('');
      setCategory('');
      setCustomCategory('');
      setDescription('');
      setEditingTransaction(null);
      getTransactions();
    } catch (err) {
      alert('Failed to submit transaction');
    }
  };
  

  const deleteTransaction = async id => {
    try {
      await api.delete(`/transactions/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      getTransactions();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const downloadCSV = () => {
    if (!transactions.length) return alert('No data to export');
    const headers = ['Amount', 'Category', 'Description', 'Date'];
    const rows = transactions.map(t => [t.amount, t.category || '', t.description || '', t.date || '']);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transactions.csv';
    link.click();
  };

  useEffect(() => {
    if (token) {
      getTransactions();
      getCategories();
      fetchUserData(token);
    }
  }, [token]);

  const filteredTransactions = transactions.filter(t => !filterCategory || t.category?.toLowerCase().includes(filterCategory.toLowerCase()));
  const total = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const categoryTotals = filteredTransactions.reduce((acc, t) => {
    const cat = t.category || 'Uncategorized';
    acc[cat] = acc[cat] ? acc[cat] + parseFloat(t.amount) : parseFloat(t.amount);
    return acc;
  }, {});

  const chartData = Object.entries(categoryTotals).map(([category, value]) => ({ name: category, value }));
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#a29bfe', '#fab1a0'];

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-700">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
          <Lottie animationData={financeAnimation} loop className="w-56 h-56 mx-auto mb-4" />
          <h1 className="text-4xl font-extrabold text-indigo-600 mb-2">Finance Tracker</h1>
          <p className="text-gray-600 text-sm">Manage your money. Maximize your life.</p>
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mb-3 p-3 border rounded-xl" />
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mb-3 p-3 border rounded-xl" />
          <div className="flex gap-4 justify-center">
            <button onClick={login} disabled={!email || !password || loading} className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-full shadow-md">{loading ? 'Logging in...' : 'Login'}</button>
            <button onClick={register} disabled={!email || !password || loading} className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-full shadow-md">{loading ? 'Registering...' : 'Register'}</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    
    <div className={`min-h-screen flex ${isDark}`}>
      <aside className="w-72 bg-white dark:bg-gray-800 shadow-lg p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold mb-2 text-indigo-600 dark:text-indigo-300">👤 Profile</h2>
          {profile && !editing ? (
            <>
              <p><strong>Name:</strong> {profile.display_name}</p>
              <button className="text-sm text-blue-600 mt-2" onClick={() => { setEditing(true); setEditingName(profile.display_name); }}>Edit Name</button>
            </>
          ) : (
            
            <div className="flex flex-col gap-2">
              <input value={editingName} onChange={e => setEditingName(e.target.value)} className="p-2 border rounded" />
              <button className="bg-indigo-500 text-white px-3 py-1 rounded" onClick={updateProfile}>Save</button>
            </div>
          )}
          <button onClick={() => setDarkMode(!darkMode)} className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-white">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />} Toggle Dark Mode
          </button>
          {userRole === 'admin' && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">🛠 Admin</h3>
              <p className="text-sm text-gray-500">Manage users</p>
              <ul className="text-sm mt-2">
                {usersList.map((u, i) => (
                  <li key={i} className="border-b py-1">{u.email} ({u.role})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <button onClick={logout} className="mt-8 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2">
          <LogOut size={16} /> Logout
        </button>
      </aside>
  
      <main className="flex-1 p-6">
        <h2 className="text-2xl font-semibold mb-2">{userRole === 'admin' ? 'Admin Dashboard' : 'User Dashboard'}</h2>
        <p className="text-green-500 font-bold mb-4">Total: ${total.toFixed(2)}</p>
        <button onClick={downloadCSV} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded mb-4 inline-flex items-center gap-2">
          <FileDown className="w-4 h-4" /> Export CSV
        </button>
        <input placeholder="Filter by category" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-3 border rounded-xl w-full mb-4" />
        <input placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="p-3 border rounded-xl w-full mb-2" />
        <select value={category} onChange={e => setCategory(e.target.value)} className="p-3 border rounded-xl w-full mb-2">
          <option value="">Select Category</option>
          {categoriesList.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
          <option value="Other">Other</option>
        </select>
        {category === 'Other' && (
          <input placeholder="Custom Category" value={customCategory} onChange={e => setCustomCategory(e.target.value)} className="p-3 border rounded-xl w-full mb-2" />
        )}

        
        <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="p-3 border rounded-xl w-full mb-4" />
        <button onClick={addTransaction} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-2 rounded-xl shadow-md w-full transition-all duration-300 ease-in-out">
          {editingTransaction ? 'Update Transaction' : 'Submit Transaction'}
        </button>
        {editingTransaction && (
          <button onClick={() => {
            setEditingTransaction(null);
            setAmount('');
            setCategory('');
            setCustomCategory('');
            setDescription('');
          }} className="mt-2 text-sm text-gray-500 hover:text-gray-700 underline">
            Cancel Edit
          </button>
        )}

        

        <div className="my-6">
          <h2 className="text-xl font-bold mb-4 text-center text-indigo-700 dark:text-indigo-300">Spending by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label={({ name }) => name}>
                {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        
  
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          <AnimatePresence>
            {filteredTransactions.map((t, idx) => (
              <motion.li key={t._id} initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="py-3 flex flex-col sm:flex-row sm:justify-between text-lg items-center gap-2">
                <div className="w-full">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300">{t.category || 'Uncategorized'}</span>
                  {t.description && <p className="text-sm text-gray-500 dark:text-gray-300">{t.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-green-600 dark:text-green-400">${t.amount}</span>
                  <button onClick={() => startEditing(t)} className="text-blue-500 hover:text-blue-700 text-sm font-medium" title="Edit">✏️</button>
                  <button onClick={() => deleteTransaction(t._id)} className="text-red-500 hover:text-red-700" title="Delete"><Trash2 className="w-5 h-5" /></button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </main>
    </div>
  );
  
}
