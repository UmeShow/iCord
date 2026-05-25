'use server';

import { db } from "@/lib/firebase";
import { IUser } from "@/types";

// User Helpers

function makeSerializable<T>(value: T): T {
  const seen = new WeakMap<object, any>();

  const walk = (v: any): any => {
    if (v === null || v === undefined) return v;
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') return v;
    if (t === 'bigint') return Number(v);

    // Firestore Timestamp-like objects.
    if (v && typeof v === 'object' && typeof v.toDate === 'function') {
      try {
        const d = v.toDate();
        if (d instanceof Date) return d.toISOString();
      } catch {
        // ignore
      }
    }

    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(walk);

    if (t === 'object') {
      if (seen.has(v)) return seen.get(v);
      const out: Record<string, any> = {};
      seen.set(v, out);
      for (const [k, val] of Object.entries(v)) {
        out[k] = walk(val);
      }
      return out;
    }

    return undefined;
  };

  return walk(value);
}

export async function getUserProfile(userId: string): Promise<IUser | null> {
  try {
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      // Create new user profile if not exists
      const newUser: IUser = {
        uid: userId,
        customId: `user_${userId.substring(0, 6)}`, // Default custom ID
        displayName: "", // Will be filled from Session usually
        friends: [],
        friendRequestsSent: [],
        friendRequestsReceived: [],
        createdAt: new Date(),
      };
      await userRef.set(newUser);
      return makeSerializable(newUser);
    }

    return makeSerializable(userSnap.data() as IUser);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function updateCustomId(userId: string, newCustomId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Check if customId is taken
    const snapshot = await db.collection('users').where('customId', '==', newCustomId).get();
    if (!snapshot.empty) {
      return { success: false, message: "このIDは既に使用されています。" };
    }

    await db.collection('users').doc(userId).update({
      customId: newCustomId
    });

    return { success: true, message: "IDを変更しました。" };
  } catch (error) {
    console.error("Error updating custom ID:", error);
    return { success: false, message: "エラーが発生しました。" };
  }
}

export async function sendFriendRequest(senderId: string, targetCustomId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Find target user
    const snapshot = await db.collection('users').where('customId', '==', targetCustomId).limit(1).get();
    
    if (snapshot.empty) {
      return { success: false, message: "ユーザーが見つかりませんでした。" };
    }

    const targetUserDoc = snapshot.docs[0];
    const targetUserData = targetUserDoc.data() as IUser;

    if (targetUserData.uid === senderId) {
      return { success: false, message: "自分自身にリクエストを送ることはできません。" };
    }

    if (targetUserData.friends?.includes(senderId)) {
        return { success: false, message: "すでにフレンドです。" };
    }

    if (targetUserData.friendRequestsReceived?.includes(senderId)) {
        return { success: false, message: "すでにリクエストを送信済みです。" };
    }

    // Transaction to update both docs safely
    await db.runTransaction(async (transaction) => {
        const senderRef = db.collection('users').doc(senderId);
        const targetRef = db.collection('users').doc(targetUserData.uid);

        transaction.update(senderRef, {
            friendRequestsSent: [...(await transaction.get(senderRef)).data()?.friendRequestsSent || [], targetUserData.uid]
        });

        transaction.update(targetRef, {
            friendRequestsReceived: [...(targetUserData.friendRequestsReceived || []), senderId]
        });
    });

    return { success: true, message: "フレンドリクエストを送信しました。" };

  } catch (error) {
    console.error("Error sending friend request:", error);
    return { success: false, message: "エラーが発生しました。" };
  }
}

export async function acceptFriendRequest(userId: string, requesterId: string): Promise<{ success: boolean; message: string }> {
    try {
        await db.runTransaction(async (transaction) => {
            const userRef = db.collection('users').doc(userId);
            const requesterRef = db.collection('users').doc(requesterId);

            const userDoc = await transaction.get(userRef);
            const requesterDoc = await transaction.get(requesterRef);

            if (!userDoc.exists || !requesterDoc.exists) {
                throw "User not found";
            }

            const userData = userDoc.data() as IUser;
            const requesterData = requesterDoc.data() as IUser;

            // Update User: Remove request, add friend
            const newRequestsReceived = (userData.friendRequestsReceived || []).filter(id => id !== requesterId);
            const newFriendsUser = [...(userData.friends || []), requesterId];

            transaction.update(userRef, {
                friendRequestsReceived: newRequestsReceived,
                friends: newFriendsUser
            });

            // Update Requester: Remove sent request, add friend
            const newRequestsSent = (requesterData.friendRequestsSent || []).filter(id => id !== userId);
            const newFriendsRequester = [...(requesterData.friends || []), userId];

            transaction.update(requesterRef, {
                friendRequestsSent: newRequestsSent,
                friends: newFriendsRequester
            });
        });

        return { success: true, message: "フレンドになりました！" };
    } catch (error) {
        console.error("Error accepting request:", error);
        return { success: false, message: "エラーが発生しました。" };
    }
}

export async function getFriendsList(userId: string): Promise<IUser[]> {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return [];

        const userData = userDoc.data() as IUser;
        const friendIds = userData.friends || [];

        if (friendIds.length === 0) return [];

        // Fetch all friend docs
        // Firestore 'in' query supports up to 10
        // For simplicity, we fetch individually if array is small, or batch.
        // Or if friendIds is large, we should paginate. Assuming small for now.
        const friends: IUser[] = [];
        for (const fid of friendIds) {
            const fDoc = await db.collection('users').doc(fid).get();
            if (fDoc.exists) {
            friends.push(makeSerializable(fDoc.data() as IUser));
            }
        }
        return makeSerializable(friends);
    } catch (error) {
        console.error("Error getting friends:", error);
        return [];
    }
}

export async function updateUserProfile(
  userId: string, 
  updates: { displayName?: string; bio?: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      ...(updates.displayName !== undefined && { displayName: updates.displayName }),
      ...(updates.bio !== undefined && { bio: updates.bio }),
    });

    return { success: true, message: "プロフィールを更新しました。" };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false, message: "エラーが発生しました。" };
  }
}

export async function rejectFriendRequest(userId: string, requesterId: string): Promise<{ success: boolean; message: string }> {
  try {
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(userId);
      const requesterRef = db.collection('users').doc(requesterId);

      const userDoc = await transaction.get(userRef);
      const requesterDoc = await transaction.get(requesterRef);

      if (!userDoc.exists || !requesterDoc.exists) {
        throw "User not found";
      }

      const userData = userDoc.data() as IUser;
      const requesterData = requesterDoc.data() as IUser;

      // Update User: Remove request
      const newRequestsReceived = (userData.friendRequestsReceived || []).filter(id => id !== requesterId);

      transaction.update(userRef, {
        friendRequestsReceived: newRequestsReceived,
      });

      // Update Requester: Remove sent request
      const newRequestsSent = (requesterData.friendRequestsSent || []).filter(id => id !== userId);

      transaction.update(requesterRef, {
        friendRequestsSent: newRequestsSent,
      });
    });

    return { success: true, message: "リクエストを拒否しました。" };
  } catch (error) {
    console.error("Error rejecting request:", error);
    return { success: false, message: "エラーが発生しました。" };
  }
}

export async function removeFriend(userId: string, friendId: string): Promise<{ success: boolean; message: string }> {
  try {
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(userId);
      const friendRef = db.collection('users').doc(friendId);

      const userDoc = await transaction.get(userRef);
      const friendDoc = await transaction.get(friendRef);

      if (!userDoc.exists || !friendDoc.exists) {
        throw "User not found";
      }

      const userData = userDoc.data() as IUser;
      const friendData = friendDoc.data() as IUser;

      // Remove friend from both sides
      const newUserFriends = (userData.friends || []).filter(id => id !== friendId);
      const newFriendFriends = (friendData.friends || []).filter(id => id !== userId);

      transaction.update(userRef, { friends: newUserFriends });
      transaction.update(friendRef, { friends: newFriendFriends });
    });

    return { success: true, message: "フレンドを削除しました。" };
  } catch (error) {
    console.error("Error removing friend:", error);
    return { success: false, message: "エラーが発生しました。" };
  }
}
