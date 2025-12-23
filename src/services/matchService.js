import { db } from './firebase-config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export const findPotentialMatches = async (searchTags) => {
  const itemsRef = collection(db, "items");
  
  // FIX: specific "where" clause removed to prevent the 'undefined' error.
  // We fetch all recent items and filter them ourselves.
  const q = query(itemsRef, orderBy("createdAt", "desc"));
  
  const querySnapshot = await getDocs(q);
  
  const matchedItems = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    
    // Create a giant string of the item's details to search against
    const itemText = `${data.title} ${data.category} ${data.color}`.toLowerCase();
    
    // Check if ANY of the user's search words exist in that item
    const score = searchTags.reduce((acc, tag) => {
      return itemText.includes(tag) ? acc + 1 : acc;
    }, 0);

    // If at least one word matches, add it to results
    if (score > 0) {
      matchedItems.push({ id: doc.id, ...data, matchScore: score });
    }
  });

  // Return best matches first
  return matchedItems.sort((a, b) => b.matchScore - a.matchScore);
};