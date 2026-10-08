'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cat, Plus, Trash2 } from 'lucide-react';

interface Pet {
  id: string;
  name: string;
  species?: string;
}

interface PetManagerProps {
  householdId: string;
  initialPets: Pet[];
}

export function PetManager({ householdId, initialPets }: PetManagerProps) {
  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>(initialPets);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  async function handleAddPet(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!navigator.onLine) {
      setError('Reconnect before adding a cat.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/backend/cat/pets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ householdId, name: trimmed }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Could not add cat.');
      }

      setPets((prev) => [...prev, data.data]);
      setName('');
      setIsAdding(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add cat.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeletePet(petId: string, petName: string) {
    if (!window.confirm(`Are you sure you want to remove "${petName}"?`)) return;
    if (!navigator.onLine) {
      setError('Reconnect before removing a cat.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/backend/cat/pets', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ householdId, petId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Could not remove cat.');
      }

      setPets((prev) => prev.filter((p) => p.id !== petId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove cat.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pet-manager-card">
      <div className="pet-manager-header">
        <div className="pet-manager-title">
          <span className="pet-manager-icon"><Cat size={18} /></span>
          <div>
            <h3>Household Cats</h3>
            <p>Add your cats here to track meals for each cat individually.</p>
          </div>
        </div>

        {!isAdding && (
          <button
            type="button"
            className="button button-secondary button-small"
            onClick={() => setIsAdding(true)}
          >
            <Plus size={15} /> Add a cat
          </button>
        )}
      </div>

      {pets.length > 0 ? (
        <div className="pet-tags-list">
          {pets.map((pet) => (
            <div className="pet-tag" key={pet.id}>
              <span className="pet-tag-paw">🐾</span>
              <strong>{pet.name}</strong>
              <button
                type="button"
                className="pet-tag-delete"
                title={`Remove ${pet.name}`}
                aria-label={`Remove ${pet.name}`}
                onClick={() => handleDeletePet(pet.id, pet.name)}
                disabled={busy}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted-copy" style={{ margin: '8px 0' }}>
          No named cats added yet. Click &quot;Add a cat&quot; to give your pets their own feeding checks!
        </p>
      )}

      {isAdding && (
        <form className="pet-add-form" onSubmit={handleAddPet}>
          <input
            type="text"
            className="input-text"
            placeholder="Cat's name (e.g. Milo, Luna)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            autoFocus
            maxLength={60}
          />
          <div className="pet-form-actions">
            <button
              type="submit"
              className="button button-primary button-small"
              disabled={busy || !name.trim()}
            >
              {busy ? 'Saving…' : 'Save Cat'}
            </button>
            <button
              type="button"
              className="button button-quiet button-small"
              onClick={() => {
                setIsAdding(false);
                setName('');
                setError('');
              }}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="form-error-inline">{error}</p>}
    </section>
  );
}
