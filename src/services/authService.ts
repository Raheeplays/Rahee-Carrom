import { 
  ref, 
  set, 
  get, 
  child, 
  update, 
  push, 
  onValue,
  off,
  serverTimestamp 
} from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../firebase';
import { User, Feedback } from '../types';

export const AuthService = {
  async testConnection() {
    try {
      await get(child(ref(db), 'users/connection-test'));
      console.log("Connection test successful");
    } catch (error: any) {
      console.error("Firebase Connection Error:", error);
      if (error?.message?.includes('permission_denied')) {
        console.error("Permission Denied: Please update your Realtime Database rules.");
      } else {
        console.error("Please check your Firebase configuration. The client might be offline or URL is missing.");
      }
    }
  },

  async signup(name: string, key: string) {
    try {
      const userCredential = await signInAnonymously(auth);
      const uid = userCredential.user.uid;
      const normalizedName = name.trim().toLowerCase();
      
      // Check if name already exists
      const userSnapshot = await get(child(ref(db), `users/${normalizedName}`));
      if (userSnapshot.exists()) {
        throw new Error('This name is already taken. Please choose another or log in.');
      }
      
      const isAdmin = normalizedName === 'rahee' && key === '786';
      
      const userData = {
        id: normalizedName,
        name: normalizedName,
        key,
        isApproved: isAdmin, // Admin is auto-approved
        isAdmin,
        createdAt: serverTimestamp(),
        uid: uid, // Store the current UID for ownership checks
        raheeCoins: 100, // Initial coins
        raheeDiamonds: 0,
        wins: 0,
        losses: 0,
        xp: 0,
        rank: 1,
        friends: []
      };
      
      // Create user document
      await set(ref(db, `users/${normalizedName}`), userData);
      
      // Create profile mapping for rules
      await set(ref(db, `profiles/${uid}`), {
        name: normalizedName,
        isAdmin
      });

      return userData as User;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  },

  async login(name: string, key: string) {
    try {
      const userCredential = await signInAnonymously(auth);
      const currentUid = userCredential.user.uid;
      const normalizedName = name.trim().toLowerCase();
      
      let userSnapshot = await get(child(ref(db), `users/${normalizedName}`));
      
      // Bootstrap Admin if it doesn't exist
      if (!userSnapshot.exists() && normalizedName === 'rahee' && key === '786') {
        console.log("Bootstrapping admin account...");
        await this.signup(name, key);
        userSnapshot = await get(child(ref(db), `users/${normalizedName}`));
      }

      if (!userSnapshot.exists()) {
        throw new Error('Account not found. Please sign up first.');
      }
      
      const userData = userSnapshot.val();
      if (userData.key !== key) {
        throw new Error('Invalid key. Please try again.');
      }
      
      if (!userData.isApproved && !userData.isAdmin) {
        throw new Error('Your account is pending approval from Rahee');
      }

      // Update the UID in the document to the current session's UID
      if (userData.uid !== currentUid) {
        await update(ref(db, `users/${normalizedName}`), { uid: currentUid });
        // Also update profile mapping
        await set(ref(db, `profiles/${currentUid}`), {
          name: normalizedName,
          isAdmin: userData.isAdmin || false
        });
      }
      
      return { ...userData, uid: currentUid } as User;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  async getUser(userId: string): Promise<User | null> {
    try {
      const snapshot = await get(child(ref(db), `users/${userId}`));
      if (snapshot.exists()) {
        return snapshot.val() as User;
      }
      return null;
    } catch (error) {
      console.error("Error getting user:", error);
      return null;
    }
  },

  async getUnapprovedUsers() {
    try {
      const snapshot = await get(child(ref(db), 'users'));
      if (!snapshot.exists()) return [];
      const users = snapshot.val();
      return Object.values(users).filter((u: any) => !u.isApproved && !u.isAdmin) as User[];
    } catch (error) {
      console.error("Error getting unapproved users:", error);
      return [];
    }
  },

  async getAllUsers() {
    try {
      const snapshot = await get(child(ref(db), 'users'));
      if (!snapshot.exists()) return [];
      return Object.values(snapshot.val()) as User[];
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  },

  async approveUser(userId: string) {
    try {
      await update(ref(db, `users/${userId}`), { isApproved: true });
    } catch (error) {
      console.error("Error approving user:", error);
    }
  },

  async deleteUser(userId: string) {
    try {
      await set(ref(db, `users/${userId}`), null);
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  },

  async saveUser(user: User) {
    try {
      await set(ref(db, `users/${user.id}`), user);
    } catch (error) {
      console.error("Error saving user:", error);
      throw error;
    }
  },

  async submitFeedback(userId: string, userName: string, message: string) {
    try {
      const feedbackRef = ref(db, 'feedback');
      const newFeedbackRef = push(feedbackRef);
      await set(newFeedbackRef, {
        id: newFeedbackRef.key,
        userId,
        userName,
        message,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  },

  async getFeedback() {
    try {
      const snapshot = await get(child(ref(db), 'feedback'));
      if (!snapshot.exists()) return [];
      return Object.values(snapshot.val()) as Feedback[];
    } catch (error) {
      console.error("Error getting feedback:", error);
      return [];
    }
  },

  async updateUserStats(userId: string, stats: Partial<User>) {
    try {
      const updates: any = {};
      if (stats.raheeCoins !== undefined) updates.raheeCoins = stats.raheeCoins;
      if (stats.raheeDiamonds !== undefined) updates.raheeDiamonds = stats.raheeDiamonds;
      if (stats.wins !== undefined) updates.wins = stats.wins;
      if (stats.losses !== undefined) updates.losses = stats.losses;
      if (stats.xp !== undefined) updates.xp = stats.xp;
      if (stats.rank !== undefined) updates.rank = stats.rank;
      if (stats.friends !== undefined) updates.friends = stats.friends;
      
      await update(ref(db, `users/${userId}`), updates);
    } catch (error) {
      console.error("Error updating user stats:", error);
      throw error;
    }
  },

  calculateRank(xp: number): number {
    if (xp < 100) return 1;
    if (xp < 500) return 2;
    if (xp < 1000) return 3;
    
    let rank = 3;
    let requiredXp = 1000;
    while (xp >= requiredXp * 2) {
      requiredXp *= 2;
      rank++;
    }
    return rank;
  },

  async addXP(userId: string, amount: number) {
    const user = await this.getUser(userId);
    if (!user) return;

    const newXp = Math.max(0, (user.xp || 0) + amount);
    const newRank = this.calculateRank(newXp);

    await this.updateUserStats(userId, { xp: newXp, rank: newRank });
  },

  async sendFriendRequest(fromId: string, fromName: string, toId: string) {
    const requestsRef = ref(db, `friendRequests/${toId}`);
    const newRequestRef = push(requestsRef);
    await set(newRequestRef, {
      id: newRequestRef.key,
      fromId,
      fromName,
      toId,
      status: 'pending',
      createdAt: serverTimestamp()
    });
  },

  async acceptFriendRequest(requestId: string, userId: string, friendId: string) {
    // Add to both users' friends lists
    const user = await this.getUser(userId);
    const friend = await this.getUser(friendId);

    if (user && friend) {
      const userFriends = Array.isArray(user.friends) ? [...user.friends] : [];
      const friendFriends = Array.isArray(friend.friends) ? [...friend.friends] : [];

      if (!userFriends.includes(friendId)) userFriends.push(friendId);
      if (!friendFriends.includes(userId)) friendFriends.push(userId);

      await this.updateUserStats(userId, { friends: userFriends });
      await this.updateUserStats(friendId, { friends: friendFriends });
      
      // Delete request
      await set(ref(db, `friendRequests/${userId}/${requestId}`), null);
    }
  },

  subscribeToFriendRequests(userId: string, callback: (requests: any[]) => void) {
    const requestsRef = ref(db, `friendRequests/${userId}`);
    const listener = onValue(requestsRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(Object.values(snapshot.val()));
      } else {
        callback([]);
      }
    });
    return () => off(requestsRef, 'value', listener);
  }
};
