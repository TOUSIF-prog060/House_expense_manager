'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Edit2,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  DEFAULT_SUPPLY_CATEGORIES,
  autoCategorizeSupplyItem,
  getCategoryMeta,
  parseSupplyInput,
} from '@/lib/supplies/categories';

export type SupplyItem = {
  id: string;
  household_id: string;
  name: string;
  quantity: string | null;
  category: string;
  notes: string | null;
  is_purchased: boolean;
  added_by: string | null;
  purchased_by: string | null;
  purchased_at: string | null;
  created_at: string;
  updated_at: string;
};

type Profile = {
  id: string;
  display_name: string;
};

export function SuppliesBoard({
  householdId,
  initialSupplies,
  currentUserId,
  profiles,
}: {
  householdId: string;
  initialSupplies: SupplyItem[];
  currentUserId: string;
  profiles: Profile[];
}) {
  const router = useRouter();
  const [supplies, setSupplies] = useState<SupplyItem[]>(initialSupplies);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'purchased'>('all');
  const [shoppingMode, setShoppingMode] = useState(false);
  const [showPurchasedGroup, setShowPurchasedGroup] = useState(true);

  // Quick Add State (Item + Quantity only)
  const [quickName, setQuickName] = useState('');
  const [quickQuantity, setQuickQuantity] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Detailed Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplyItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [formBusy, setFormBusy] = useState(false);

  // Sync state if server sends new data
  useMemo(() => {
    setSupplies(initialSupplies);
  }, [initialSupplies]);

  const profileMap = useMemo(() => {
    return new Map(profiles.map((p) => [p.id, p.display_name]));
  }, [profiles]);

  // Real-time automatic category inference
  const quickAutoCategory = useMemo(() => {
    return quickName.trim() ? autoCategorizeSupplyItem(quickName) : null;
  }, [quickName]);

  const formAutoCategory = useMemo(() => {
    return formName.trim() ? autoCategorizeSupplyItem(formName) : 'Groceries';
  }, [formName]);

  // Statistics
  const totalCount = supplies.length;
  const pendingItems = supplies.filter((s) => !s.is_purchased);
  const purchasedItems = supplies.filter((s) => s.is_purchased);
  const pendingCount = pendingItems.length;
  const purchasedCount = purchasedItems.length;

  // Filtered Items
  const filteredItems = useMemo(() => {
    return supplies.filter((item) => {
      // Status filter
      if (statusFilter === 'pending' && item.is_purchased) return false;
      if (statusFilter === 'purchased' && !item.is_purchased) return false;

      // Category filter
      if (selectedCategory !== 'all') {
        if (item.category.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q) ?? false;
        const matchCat = item.category.toLowerCase().includes(q);
        const matchQty = item.quantity?.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchNotes && !matchCat && !matchQty) return false;
      }

      return true;
    });
  }, [supplies, statusFilter, selectedCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of supplies) {
      if (!item.is_purchased) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
    }
    return counts;
  }, [supplies]);

  // Toggle Purchased Status
  async function togglePurchaseStatus(item: SupplyItem) {
    const nextPurchased = !item.is_purchased;

    // Optimistic update
    setSupplies((prev) =>
      prev.map((s) =>
        s.id === item.id
          ? {
              ...s,
              is_purchased: nextPurchased,
              purchased_by: nextPurchased ? currentUserId : null,
              purchased_at: nextPurchased ? new Date().toISOString() : null,
            }
          : s
      )
    );

    try {
      const res = await fetch(`/api/backend/supplies/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_purchased: nextPurchased }),
      });
      if (!res.ok) {
        throw new Error('Failed to update status');
      }
      router.refresh();
    } catch {
      // Revert on error
      setSupplies((prev) =>
        prev.map((s) => (s.id === item.id ? item : s))
      );
    }
  }

  // Quick Add handler (Uploads Item and Quantity; auto-determines category)
  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmedInput = quickName.trim();
    if (!trimmedInput) return;

    setIsAdding(true);
    try {
      // If user typed quantity inline (e.g. "Milk 2L"), parse it cleanly
      const parsed = parseSupplyInput(trimmedInput);
      const finalName = parsed.name || trimmedInput;
      const finalQuantity = quickQuantity.trim() || parsed.quantity;
      const finalCategory = autoCategorizeSupplyItem(finalName);

      const res = await fetch('/api/backend/supplies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          name: finalName,
          quantity: finalQuantity || null,
          category: finalCategory,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.data) {
        throw new Error(json.error || 'Could not add supply');
      }

      setSupplies((prev) => [json.data, ...prev]);
      setQuickName('');
      setQuickQuantity('');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error adding item');
    } finally {
      setIsAdding(false);
    }
  }

  // Open Add Modal
  function openAddModal() {
    setEditingItem(null);
    setFormName('');
    setFormQuantity('');
    setFormNotes('');
    setFormError('');
    setModalOpen(true);
  }

  // Open Edit Modal
  function openEditModal(item: SupplyItem) {
    setEditingItem(item);
    setFormName(item.name);
    setFormQuantity(item.quantity ?? '');
    setFormNotes(item.notes ?? '');
    setFormError('');
    setModalOpen(true);
  }

  // Save Modal Form (Add or Edit) - Category is automatically understood!
  async function handleSaveModal(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    const trimmedInput = formName.trim();
    if (!trimmedInput) {
      setFormError('Please enter an item name.');
      return;
    }

    const parsed = parseSupplyInput(trimmedInput);
    const finalName = parsed.name || trimmedInput;
    const finalQuantity = formQuantity.trim() || parsed.quantity;
    const finalCategory = autoCategorizeSupplyItem(finalName);

    setFormBusy(true);

    try {
      if (editingItem) {
        // Edit existing
        const res = await fetch(`/api/backend/supplies/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: finalName,
            quantity: finalQuantity || null,
            category: finalCategory,
            notes: formNotes.trim() || null,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.data) {
          throw new Error(json.error || 'Failed to update item');
        }

        setSupplies((prev) =>
          prev.map((s) => (s.id === editingItem.id ? json.data : s))
        );
      } else {
        // Create new
        const res = await fetch('/api/backend/supplies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            householdId,
            name: finalName,
            quantity: finalQuantity || null,
            category: finalCategory,
            notes: formNotes.trim() || null,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.data) {
          throw new Error(json.error || 'Failed to add item');
        }

        setSupplies((prev) => [json.data, ...prev]);
      }

      setModalOpen(false);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setFormBusy(false);
    }
  }

  // Delete item
  async function handleDelete(item: SupplyItem) {
    if (!confirm(`Remove “${item.name}” from the supplies board?`)) return;

    setSupplies((prev) => prev.filter((s) => s.id !== item.id));

    try {
      const res = await fetch(`/api/backend/supplies/${item.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete item');
      }
      router.refresh();
    } catch {
      // Revert if error
      setSupplies((prev) => [...prev, item]);
      alert('Could not delete item. Please check your connection.');
    }
  }

  // Clear all purchased items
  async function handleClearPurchased() {
    if (purchasedCount === 0) return;
    if (!confirm(`Clear all ${purchasedCount} purchased items from the board?`)) return;

    const toDelete = supplies.filter((s) => s.is_purchased);
    setSupplies((prev) => prev.filter((s) => !s.is_purchased));

    try {
      await Promise.all(
        toDelete.map((item) =>
          fetch(`/api/backend/supplies/${item.id}`, { method: 'DELETE' })
        )
      );
      router.refresh();
    } catch {
      alert('Some items could not be cleared.');
      router.refresh();
    }
  }

  return (
    <div className="page-wrap supplies-page">
      {/* Header Row */}
      <div className="page-title-row">
        <div>
          <span className="eyebrow">HOUSEHOLD PANTRY & GROCERY BOARD</span>
          <h1>Supplies Board</h1>
          <p>Easily track needed items and quantities. Categories are automatically organized for you.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`button ${shoppingMode ? 'button-primary' : 'button-quiet'}`}
            onClick={() => setShoppingMode(!shoppingMode)}
            title="Focus on shopping checklist with quick taps"
          >
            <ShoppingCart size={16} />
            {shoppingMode ? 'Exit Shopping' : 'Shopping Mode'}
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={openAddModal}
          >
            <Plus size={16} /> Add Supply
          </button>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="stat-grid">
        <div
          className={`stat-card ${statusFilter === 'all' ? 'stat-highlight' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setStatusFilter('all')}
        >
          <span>All Supplies</span>
          <strong>{totalCount}</strong>
          <small>Total tracked items</small>
        </div>
        <div
          className={`stat-card ${statusFilter === 'pending' ? 'stat-highlight' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setStatusFilter('pending')}
        >
          <span style={{ color: pendingCount > 0 ? 'var(--orange, #f59e0b)' : 'inherit' }}>
            To Buy
          </span>
          <strong style={{ color: pendingCount > 0 ? 'var(--orange, #f59e0b)' : 'inherit' }}>
            {pendingCount}
          </strong>
          <small>{pendingCount === 0 ? 'All stocked up!' : 'Needed by housemates'}</small>
        </div>
        <div
          className={`stat-card ${statusFilter === 'purchased' ? 'stat-highlight' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setStatusFilter('purchased')}
        >
          <span style={{ color: 'var(--green, #10b981)' }}>Purchased</span>
          <strong style={{ color: 'var(--green, #10b981)' }}>{purchasedCount}</strong>
          <small>Ready to convert to expense</small>
        </div>
      </div>

      {/* Fast 2-field Quick Add Bar: Item & Quantity (Auto-categorized) */}
      <form className="supplies-quick-add-form" onSubmit={handleQuickAdd}>
        <div className="quick-add-container">
          <div className="quick-add-input-wrap">
            <input
              type="text"
              className="quick-add-input"
              placeholder="Item name (e.g. Milk, Dish soap, Apples, Bread...)"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              disabled={isAdding}
            />
            <input
              type="text"
              className="quick-add-qty-input"
              placeholder="Qty (e.g. 2L, 1 kg, 3 packs)"
              value={quickQuantity}
              onChange={(e) => setQuickQuantity(e.target.value)}
              disabled={isAdding}
            />
            {quickAutoCategory && (
              <div
                className="quick-auto-cat-preview"
                title="Category is detected automatically"
              >
                <Sparkles size={13} className="sparkle-icon" />
                <span>
                  {getCategoryMeta(quickAutoCategory).emoji} {quickAutoCategory}
                </span>
              </div>
            )}
            <button
              type="submit"
              className="button button-primary quick-add-btn"
              disabled={!quickName.trim() || isAdding}
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>
        </div>
      </form>

      {/* Filter and Search Bar */}
      <div className="supplies-toolbar">
        <div className="supplies-search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="search"
            placeholder="Search supplies or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="supplies-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status segmented buttons */}
        <div className="segmented">
          <button
            type="button"
            className={statusFilter === 'all' ? 'selected' : ''}
            onClick={() => setStatusFilter('all')}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            className={statusFilter === 'pending' ? 'selected' : ''}
            onClick={() => setStatusFilter('pending')}
          >
            To Buy ({pendingCount})
          </button>
          <button
            type="button"
            className={statusFilter === 'purchased' ? 'selected' : ''}
            onClick={() => setStatusFilter('purchased')}
          >
            Purchased ({purchasedCount})
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="supplies-category-scroll">
        <button
          type="button"
          className={`category-pill ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          <span>✨ All Categories</span>
        </button>
        {DEFAULT_SUPPLY_CATEGORIES.map((cat) => {
          const count = categoryCounts[cat.name] || 0;
          const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
          return (
            <button
              type="button"
              key={cat.name}
              className={`category-pill ${isSelected ? 'active' : ''}`}
              style={{
                borderColor: isSelected ? cat.color : undefined,
                color: isSelected ? cat.color : undefined,
              }}
              onClick={() =>
                setSelectedCategory(isSelected ? 'all' : cat.name)
              }
            >
              <span>{cat.emoji} {cat.name}</span>
              {count > 0 && <span className="pill-badge">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Main Checklist Content */}
      <div className="supplies-list-container">
        {/* Shopping Mode Banner */}
        {shoppingMode && (
          <div className="shopping-mode-banner">
            <div>
              <strong>🛒 Shopping Mode Active</strong>
              <p>Tap checkboxes as you add items to your cart. Click &ldquo;Convert to Expense&rdquo; to split costs.</p>
            </div>
            <button
              type="button"
              className="button button-quiet"
              style={{ height: '32px', fontSize: '13px' }}
              onClick={() => setShoppingMode(false)}
            >
              Done Shopping
            </button>
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="supplies-empty-state">
            <span className="empty-icon">🧺</span>
            <h3>No supplies found</h3>
            <p>
              {searchQuery || selectedCategory !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters or search keywords.'
                : 'Your household supplies board is clear. Add items that need restocking!'}
            </p>
            <button
              type="button"
              className="button button-primary"
              onClick={openAddModal}
              style={{ marginTop: '0.75rem' }}
            >
              <Plus size={16} /> Add First Item
            </button>
          </div>
        ) : (
          <>
            {/* Pending / Active Items List */}
            {statusFilter !== 'purchased' && (
              <div className="supplies-section">
                <div className="section-header-row">
                  <h2>
                    Items to Buy{' '}
                    <span className="count-tag">
                      {filteredItems.filter((i) => !i.is_purchased).length}
                    </span>
                  </h2>
                </div>

                <div className="supplies-cards-grid">
                  {filteredItems
                    .filter((item) => !item.is_purchased)
                    .map((item) => (
                      <SupplyCard
                        key={item.id}
                        item={item}
                        profileMap={profileMap}
                        shoppingMode={shoppingMode}
                        onToggle={() => togglePurchaseStatus(item)}
                        onEdit={() => openEditModal(item)}
                        onDelete={() => handleDelete(item)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Purchased / Completed Section */}
            {statusFilter !== 'pending' && purchasedItems.length > 0 && (
              <div className="supplies-section purchased-section">
                <div
                  className="section-header-row"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setShowPurchasedGroup(!showPurchasedGroup)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h2>
                      Purchased Items{' '}
                      <span className="count-tag purchased-tag">
                        {filteredItems.filter((i) => i.is_purchased).length}
                      </span>
                    </h2>
                    {showPurchasedGroup ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>

                  <button
                    type="button"
                    className="clear-completed-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearPurchased();
                    }}
                  >
                    Clear all purchased
                  </button>
                </div>

                {showPurchasedGroup && (
                  <div className="supplies-cards-grid">
                    {filteredItems
                      .filter((item) => item.is_purchased)
                      .map((item) => (
                        <SupplyCard
                          key={item.id}
                          item={item}
                          profileMap={profileMap}
                          shoppingMode={shoppingMode}
                          onToggle={() => togglePurchaseStatus(item)}
                          onEdit={() => openEditModal(item)}
                          onDelete={() => handleDelete(item)}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Simple Add / Edit Supply Modal (Just Item & Quantity) */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Supply' : 'Add to Supplies Board'}</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div className="modal-body">
                {formError && (
                  <div className="form-error" role="alert">
                    {formError}
                  </div>
                )}

                <label className="field">
                  <span>Item Name *</span>
                  <input
                    required
                    type="text"
                    maxLength={120}
                    placeholder="e.g. Dish soap, Almond milk, Bread, Toothpaste, Eggs"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Quantity / Size <em>optional</em></span>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="e.g. 2L, 500g, 2 bottles, 1 pack, 6 pcs"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                  />
                </label>

                {/* Auto-detected category badge */}
                <div className="auto-category-box">
                  <div className="auto-cat-header">
                    <Sparkles size={14} className="sparkle-icon" />
                    <span>Auto-Organized Category</span>
                  </div>
                  <div className="auto-cat-pill-wrap">
                    <span
                      className="supply-cat-tag"
                      style={{
                        color: getCategoryMeta(formAutoCategory).color,
                        backgroundColor: getCategoryMeta(formAutoCategory).bg,
                        borderColor: getCategoryMeta(formAutoCategory).border,
                        fontSize: '0.86rem',
                        padding: '0.3rem 0.75rem',
                      }}
                    >
                      <span>{getCategoryMeta(formAutoCategory).emoji}</span>
                      <strong>{formAutoCategory}</strong>
                    </span>
                    <small className="auto-cat-note">
                      Automatically understood from item name.
                    </small>
                  </div>
                </div>

                <label className="field">
                  <span>Notes / Brand <em>optional</em></span>
                  <textarea
                    rows={2}
                    maxLength={300}
                    placeholder="e.g. Get the unsalted one or specific brand"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setModalOpen(false)}
                  disabled={formBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={formBusy || !formName.trim()}
                >
                  {formBusy ? 'Saving…' : editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Single Supply Item Card Component
function SupplyCard({
  item,
  profileMap,
  shoppingMode,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: SupplyItem;
  profileMap: Map<string, string>;
  shoppingMode: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat = getCategoryMeta(item.category);
  const adderName = item.added_by ? profileMap.get(item.added_by) : null;
  const purchaserName = item.purchased_by ? profileMap.get(item.purchased_by) : null;

  // Convert to Expense Link: opens the existing expense form with title prefilled
  const convertToExpenseUrl = `/expenses/new?title=${encodeURIComponent(
    item.quantity ? `${item.name} (${item.quantity})` : item.name
  )}&category=${encodeURIComponent(item.category)}`;

  return (
    <div className={`supply-card ${item.is_purchased ? 'is-purchased' : ''} ${shoppingMode ? 'shopping-card' : ''}`}>
      <div className="supply-card-main">
        {/* Checkbox */}
        <button
          type="button"
          className="supply-checkbox-btn"
          onClick={onToggle}
          title={item.is_purchased ? 'Mark as needed (uncheck)' : 'Mark as purchased'}
          aria-label={item.is_purchased ? `Mark ${item.name} as needed` : `Mark ${item.name} as purchased`}
        >
          {item.is_purchased ? (
            <CheckCircle2 size={22} className="check-icon-active" />
          ) : (
            <Circle size={22} className="check-icon-idle" />
          )}
        </button>

        {/* Details */}
        <div className="supply-info">
          <div className="supply-title-row">
            <span className={`supply-name ${item.is_purchased ? 'strikethrough' : ''}`}>
              {item.name}
            </span>
            {item.quantity && (
              <span className="supply-qty-pill">{item.quantity}</span>
            )}
          </div>

          {item.notes && <p className="supply-notes">{item.notes}</p>}

          <div className="supply-meta-row">
            {/* Category badge */}
            <span
              className="supply-cat-tag"
              style={{
                color: cat.color,
                backgroundColor: cat.bg,
                borderColor: cat.border,
              }}
            >
              <span>{cat.emoji}</span>
              <span>{item.category}</span>
            </span>

            {/* Author / Timestamp info */}
            <span className="supply-author">
              {item.is_purchased ? (
                <>Bought{purchaserName ? ` by ${purchaserName}` : ''}</>
              ) : (
                <>{adderName ? `Added by ${adderName}` : 'Needed'}</>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="supply-card-actions">
        {/* Convert to Expense Button */}
        <Link
          href={convertToExpenseUrl}
          className="supply-action-btn convert-btn"
          title="Convert this item into a shared expense"
        >
          <Receipt size={14} />
          <span>Convert to Expense</span>
        </Link>

        {/* Edit & Delete Buttons */}
        <button
          type="button"
          className="supply-action-icon-btn"
          onClick={onEdit}
          title="Edit item"
        >
          <Edit2 size={15} />
        </button>

        <button
          type="button"
          className="supply-action-icon-btn delete-btn"
          onClick={onDelete}
          title="Delete item"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
