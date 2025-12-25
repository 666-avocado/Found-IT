import React, { useState } from 'react';
import { db } from '../services/firebase-config'; // Import DB
import { collection, addDoc } from 'firebase/firestore'; // Import Firestore functions
import { findPotentialMatches } from '../services/matchService';
import { Loader2, User, Tag, MapPin, Calendar, Phone, Megaphone } from 'lucide-react';

const LostReport = ({ user, onCancel }) => { 
  const [formData, setFormData] = useState({
    name: '',
    date: '', 
    description: '',
    location: ''
  });
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPosted, setIsPosted] = useState(false); // Track if alert is posted

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    setLoading(true);
    setHasSearched(true);
    setIsPosted(false); // Reset posted state on new search
    
    const searchString = `${formData.name} ${formData.description} ${formData.location}`;
    const searchTags = searchString.toLowerCase().trim().split(/\s+/);
    
    try {
      const rawResults = await findPotentialMatches(searchTags);
      const filteredResults = rawResults.filter(item => item.matchScore >= 2);
      setMatches(filteredResults);
    } catch (err) {
      console.error("Search Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Function to save the report to Firestore
  const handleBroadcast = async () => {
    if (!user) return alert("You must be logged in to broadcast.");
    
    try {
      setLoading(true);
      await addDoc(collection(db, "lost_reports"), {
        ...formData,
        userId: user.uid,
        contactName: user.displayName,
        contactEmail: user.email,
        // We assume the phone number is stored in local storage from login
        contactPhone: localStorage.getItem('sastra_mobile') || "Not Provided",
        createdAt: new Date(),
        status: "active"
      });
      setIsPosted(true);
    } catch (error) {
      console.error("Broadcast failed:", error);
      alert("Failed to post alert. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Report Lost Item</h2>
        <p className="text-slate-500 mt-2">Help us find your belongings</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
            <input 
              name="name" type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              placeholder="e.g. Blue Wallet" value={formData.name} onChange={handleChange} required
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date Lost</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                name="date" type="date" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                value={formData.date} onChange={handleChange} required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea 
              name="description" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[100px] text-slate-900"
              placeholder="Details about the item..." value={formData.description} onChange={handleChange}
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location Lost</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                name="location" type="text" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
                placeholder="e.g. Central Park" value={formData.location} onChange={handleChange}
              />
            </div>
          </div>

          {/* Search Buttons */}
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search Database'}
            </button>
          </div>
        </form>
      </div>

      {/* RESULTS SECTION */}
      {hasSearched && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* CASE 1: Matches Found */}
          {matches.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-slate-900">Matches Found: {matches.length}</h3>
              <div className="grid gap-4 md:grid-cols-1">
                {matches.map(match => (
                  <div key={match.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex gap-4 hover:shadow-md transition-shadow">
                    <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={match.imageData} alt={match.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{match.title}</h4>
                      <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                        <Tag className="w-3 h-3" /> {match.category} • {match.color}
                      </p>
                      <button 
                        onClick={() => alert(`Found by: A Student (Anonymous)\nPhone: ${match.phoneNumber || 'Not provided'}`)}
                        className="mt-3 text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"
                    >
                            <Phone className="w-4 h-4" /> Call Finder
                        </button>
                    </div>
                  </div>   
                ))}
              </div>
            </>
          )}

          {/* CASE 2: No Matches -> Broadcast Option */}
          {matches.length === 0 && (
            <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-4">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                <Megaphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">No matches found yet</h3>
                <p className="text-slate-500 max-w-sm mx-auto mt-1">
                  Don't worry! You can broadcast this lost item to the campus feed. If someone finds it later, they can contact you.
                </p>
              </div>
              
              {!isPosted ? (
                <button 
                  onClick={handleBroadcast} 
                  disabled={loading}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-sm w-full md:w-auto"
                >
                  {loading ? 'Posting...' : '📢 Broadcast Lost Alert'}
                </button>
              ) : (
                <div className="p-4 bg-green-100 text-green-700 rounded-lg border border-green-200">
                  ✅ Alert Broadcasted! We will notify you if it is found.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LostReport;