import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Camera, Search, LogOut, MapPin, Loader2, User, ArrowLeft, Phone, Megaphone, Trash2, Calendar, ShieldAlert } from 'lucide-react';
import { db, auth, provider, signInWithPopup } from './services/firebase-config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, where, updateDoc } from 'firebase/firestore';
import { analyzeLostItem } from './services/geminiService';
import LostReport from './components/LostReport';

// --- UI COMPONENTS ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
    warning: "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

// --- SEPARATED COMPONENTS (Prevents Cursor Glitch) ---

const LoginView = ({ mobile, setMobile, handleLogin }) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <Search className="w-10 h-10 text-white" />
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">FoundIt</h1>
        <p className="text-slate-500">The smart lost & found portal for our campus.</p>
      </div>
      <Card className="p-8 mt-8 space-y-4">
        <div className="text-left">
          <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="tel"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
              placeholder="+91 9876543210"
              value={mobile}
              // FIX: Allows + symbol and up to 15 digits
              onChange={(e) => setMobile(e.target.value.replace(/[^\d+]/g, '').slice(0, 15))}
            />
          </div>
        </div>
        <Button onClick={handleLogin} className="w-full py-3">
          <User className="w-5 h-5" /> Login with Google
        </Button>
      </Card>
    </div>
  </div>
);

const Dashboard = ({ user, mobile, signOut, setView, overdueItems, handleHandover, lostReports, handleResolveReport }) => (
  <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
    
    {/* Header */}
    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome, {user?.displayName?.split(' ')[0]}</p>
      </div>
      <Button onClick={() => signOut(auth)} variant="secondary">
        <LogOut className="w-4 h-4" /> Sign Out
      </Button>
    </div>

    {/* 🚨 HANDOVER PROTOCOL NOTIFICATIONS (RED ALERT) */}
    {overdueItems.length > 0 && (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-full text-red-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-800">Action Required: Handover Items</h3>
            <p className="text-red-700 mt-1 text-sm">
              You have found items that haven't been claimed for over 7 days. Please drop them at the <strong>Main Guard Gate</strong> immediately.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {overdueItems.map(item => (
                <div key={item.id} className="bg-white p-3 rounded-lg border border-red-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                      <img src={item.imageData} className="w-10 h-10 rounded object-cover" alt="item" />
                      <div>
                        <div className="font-bold text-sm">{item.title}</div>
                        <div className="text-xs text-slate-500">Found 7+ days ago</div>
                      </div>
                  </div>
                  <Button onClick={() => handleHandover(item.id)} variant="warning" className="text-xs px-3 py-1">
                    I Dropped it
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Action Buttons */}
    <div className="grid md:grid-cols-2 gap-6">
      <button onClick={() => setView('lost')} className="group p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left relative overflow-hidden">
        <div className="relative z-10">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">I Lost Something</h3>
          <p className="text-slate-500">Search the database using AI matching.</p>
        </div>
      </button>

      <button onClick={() => setView('found')} className="group p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left relative overflow-hidden">
        <div className="relative z-10">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-6">
            <Camera className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">I Found Something</h3>
          <p className="text-slate-500">Upload a photo and let AI identify it.</p>
        </div>
      </button>
    </div>

    {/* CAMPUS LOST ALERTS */}
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
        <Megaphone className="w-6 h-6 text-orange-500" /> Campus Lost Alerts
      </h2>

      {lostReports.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          <p>No active lost alerts. The campus is safe! 🎉</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lostReports.map(report => (
            <Card key={report.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-slate-900">{report.name}</h3>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">LOST</span>
              </div>
              
              <p className="text-slate-600 text-sm mb-3">{report.description}</p>
              
              <div className="flex flex-col gap-1 text-xs text-slate-500 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> {report.location}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> {report.date}
                </div>
              </div>

              <div className="flex gap-2 border-t pt-3">
                {/* IF USER OWNS THE REPORT -> SHOW DELETE BUTTON */}
                {user.uid === report.userId ? (
                  <Button 
                    variant="danger" 
                    className="w-full text-sm py-1.5"
                    onClick={() => handleResolveReport(report.id)}
                  >
                    <Trash2 className="w-4 h-4" /> I Found This
                  </Button>
                ) : (
                  /* PRIVACY FIX: Hide Name, Show "Anonymous" */
                  <Button 
                    variant="secondary" 
                    className="w-full text-sm py-1.5"
                    onClick={() => alert(`Contact Owner: A Student (Anonymous)\nPhone: ${report.contactPhone || 'N/A'}`)}
                  >
                    <Phone className="w-4 h-4" /> Call Owner
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  </div>
);

const FoundUploadView = ({ file, setFile, handleFoundUpload, loading, setView }) => (
  <div className="max-w-md mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-slate-900">Report Found Item</h2>
      <p className="text-slate-500 mt-2">Help return this item to its owner</p>
    </div>
    <Card className="p-6">
      <form onSubmit={handleFoundUpload} className="space-y-4">
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative group">
          <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => setFile(e.target.files[0])} accept="image/*" />
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <div className="text-sm font-medium text-slate-900">{file ? file.name : "Click to upload photo"}</div>
          </div>
        </div>
        <div className="pt-2 flex gap-3">
          <Button variant="secondary" onClick={() => setView('dashboard')} className="flex-1">Cancel</Button>
          <Button type="submit" disabled={loading || !file} className="flex-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload & Identify'}
          </Button>
        </div>
      </form>
    </Card>
  </div>
);

// --- MAIN APP LOGIC ---
function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); 
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // DATA STATES
  const [lostReports, setLostReports] = useState([]); 
  const [myFoundItems, setMyFoundItems] = useState([]); 
  const [mobile, setMobile] = useState(localStorage.getItem('sastra_mobile') || '');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        /*if (currentUser.email.endsWith('@sastra.ac.in') || currentUser.email.endsWith('@sastra.edu')) {
          setUser(currentUser);
          if (view === 'login') setView('dashboard');
        } else {
          showToast("Access Denied: Please use SASTRA I D", "error");
          signOut(auth);
        }*/
        setUser(currentUser);
        if (view === 'login') setView('dashboard');
      } else {
        setUser(null);
        setView('login');
      }
    });
  }, [view]);

  // 2. Fetch Broadcasted Reports
  useEffect(() => {
    const q = query(collection(db, "lost_reports"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setLostReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  // 3. Fetch My Found Items
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "items"), where("email", "==", user.email));
    return onSnapshot(q, (snapshot) => {
      setMyFoundItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user]);

  // 4. Helper: Check if item is > 7 days old
  const isOverdue = (timestamp) => {
    if (!timestamp) return false;
    const date = new Date(timestamp.seconds * 1000);
    const diffDays = Math.ceil(Math.abs(new Date() - date) / (1000 * 60 * 60 * 24));
    return diffDays > 7;
  };

  // 5. Handover Logic
  const handleHandover = async (itemId) => {
    if (window.confirm("Confirm you have dropped this item at the Main Guard Gate?")) {
      try {
        await updateDoc(doc(db, "items", itemId), { status: "At Security", handoverDate: new Date() });
        showToast("Thanks! Item marked as dropped at Security.");
      } catch (error) { showToast("Update failed", "error"); }
    }
  };

  // 6. Resolve Report Logic
  const handleResolveReport = async (reportId) => {
    if (window.confirm("Has this item been returned? This will delete the alert.")) {
      try {
        await deleteDoc(doc(db, "lost_reports", reportId));
        showToast("Great! Alert removed.");
      } catch (error) { showToast("Could not delete report.", "error"); }
    }
  };

  // 7. Login Logic
  const handleLogin = async () => {
    if (mobile.length < 10) return showToast("Please enter a valid mobile number", "error");
    localStorage.setItem('sastra_mobile', mobile);
    signInWithPopup(auth, provider);
  };

  // 8. Upload Logic
  const handleFoundUpload = async (e) => {
    e.preventDefault(); 
    if (!file) return showToast("Please select an image first", "error");
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64String = reader.result;
        const aiResponse = await analyzeLostItem(base64String, file.type);
        await addDoc(collection(db, "items"), {
          ...aiResponse,
          imageData: base64String,
          createdAt: new Date(),
          foundBy: user.displayName,
          email: user.email,
          phoneNumber: mobile,
          status: "With Student"
        });
        showToast("Item posted! Owner can now contact you.");
        setFile(null);
        setView('dashboard');
      };
    } catch (error) { showToast("AI Analysis failed.", "error"); } finally { setLoading(false); }
  };

  // Calculate Overdue Items for Dashboard
  const overdueItems = myFoundItems.filter(item => isOverdue(item.createdAt) && item.status !== "At Security");

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Helmet><title>FoundIT | SASTRA University</title></Helmet>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-900'} text-white`}>{toast.message}</div>}
      
      {/* View Logic */}
      {view === 'login' && (
        <LoginView mobile={mobile} setMobile={setMobile} handleLogin={handleLogin} />
      )}
      
      {user && (
        <div className="p-4 md:p-8">
           {view === 'dashboard' && (
             <Dashboard 
               user={user} 
               mobile={mobile} 
               signOut={signOut} 
               setView={setView} 
               overdueItems={overdueItems} 
               handleHandover={handleHandover} 
               lostReports={lostReports} 
               handleResolveReport={handleResolveReport} 
             />
           )}
           
           {view === 'found' && (
             <FoundUploadView 
               file={file} 
               setFile={setFile} 
               handleFoundUpload={handleFoundUpload} 
               loading={loading} 
               setView={setView} 
             />
           )}
           
           {view === 'lost' && (
             <div className="max-w-2xl mx-auto">
               <Button variant="ghost" onClick={() => setView('dashboard')} className="mb-4">
                 <ArrowLeft className="w-4 h-4" /> Back
               </Button>
               {/* Pass User Prop for Reporting */}
               <LostReport user={user} onCancel={() => setView('dashboard')} /> 
             </div>
           )}
        </div>
      )}
    </div>
  );
}

export default App;