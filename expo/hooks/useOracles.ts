import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Oracle, OracleCategory } from '@/types/oracle';
import { useAuth } from '@/hooks/useAuth';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export const [OracleProvider, useOracles] = createContextHook(() => {
  const { user } = useAuth();
  const [oracles, setOracles] = useState<Oracle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const ONBOARDING_KEY = `oracleforge_onboarding_${user?.uid || 'guest'}`;

  useEffect(() => {
    if (!user) {
      setOracles([]);
      setIsLoading(false);
      return;
    }

    const loadOnboarding = async () => {
      try {
        const onboardingComplete = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasCompletedOnboarding(onboardingComplete === 'true');
      } catch (error) {
        console.log('Error loading onboarding status:', error);
      }
    };

    loadOnboarding();

    const oraclesRef = collection(db, 'users', user.uid, 'oracles');
    const q = query(oraclesRef, orderBy('createdAt', 'desc'));

    console.log('Setting up Firestore listener for user:', user.uid);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('Firestore snapshot received:', snapshot.size, 'oracles');
        const oracleData: Oracle[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
            lastUsedAt: data.lastUsedAt ? (data.lastUsedAt instanceof Timestamp ? data.lastUsedAt.toDate() : new Date(data.lastUsedAt)) : undefined,
          } as Oracle;
        });
        setOracles(oracleData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading oracles from Firestore:', error);
        setOracles([]);
        setIsLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up Firestore listener');
      unsubscribe();
    };
  }, [user, ONBOARDING_KEY]);



  const addOracle = useCallback(async (oracle: Omit<Oracle, 'id' | 'createdAt' | 'usageCount' | 'isFavorite'>) => {
    if (!user) {
      console.error('Cannot add oracle: user not authenticated');
      return null;
    }

    try {
      const oraclesRef = collection(db, 'users', user.uid, 'oracles');
      const docRef = await addDoc(oraclesRef, {
        ...oracle,
        createdAt: serverTimestamp(),
        usageCount: 0,
        isFavorite: false,
      });
      
      console.log('Oracle added to Firestore:', docRef.id);
      
      return {
        ...oracle,
        id: docRef.id,
        createdAt: new Date(),
        usageCount: 0,
        isFavorite: false,
      } as Oracle;
    } catch (error) {
      console.error('Error adding oracle to Firestore:', error);
      return null;
    }
  }, [user]);

  const updateOracle = useCallback(async (id: string, updates: Partial<Oracle>) => {
    if (!user) {
      console.error('Cannot update oracle: user not authenticated');
      return;
    }

    try {
      const oracleRef = doc(db, 'users', user.uid, 'oracles', id);
      const cleanUpdates = { ...updates };
      delete (cleanUpdates as any).id;
      delete (cleanUpdates as any).createdAt;
      
      await updateDoc(oracleRef, cleanUpdates);
      console.log('Oracle updated in Firestore:', id);
    } catch (error) {
      console.error('Error updating oracle in Firestore:', error);
    }
  }, [user]);

  const deleteOracle = useCallback(async (id: string) => {
    if (!user) {
      console.error('Cannot delete oracle: user not authenticated');
      return;
    }

    try {
      const oracleRef = doc(db, 'users', user.uid, 'oracles', id);
      await deleteDoc(oracleRef);
      console.log('Oracle deleted from Firestore:', id);
    } catch (error) {
      console.error('Error deleting oracle from Firestore:', error);
    }
  }, [user]);

  const toggleFavorite = useCallback(async (id: string) => {
    if (!user) {
      console.error('Cannot toggle favorite: user not authenticated');
      return;
    }

    const oracle = oracles.find((o) => o.id === id);
    if (!oracle) return;

    try {
      const oracleRef = doc(db, 'users', user.uid, 'oracles', id);
      await updateDoc(oracleRef, {
        isFavorite: !oracle.isFavorite,
      });
      console.log('Oracle favorite toggled in Firestore:', id);
    } catch (error) {
      console.error('Error toggling favorite in Firestore:', error);
    }
  }, [user, oracles]);

  const incrementOracleUsage = useCallback(async (id: string) => {
    if (!user) {
      console.error('Cannot increment usage: user not authenticated');
      return;
    }

    const oracle = oracles.find((o) => o.id === id);
    if (!oracle) return;

    try {
      const oracleRef = doc(db, 'users', user.uid, 'oracles', id);
      await updateDoc(oracleRef, {
        usageCount: oracle.usageCount + 1,
        lastUsedAt: serverTimestamp(),
      });
      console.log('Oracle usage incremented in Firestore:', id);
    } catch (error) {
      console.error('Error incrementing usage in Firestore:', error);
    }
  }, [user, oracles]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    setHasCompletedOnboarding(true);
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  }, [user, ONBOARDING_KEY]);

  const favoriteOracles = oracles.filter((o) => o.isFavorite);
  const recentOracles = [...oracles]
    .filter((o) => o.lastUsedAt)
    .sort((a, b) => (b.lastUsedAt?.getTime() || 0) - (a.lastUsedAt?.getTime() || 0))
    .slice(0, 5);

  const getOraclesByCategory = useCallback((category: OracleCategory) => {
    return oracles.filter((o) => o.category === category);
  }, [oracles]);

  return {
    oracles,
    isLoading,
    hasCompletedOnboarding,
    favoriteOracles,
    recentOracles,
    addOracle,
    updateOracle,
    deleteOracle,
    toggleFavorite,
    incrementOracleUsage,
    getOraclesByCategory,
    completeOnboarding,
  };
});
