'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { getStatus, getShoppingList, addItemToInventory } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import Skeleton from '@/components/Skeleton';

export default function ShopPage() {
  const [loading, setLoading] = useState(true);
  const [shoppingList, setShoppingList] = useState<string[]>([]);
  const [weekOf, setWeekOf] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const status = await getStatus();
      if (status?.week_of) {
        setWeekOf(status.week_of);
        const listData = await getShoppingList(status.week_of);
        setShoppingList(listData.shopping_list || []);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Failed to load shopping list', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleItemCheck(item: string) {
    try {
      setAddingItem(item);
      // Assume it goes to fridge by default, or we could guess based on item type
      // For now, let's default to 'fridge' as it's the safest 'bought' location
      await addItemToInventory('fridge', item);
      
      showToast(`Added ${item} to fridge!`, 'success');
      
      // Remove from local list immediately (optimistic UI)
      setShoppingList(prev => prev.filter(i => i !== item));
      
      // Background refresh to ensure sync
      if (weekOf) {
        const listData = await getShoppingList(weekOf);
        setShoppingList(listData.shopping_list || []);
      }
    } catch (err: any) {
      showToast('Failed to update inventory', 'error');
    } finally {
      setAddingItem(null);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto max-w-2xl animate-pulse">
            <h1 className="text-4xl font-bold mb-8">Shopping List</h1>
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-12 w-full mb-4" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold mb-2">Shopping List</h1>
        <p className="text-[var(--text-muted)] mb-8">
          {weekOf ? `Items needed for week of ${weekOf}` : 'No active meal plan found.'}
        </p>

        {shoppingList.length > 0 ? (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex justify-between items-center">
                <span>To Buy ({shoppingList.length})</span>
                <span className="text-xs font-normal text-[var(--text-muted)]">Check to add to inventory</span>
            </h3>

            <div className="space-y-1">
              {shoppingList.map((item) => (
                <label 
                    key={item} 
                    className={`flex items-center gap-4 p-4 border-b border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-sidebar)] rounded transition-all ${addingItem === item ? 'opacity-50' : ''}`}
                >
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-[var(--accent-primary)]"
                    checked={false} // Always unchecked because checking it removes it
                    disabled={addingItem === item}
                    onChange={() => handleItemCheck(item)}
                  />
                  <span className={addingItem === item ? 'line-through text-[var(--text-muted)]' : ''}>
                    {item}
                  </span>
                  {addingItem === item && <span className="text-xs text-[var(--text-muted)] ml-auto">Adding...</span>}
                </label>
              ))}
            </div>
          </div>
        ) : (
             <div className="card p-12 text-center">
                <div className="text-6xl mb-4">🛒</div>
                <h3 className="text-xl font-bold mb-2">All Clear!</h3>
                <p className="text-[var(--text-muted)]">
                    {weekOf 
                        ? "You have all the ingredients needed for this week's plan." 
                        : "Start a meal plan to generate a shopping list."}
                </p>
             </div>
        )}
      </div>
    </AppLayout>
  );
}
