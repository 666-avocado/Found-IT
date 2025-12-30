import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Camera, Search, LogOut, MapPin, Loader2, User, ArrowLeft, Phone, Megaphone, Trash2, Calendar, ShieldAlert, Trophy, Star, CheckCircle } from 'lucide-react';
import { db, auth, provider, signInWithPopup } from './services/firebase-config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, where, updateDoc, getDoc, setDoc, increment, getDocs } from 'firebase/firestore';
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
    warning: "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
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

// --- SEPARATED COMPONENTS ---

const LoginView = ({ mobile, setMobile, handleLogin }) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <Search className="w-10 h-10 text-white" />
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">FoundIT</h1>
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

// --- DASHBOARD WITH KARMA UI ---
const Dashboard = ({ user, mobile, signOut, setView, overdueItems, handleHandover, lostReports, handleResolveReport, karma, myFoundItems, handleReturnedToOwner }) => (
  <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
    
    {/* Header & Karma Badge */}
    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-slate-500">Welcome, {user?.displayName?.split(' ')[0]}</p>
          {/* 🏆 GAMIFICATION BADGE */}
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 border border-yellow-200">
            <Trophy className="w-4 h-4 text-yellow-600" />
            {karma} Karma Points
          </div>
        </div>
      </div>
      <Button onClick={() => signOut(auth)} variant="secondary">
        <LogOut className="w-4 h-4" /> Sign Out
      </Button>
    </div>

    {/* 🚨 HANDOVER PROTOCOL (Double Points Opportunity) */}
    {overdueItems.length > 0 && (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-full text-red-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-800">Action Required: Handover Items</h3>
            <p className="text-red-700 mt-1 text-sm">
              Items found over 7 days ago must be dropped at the <strong>Main Guard Gate</strong>.
              <span className="block font-bold mt-1 text-red-800">🎁 Bonus: Earn +50 Karma Points for each handover!</span>
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {overdueItems.map(item => (
                <div key={item.id} className="bg-white p-3 rounded-lg border border-red-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                      <img src={item.imageData} className="w-10 h-10 rounded object-cover" alt="item" />
                      <div>
                        <div className="font-bold text-sm">{item.title}</div>
                        <div className="text-xs text-slate-500">Overdue</div>
                      </div>
                  </div>
                  <Button onClick={() => handleHandover(item.id)} variant="warning" className="text-xs px-3 py-1">
                    I Dropped it (+50pts)
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
          <p className="text-slate-500">Upload (+10 Karma) & Identify.</p>
        </div>
      </button>
    </div>

    

    {/* CAMPUS ALERTS */}
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
                <div className="flex items-center gap-2"><MapPin className="w-3 h-3" /> {report.location}</div>
                <div className="flex items-center gap-2"><Calendar className="w-3 h-3" /> {report.date}</div>
              </div>

              <div className="flex gap-2 border-t pt-3">
                {user.uid === report.userId ? (
                  <Button variant="danger" className="w-full text-sm py-1.5" onClick={() => handleResolveReport(report.id)}>
                    <Trash2 className="w-4 h-4" /> I Found This
                  </Button>
                ) : (
                  <Button variant="secondary" className="w-full text-sm py-1.5" onClick={() => alert(`Contact Owner: A Student (Anonymous)\nPhone: ${report.contactPhone || 'N/A'}`)}>
                    <Phone className="w-4 h-4" /> Call Owner
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
    {/* 🌟 MY FINDINGS SECTION */}
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
        <Star className="w-6 h-6 text-indigo-500" /> My Findings
      </h2>
      
      {myFoundItems.length === 0 ? (
         <Card className="p-8 text-center text-slate-500 bg-slate-50 border-dashed">
            <p>You haven't reported any found items yet.</p>
         </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
           {myFoundItems.map(item => (
              <Card key={item.id} className="p-4 flex gap-4 items-center">
                 <img src={item.imageData} className="w-20 h-20 rounded-lg object-cover bg-slate-100" alt="found item" />
                 <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{item.title}</h3>
                    <p className="text-xs text-slate-500 mb-3">Status: <span className="font-medium text-slate-700">{item.status}</span></p>
                    
                    {item.status !== "Returned" && item.status !== "At Security" ? (
                      <Button onClick={() => handleReturnedToOwner(item.id)} variant="success" className="text-xs py-1.5 w-full">
                        <CheckCircle className="w-3 h-3" /> Returned to Owner
                      </Button>
                    ) : (
                       <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> 
                          {item.status === "At Security" ? "Handed to Guard" : "Returned"}
                       </div>
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
      <p className="text-slate-500 mt-2">Earn +10 Karma Points for helping out!</p>
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
  const [karma, setKarma] = useState(0); // 🏆 KARMA STATE

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Auth Listener & User Sync (Modified for Demo & Gamification)
  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // --- DEMO MODE (Allowed all emails) ---
        setUser(currentUser);
        if (view === 'login') setView('dashboard');
        
        // 🏆 SYNC KARMA POINTS
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setKarma(userSnap.data().karma || 0);
        } else {
          // Create new user profile with 0 karma
          await setDoc(userRef, { 
            email: currentUser.email,
            karma: 0 
          });
          setKarma(0);
        }

        // Real-time listener for karma changes
        onSnapshot(userRef, (doc) => {
          if(doc.exists()) setKarma(doc.data().karma || 0);
        });

      } else {
        setUser(null);
        setView('login');
      }
    });
  }, [view]);

  useEffect(() => {
    const q = query(collection(db, "lost_reports"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setLostReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "items"), where("email", "==", user.email));
    return onSnapshot(q, (snapshot) => {
      setMyFoundItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user]);

  const isOverdue = (timestamp) => {
    if (!timestamp) return false;
    const date = new Date(timestamp.seconds * 1000);
    const diffDays = Math.ceil(Math.abs(new Date() - date) / (1000 * 60 * 60 * 24));
    return diffDays > 7;
  };

  // 🏆 2. GAMIFIED HANDOVER (+50 Points)
  const handleHandover = async (itemId) => {
    if (window.confirm("Confirm you have dropped this item at the Main Guard Gate? (+50 Karma)")) {
      try {
        await updateDoc(doc(db, "items", itemId), { status: "At Security", handoverDate: new Date() });
        
        // Add Points
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { karma: increment(50) });

        showToast("Success! You earned 50 Karma Points! 🏆");
      } catch (error) { showToast("Update failed", "error"); }
    }
  };

  // 🏆 3. GAMIFIED RETURN TO OWNER (+100 Points with Verification)
  const handleReturnedToOwner = async (itemId) => {
    const receiverEmail = window.prompt("To verify this return and earn +100 Karma, please enter the Receiver's SASTRA Email ID:");

    if (receiverEmail && receiverEmail.trim().length > 0) {
      try {
         // 1. Update Item Status
         await updateDoc(doc(db, "items", itemId), {
            status: "Returned",
            returnedTo: receiverEmail,
            returnedDate: new Date()
         });

         // 2. Award Points to the FINDER (You)
         const userRef = doc(db, "users", user.uid);
         await updateDoc(userRef, { karma: increment(100) });

         showToast(`Success! Verified return to ${receiverEmail}. +100 Karma! 🏆`);
      } catch (err) {
         showToast("Error updating status.", "error");
      }
    } else if (receiverEmail !== null) {
      // User pressed OK but left it empty
      showToast("Email verification required for points.", "warning");
    }
  };

  // 🏆 4. GAMIFIED RESOLUTION (+100 Points for Finder)
  const handleResolveReport = async (reportId) => {
    // 1. Confirm Deletion
    if (!window.confirm("Has this item been returned? This will remove the alert.")) return;

    // 2. Ask for Finder's Details
    const finderEmail = window.prompt("Did a fellow student help you find it?\n\nEnter their SASTRA Email ID to award them +100 Karma Points! 🏆\n(Leave blank if you found it yourself)");

    // 3. Award Points (if email provided)
    if (finderEmail && finderEmail.includes("@")) {
      try {
        // Find the user with this email
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", finderEmail.trim()));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Update their Karma
          const finderDoc = querySnapshot.docs[0];
          await updateDoc(finderDoc.ref, { karma: increment(100) });
          showToast(`Success! +100 Karma sent to ${finderEmail} 🌟`);
        } else {
          showToast("User not found, but report resolved.", "warning");
        }
      } catch (error) {
        console.error("Error awarding karma:", error);
      }
    }

    // 4. Delete the Report
    try {
      await deleteDoc(doc(db, "lost_reports", reportId));
      showToast("Report closed. Glad you found it!");
    } catch (error) {
      showToast("Could not delete report.", "error");
    }
  };

  const handleLogin = async () => {
    if (mobile.length < 10) return showToast("Please enter a valid mobile number", "error");
    localStorage.setItem('sastra_mobile', mobile);
    signInWithPopup(auth, provider);
  };

  // 🏆 5. GAMIFIED UPLOAD (+10 Points)
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
        
        // Add Item
        await addDoc(collection(db, "items"), {
          ...aiResponse,
          imageData: base64String,
          createdAt: new Date(),
          foundBy: user.displayName,
          email: user.email,
          phoneNumber: mobile,
          status: "With Student"
        });

        // Add Points
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { karma: increment(10) });

        showToast("Item posted! You earned 10 Karma Points! 🌟");
        setFile(null);
        setView('dashboard');
      };
    } catch (error) { showToast("AI Analysis failed.", "error"); } finally { setLoading(false); }
  };

  const overdueItems = myFoundItems.filter(item => isOverdue(item.createdAt) && item.status !== "At Security" && item.status !== "Returned");

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Helmet><title>FoundIT | SASTRA University</title></Helmet>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-900'} text-white`}>{toast.message}</div>}
      
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
               karma={karma} 
               myFoundItems={myFoundItems}
               handleReturnedToOwner={handleReturnedToOwner}
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
               <LostReport user={user} onCancel={() => setView('dashboard')} /> 
             </div>
           )}
        </div>
      )}
    </div>
  );
}

export default App;