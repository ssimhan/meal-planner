'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  getStatus,
  getShoppingList,
  addItemToInventory,
  getStores,
  addStore,
  mapItemToStore,
  addShoppingListExtras,
  removeShoppingListExtra
} from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import Skeleton from '@/components/Skeleton';

interface ShoppingItem {
  item: string;
  store: string;
}

export default function ShopPage() {
  const [loading, setLoading] = useState(true);
  const [fullList, setFullList] = useState<ShoppingItem[]>([]);
  const [weekOf, setWeekOf] = useState<string | null>(null);

  // Store Data
  const [stores, setStores] = useState<string[]>(['Other']);

  // Quick Add State
  const [quickAddText, setQuickAddText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Store Management State
  const [showAddStore, setShowAddStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [statusRes, storesRes] = await Promise.all([
        getStatus(),
        getStores()
      ]);

      if (storesRes.stores) {
        setStores(storesRes.stores);
      }

      if (statusRes?.week_of) {
        setWeekOf(statusRes.week_of);
        const listData = await getShoppingList(statusRes.week_of);
        // Backend now returns {item, store}[] (validated by backend changes)
        setFullList(listData.shopping_list || []);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Group items by store
  const groupedItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    stores.forEach(s => groups[s] = []);
    groups['Other'] = []; // Ensure Other exists

    fullList.forEach(obj => {
      const store = obj.store || 'Other';
      if (!groups[store]) groups[store] = [];
      groups[store].push(obj);
    });

    return groups;
  }, [fullList, stores]);

  async function handleQuickAdd() {
    if (!quickAddText.trim() || !weekOf) return;
    setIsAdding(true);
    try {
      const items = quickAddText.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
      if (items.length === 0) return;

      await addShoppingListExtras(weekOf, items);
      showToast(`Added ${items.length} items`, 'success');
      setQuickAddText('');

      // Refresh
      const listData = await getShoppingList(weekOf);
      setFullList(listData.shopping_list || []);

    } catch (err) {
      showToast('Failed to add items', 'error');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleAddStore() {
    if (!newStoreName.trim()) return;
    try {
      const res = await addStore(newStoreName);
      if (res.stores) setStores(res.stores);
      setNewStoreName('');
      setShowAddStore(false);
      showToast('Store added', 'success');
    } catch (err) {
      showToast('Failed to add store', 'error');
    }
  }

  async function handleStoreChange(item: string, newStore: string) {
    try {
      await mapItemToStore(item, newStore);
      showToast(`Moved ${item} to ${newStore}`, 'success');
      // Optimistic update
      setFullList(prev => prev.map(i => i.item === item ? { ...i, store: newStore } : i));
    } catch (err) {
      showToast('Failed to map item', 'error');
    }
  }

  async function handleCheck(itemObj: ShoppingItem) {
    try {
      await addItemToInventory('fridge', itemObj.item);
      showToast(`Bought ${itemObj.item}`, 'success');
      setFullList(prev => prev.filter(i => i.item !== itemObj.item));

      if (weekOf) {
        await removeShoppingListExtra(weekOf, itemObj.item);
      }
    } catch (err) {
      showToast('Failed to check item', 'error');
    }
  }

  if (loading) return <AppLayout><div className="p-8"><Skeleton className="h-12 w-96" /></div></AppLayout>;

  // Get active stores (stores + any that appear in groups but not in stores list, though ideally they should match)
  const allStoreKeys = Array.from(new Set([...stores, ...Object.keys(groupedItems)]));

  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl pb-24">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold mb-2">Shopping List</h1>
            <p className="text-[var(--text-muted)]">Week of {weekOf}</p>
          </div>
          <button
            onClick={() => setShowAddStore(!showAddStore)}
            className="text-sm text-[var(--accent-sage)] hover:underline"
          >
            {showAddStore ? 'Cancel' : 'Manage Stores'}
          </button>
        </header>

        {showAddStore && (
          <div className="card mb-6 bg-[var(--bg-secondary)]">
            <h3 className="font-bold mb-2">Add New Store</h3>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Store Name (e.g. Costco)"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
              />
              <button className="btn-primary" onClick={handleAddStore}>Add</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {stores.map(s => (
                <span key={s} className="px-2 py-1 bg-white rounded border border-[var(--border-subtle)] text-xs">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="card mb-8">
          <h3 className="text-sm font-bold uppercase text-[var(--text-muted)] tracking-widest mb-2">Quick Add</h3>
          <div className="flex flex-col gap-2">
            <textarea
              className="input min-h-[80px]"
              placeholder="Paste items (e.g. Milk, Eggs, Bread)..."
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                className="btn-primary"
                onClick={handleQuickAdd}
                disabled={isAdding || !quickAddText.trim()}
              >
                {isAdding ? 'Adding...' : 'Add Items'}
              </button>
            </div>
          </div>
        </div>

        {fullList.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <p>All clear! Nothing to buy.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {allStoreKeys.map(storeName => {
              const items = groupedItems[storeName] || [];
              if (items.length === 0) return null;

              return (
                <div key={storeName} className="card">
                  <h3 className="text-lg font-bold mb-4 pb-2 border-b border-[var(--border-subtle)] text-[var(--accent-primary)]">
                    {storeName} <span className="text-sm font-normal text-[var(--text-muted)]">({items.length})</span>
                  </h3>
                  <div className="space-y-1">
                    {items.map((obj, idx) => (
                      <div key={`${obj.item}-${idx}`} className="flex items-center gap-3 p-3 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-sidebar)] transition-colors group last:border-0 can-hover">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-[var(--accent-primary)] cursor-pointer"
                          onChange={() => handleCheck(obj)}
                        />
                        <span className="flex-1 font-medium">{obj.item}</span>
                        <select
                          className="text-xs bg-transparent text-[var(--text-muted)] border-none focus:ring-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          value={obj.store}
                          onChange={(e) => handleStoreChange(obj.item, e.target.value)}
                        >
                          {stores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
