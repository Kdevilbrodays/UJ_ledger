function initSupabase() {
  // If using placeholder config, use demo mode with localStorage
  if (CONFIG.SUPABASE_URL.includes('your-project-id') || CONFIG.SUPABASE_PUBLISHABLE_KEY.includes('your-publishable')) {
    return createDemoDb();
  }

  if (typeof supabase === 'undefined') {
    throw new Error('Supabase CDN script must be loaded before supabase.js');
  }
  return supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_PUBLISHABLE_KEY);
}

// Demo database using localStorage
function createDemoDb() {
  const demoDb = {
    from: function(table) {
      const getTableData = () => getDemoData(table) || [];
      const saveTableData = (data) => saveDemoData(table, data);

      const createSelectChain = (rows) => {
        const chain = {
          eq: function(col, val) {
            const filtered = rows.filter((d) => d[col] === val);
            return createSelectChain(filtered);
          },
          neq: function(col, val) {
            const filtered = rows.filter((d) => d[col] !== val);
            return createSelectChain(filtered);
          },
          ilike: function(col, val) {
            const query = String(val || '').toLowerCase();
            const filtered = rows.filter((d) => String(d[col] || '').toLowerCase().includes(query));
            return createSelectChain(filtered);
          },
          order: function(col, opts) {
            return Promise.resolve().then(() => {
              const sorted = [...rows].sort((a, b) => {
                const aVal = a[col], bVal = b[col];
                if (opts?.ascending) return aVal > bVal ? 1 : -1;
                return aVal < bVal ? 1 : -1;
              });
              return { data: sorted, error: null };
            });
          },
          maybeSingle: function() {
            return Promise.resolve().then(() => ({
              data: rows[0] || null,
              error: null
            }));
          },
          single: function() {
            return Promise.resolve().then(() => ({
              data: rows[0] || null,
              error: null
            }));
          },
          then: function(resolve, reject) {
            return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
          },
          catch: function(reject) {
            return Promise.resolve({ data: rows, error: null }).catch(reject);
          },
          finally: function(callback) {
            return Promise.resolve({ data: rows, error: null }).finally(callback);
          }
        };

        return chain;
      };

      const createDeleteChain = (rowsToDelete) => {
        const chain = {
          eq: function(col, val) {
            return createDeleteChain(rowsToDelete.filter((d) => d[col] === val));
          },
          neq: function(col, val) {
            return createDeleteChain(rowsToDelete.filter((d) => d[col] !== val));
          },
          then: function(resolve, reject) {
            return Promise.resolve().then(() => {
              const data = getTableData();
              const deletedIds = new Set(rowsToDelete.map((row) => row.id));
              const remaining = data.filter((row) => !deletedIds.has(row.id));
              saveTableData(remaining);
              return { data: null, error: null };
            }).then(resolve, reject);
          },
          catch: function(reject) {
            return Promise.resolve({ data: null, error: null }).catch(reject);
          },
          finally: function(callback) {
            return Promise.resolve({ data: null, error: null }).finally(callback);
          }
        };
        return chain;
      };

      const methods = {
        select: function(cols) {
          return createSelectChain(getTableData());
        },
        eq: function(col, val) {
          return createSelectChain(getTableData().filter((d) => d[col] === val));
        },
        ilike: function(col, val) {
          const query = String(val || '').toLowerCase();
          return createSelectChain(getTableData().filter((d) => String(d[col] || '').toLowerCase().includes(query)));
        },
        insert: function(obj) {
          const newObj = {
            ...obj,
            id: 'demo-' + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString()
          };
          const data = getTableData();
          data.push(newObj);
          saveTableData(data);

          return {
            data: newObj,
            error: null,
            select: function(cols) {
              return {
                single: function() {
                  return Promise.resolve().then(() => ({
                    data: newObj,
                    error: null
                  }));
                }
              };
            }
          };
        },
        update: function(obj) {
          return {
            eq: function(col, val) {
              return Promise.resolve().then(() => {
                const data = getTableData();
                const idx = data.findIndex((d) => d[col] === val);
                if (idx >= 0) data[idx] = { ...data[idx], ...obj };
                saveTableData(data);
                return { error: null };
              });
            }
          };
        },
        delete: function() {
          return createDeleteChain(getTableData());
        }
      };
      return methods;
    },
    channel: function(name) {
      return {
        on: function() { return this; },
        subscribe: function() { return this; }
      };
    }
  };
  return demoDb;
}

function getDemoData(table) {
  const stored = localStorage.getItem(`demo_${table}`);
  return stored ? JSON.parse(stored) : [];
}

function saveDemoData(table, data) {
  localStorage.setItem(`demo_${table}`, JSON.stringify(data));
}

async function getAllParties(db) {
  const { data, error } = await db
    .from('parties')
    .select('*')
    .order('last_activity', { ascending: false });

  if (error) throw error;
  return data;
}

async function getParty(db, id) {
  const { data, error } = await db
    .from('parties')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

async function getTransactions(db, partyId) {
  const { data, error } = await db
    .from('transactions')
    .select('*')
    .eq('party_id', partyId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

async function addParty(db, name, phone) {
  const { data, error } = await db
    .from('parties')
    .insert({ name, phone: phone || null })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function addTransaction(db, partyId, type, amount, date, note, source) {
  const { error } = await db
    .from('transactions')
    .insert({
      party_id: partyId,
      type,
      amount,
      date,
      note: note || null,
      source: source || 'manual'
    });

  if (error) throw error;
  return recalculateBalance(db, partyId);
}

async function recalculateBalance(db, partyId) {
  const { data: txns, error: fetchError } = await db
    .from('transactions')
    .select('type, amount')
    .eq('party_id', partyId);

  if (fetchError) throw fetchError;

  const balance = (txns || []).reduce(
    (acc, t) => (t.type === 'udhar' ? acc + t.amount : acc - t.amount),
    0
  );

  const { error: updateError } = await db
    .from('parties')
    .update({
      current_balance: balance,
      last_activity: new Date().toISOString()
    })
    .eq('id', partyId);

  if (updateError) throw updateError;
  return balance;
}

async function searchPartyByName(db, name) {
  const { data, error } = await db
    .from('parties')
    .select('*')
    .ilike('name', name)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function subscribeToParties(db, callback) {
  return db
    .channel('parties-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'parties' },
      callback
    )
    .subscribe();
}

async function deleteParty(db, partyId) {
  const { error: txError } = await db.from('transactions').delete().eq('party_id', partyId);
  if (txError) throw txError;
  const { error: partyError } = await db.from('parties').delete().eq('id', partyId);
  if (partyError) throw partyError;
}

async function clearAllData(db) {
  const { error: txError } = await db.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (txError) throw txError;
  const { error: partyError } = await db.from('parties').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (partyError) throw partyError;
}

async function getDataCounts(db) {
  const { data: parties, error: pErr } = await db.from('parties').select('id');
  if (pErr) throw pErr;
  const { data: txns, error: tErr } = await db.from('transactions').select('id');
  if (tErr) throw tErr;
  return { parties: (parties || []).length, transactions: (txns || []).length };
}

async function exportAllData(db) {
  const parties = await getAllParties(db);
  const transactions = [];
  for (const p of parties) {
    const txns = await getTransactions(db, p.id);
    transactions.push(...txns);
  }
  return { exported_at: new Date().toISOString(), parties, transactions };
}

// Counts what's in a parsed backup file without writing anything, so the
// Settings screen can show "this will add N parties and M transactions"
// before the user confirms the import.
function previewBackupData(backupData) {
  if (!backupData || typeof backupData !== 'object' || !Array.isArray(backupData.parties) || !Array.isArray(backupData.transactions)) {
    throw new Error("This doesn't look like a Udhar Ledger backup file.");
  }
  return { parties: backupData.parties.length, transactions: backupData.transactions.length };
}

// Restores parties + transactions from a backup produced by exportAllData().
// This ADDS the backup's parties/transactions as new records alongside
// whatever's already in the database (it doesn't touch or overwrite
// existing data) — party IDs from the backup are remapped to freshly
// created IDs, since the originals belong to whichever database they were
// exported from.
async function importBackupData(db, backupData) {
  previewBackupData(backupData); // throws if the shape is wrong

  const idMap = new Map(); // backup party id -> newly created party id
  let importedParties = 0;
  let importedTransactions = 0;

  for (const party of backupData.parties) {
    if (!party || typeof party.name !== 'string' || !party.name.trim()) continue;
    const newId = await addParty(db, party.name.trim(), party.phone || null);
    idMap.set(party.id, newId);
    importedParties++;
  }

  for (const txn of backupData.transactions) {
    if (!txn) continue;
    const newPartyId = idMap.get(txn.party_id);
    if (!newPartyId) continue; // orphaned transaction — its party wasn't imported
    if (txn.type !== 'jama' && txn.type !== 'udhar') continue;
    if (typeof txn.amount !== 'number' || !(txn.amount > 0)) continue;
    if (typeof txn.date !== 'string' || !txn.date) continue;

    // 'source' has a DB check constraint of ('manual','scan') — anything
    // else from the backup (or missing) falls back to 'manual'.
    const source = txn.source === 'scan' ? 'scan' : 'manual';

    const { error } = await db.from('transactions').insert({
      party_id: newPartyId,
      type: txn.type,
      amount: txn.amount,
      date: txn.date,
      note: txn.note || null,
      source
    });
    if (error) throw error;
    importedTransactions++;
  }

  for (const newId of idMap.values()) {
    await recalculateBalance(db, newId);
  }

  return { parties: importedParties, transactions: importedTransactions };
}
