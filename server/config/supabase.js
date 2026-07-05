const { createClient } = require('@supabase/supabase-js');
const { syncDatabaseToSheets } = require('../utils/googleSheets');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isConfigured = 
  supabaseUrl && 
  supabaseServiceKey && 
  !supabaseUrl.startsWith('your_') && 
  !supabaseServiceKey.startsWith('your_') &&
  supabaseUrl.startsWith('https://');

let supabase;

if (isConfigured) {
  console.log('[SUPABASE] Initializing real Supabase client...');
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
} else {
  const fs = require('fs');
  const path = require('path');
  const dbPath = path.join(__dirname, 'db.json');

  console.warn('==================================================================');
  console.warn('[WARNING]: Supabase URL or Service Role Key is not configured!');
  console.warn('The server is running in LOCAL PERSISTENT JSON DATABASE mode.');
  console.warn('Data is saved in server/config/db.json.');
  console.warn('Please update the .env file with real credentials for production.');
  console.warn('==================================================================');

  // Default initial seed data (Multi-Tenant Architecture)
  const defaultCollections = {
    users: [
      { id: 'u-super', email: 'super@gymos.com', role: 'super_admin', gym_id: null, full_name: 'Super Admin' },
      { id: 'u-admin1', email: 'owner@fitprogym.com', role: 'gym_admin', gym_id: 'g-1', full_name: 'Alex Johnson' },
      { id: 'u-staff1', email: 'staff@fitprogym.com', role: 'staff', gym_id: 'g-1', full_name: 'Front Desk' }
    ],
    gyms: [
      { id: 'g-1', name: 'FitPro Gym', owner_id: 'u-admin1', subscription_status: 'active', billing_date: '2026-08-01', created_at: new Date().toISOString() }
    ],
    branches: [
      { id: 'b-1', gym_id: 'g-1', name: 'Main Branch', location: 'Downtown', created_at: new Date().toISOString() }
    ],
    trainers: [],
    attendance: [],
    pending_messages: [],
    gym_settings: [
      {
        id: 'settings-1',
        gym_id: 'g-1',
        gym_name: 'FitPro Gym',
        owner_name: 'Alex Johnson',
        phone: '8122715213',
        whatsapp_number: '8122715213',
        whatsapp_mode: 'redirect',
        email: 'owner@fitprogym.com',
        address: '123 Health Street, Fitness City',
        whatsapp_schedule_time: '08:00',
        created_at: new Date().toISOString()
      }
    ],
    plans: [
      { id: 'p1', gym_id: 'g-1', name: 'Monthly', duration_days: 30, price: 800.00, description: '1 month membership', is_active: true },
      { id: 'p2', gym_id: 'g-1', name: 'Quarterly', duration_days: 90, price: 2100.00, description: '3 months membership', is_active: true },
      { id: 'p3', gym_id: 'g-1', name: 'Half-yearly', duration_days: 180, price: 3800.00, description: '6 months membership', is_active: true },
      { id: 'p4', gym_id: 'g-1', name: 'Annual', duration_days: 365, price: 6500.00, description: '1 year membership', is_active: true }
    ],
    members: [],
    memberships: [],
    message_templates: [
      {
        id: 't1',
        gym_id: 'g-1',
        trigger_type: 'expiry_3day',
        template_body: 'Hi {Name}, your {GymName} membership expires in 3 days on {ExpiryDate}. Renew now! Contact: {OwnerPhone}',
        is_active: true,
        updated_at: new Date().toISOString()
      },
      {
        id: 't2',
        gym_id: 'g-1',
        trigger_type: 'expiry_1day',
        template_body: 'Hi {Name}, your {GymName} membership expires TOMORROW ({ExpiryDate}). Renew today! Call: {OwnerPhone}',
        is_active: true,
        updated_at: new Date().toISOString()
      },
      {
        id: 't3',
        gym_id: 'g-1',
        trigger_type: 'expired',
        template_body: 'Hi {Name}, your {GymName} membership expired on {ExpiryDate}. We miss you! Renew anytime: {OwnerPhone}',
        is_active: true,
        updated_at: new Date().toISOString()
      },
      {
        id: 't4',
        gym_id: 'g-1',
        trigger_type: 'payment_received',
        template_body: 'Hi {Name}, we have received your payment for {GymName}. Your membership is now active until {ExpiryDate}. Thank you! Contact: {OwnerPhone}',
        is_active: true,
        updated_at: new Date().toISOString()
      }
    ],
    message_logs: [],
    leads: [],
    announcements: []
  };

  // Helper read database function
  function readDb() {
    try {
      if (fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath, 'utf8');
        const parsed = JSON.parse(data);
        
        // Migration block for older versions
        let modified = false;
        if (!parsed.users) { parsed.users = defaultCollections.users; modified = true; }
        if (!parsed.gyms) { parsed.gyms = defaultCollections.gyms; modified = true; }
        if (!parsed.branches) { parsed.branches = defaultCollections.branches; modified = true; }
        if (!parsed.trainers) { parsed.trainers = []; modified = true; }
        if (!parsed.attendance) { parsed.attendance = []; modified = true; }
        if (!parsed.pending_messages) { parsed.pending_messages = []; modified = true; }
        if (!parsed.message_logs) { parsed.message_logs = []; modified = true; }
        if (!parsed.message_templates) { parsed.message_templates = defaultCollections.message_templates; modified = true; }
        
        if (modified) writeDb(parsed);
        return parsed;
      }
    } catch (error) {
      console.error('[DATABASE] Error reading db.json:', error);
    }
    // Initialize if file is missing or corrupted
    writeDb(defaultCollections);
    return defaultCollections;
  }

  // Helper write database function
  function writeDb(data) {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
      
      // Asynchronously backup to Google Sheets
      syncDatabaseToSheets(data).catch(err => {
        console.error('[DATABASE] Async Google Sheets sync failed:', err.message);
      });
    } catch (error) {
      console.error('[DATABASE] Error writing to db.json:', error);
    }
  }

  // Ensure DB file exists
  readDb();

  // Helper mock query runner
  class MockQuery {
    constructor(collectionName, filter = null, sorting = null, paginationRange = null) {
      this.collectionName = collectionName;
      this.filter = filter || (() => true);
      this.sorting = sorting;
      this.paginationRange = paginationRange;
    }

    select(fields) {
      return this;
    }

    order(column, { ascending = true } = {}) {
      this.sorting = (a, b) => {
        let valA = a[column];
        let valB = b[column];
        if (typeof valA === 'string') {
          return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return ascending ? valA - valB : valB - valA;
      };
      return this;
    }

    range(from, to) {
      this.paginationRange = { from, to };
      return this;
    }

    eq(column, value) {
      const parentFilter = this.filter;
      this.filter = (item) => parentFilter(item) && item[column] === value;
      return this;
    }

    neq(column, value) {
      const parentFilter = this.filter;
      this.filter = (item) => parentFilter(item) && item[column] !== value;
      return this;
    }

    or(orExpression) {
      // Mock logic for 'end_date.lt.todayStr,payment_status.eq.pending'
      const parentFilter = this.filter;
      this.filter = (item) => {
        if (!parentFilter(item)) return false;
        
        // Simple manual parse of or rules
        const todayStr = new Date().toISOString().split('T')[0];
        const hasExpired = item.end_date && item.end_date < todayStr;
        const hasPending = item.payment_status === 'pending';
        return hasExpired || hasPending;
      };
      return this;
    }

    maybeSingle() {
      return this.single();
    }

    async single() {
      const collections = readDb();
      const collection = collections[this.collectionName] || [];
      const list = collection.filter(this.filter);
      if (list.length === 0) {
        return { data: null, error: { message: 'Not found' } };
      }
      return { data: this._enrich(list[0], collections), error: null };
    }

    async then(resolve) {
      const collections = readDb();
      const collection = collections[this.collectionName] || [];
      let list = [...collection].filter(this.filter);
      
      if (this.sorting) {
        list.sort(this.sorting);
      }
      
      const count = list.length;
      
      if (this.paginationRange) {
        list = list.slice(this.paginationRange.from, this.paginationRange.to + 1);
      }

      const enriched = list.map(item => this._enrich(item, collections));
      resolve({ data: enriched, count, error: null });
    }

    _enrich(item, collections) {
      // Handle mock join expansions
      const copy = { ...item };
      
      if (this.collectionName === 'members') {
        const memberMemberships = collections.memberships.filter(m => m.member_id === item.id);
        copy.memberships = memberMemberships.map(m => {
          const plan = collections.plans.find(p => p.id === m.plan_id);
          return { ...m, plans: plan };
        });
      }
      
      if (this.collectionName === 'memberships') {
        copy.members = collections.members.find(m => m.id === item.member_id);
        copy.plans = collections.plans.find(p => p.id === item.plan_id);
      }

      if (this.collectionName === 'message_logs') {
        copy.members = collections.members.find(m => m.id === item.member_id);
      }

      if (this.collectionName === 'trainers') {
        copy.branches = collections.branches.find(b => b.id === item.branch_id);
      }

      if (this.collectionName === 'attendance') {
        if (item.entity_type === 'member') {
          copy.members = collections.members.find(m => m.id === item.entity_id);
        } else if (item.entity_type === 'trainer') {
          copy.trainers = collections.trainers.find(t => t.id === item.entity_id);
        }
      }

      return copy;
    }
  }

  // Mock Supabase Client Class
  supabase = {
    auth: {
      signInWithPassword: async ({ email, password }) => {
        const collections = readDb();
        const user = collections.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (!user) {
          return { data: { user: null }, error: { message: 'Invalid credentials' } };
        }
        
        // Use JSON structure in token to preserve mock data easily
        const sessionToken = Buffer.from(JSON.stringify({
          id: user.id,
          email: user.email,
          role: user.role,
          gym_id: user.gym_id
        })).toString('base64');

        return {
          data: {
            session: { access_token: 'mock-session-' + sessionToken },
            user: { id: user.id, email: user.email, user_metadata: { role: user.role, gym_id: user.gym_id, full_name: user.full_name } }
          },
          error: null
        };
      },
      getUser: async (token) => {
        if (token && token.startsWith('mock-session-')) {
          try {
            const payload = JSON.parse(Buffer.from(token.replace('mock-session-', ''), 'base64').toString());
            return {
              data: { user: { id: payload.id, email: payload.email, user_metadata: { role: payload.role, gym_id: payload.gym_id } } },
              error: null
            };
          } catch(e) {}
        }
        return { data: { user: null }, error: { message: 'Invalid token' } };
      }
    },
    from: (table) => {
      return {
        select: (fields, { count } = {}) => {
          return new MockQuery(table);
        },
        insert: (data) => {
          const collections = readDb();
          const arr = Array.isArray(data) ? data : [data];
          const inserted = arr.map(item => {
            const row = {
              id: Math.random().toString(36).substring(2, 11),
              created_at: new Date().toISOString(),
              ...item
            };
            collections[table].push(row);
            return row;
          });
          writeDb(collections);
          
          return {
            select: () => ({
              single: async () => ({ data: inserted[0], error: null })
            })
          };
        },
        update: (updates) => {
          const filters = [];
          const builder = {
            eq: (col, val) => {
              filters.push((item) => item[col] === val);
              return builder;
            },
            select: () => builder,
            single: async () => {
              const collections = readDb();
              let items = collections[table] || [];
              for (const f of filters) items = items.filter(f);
              
              items.forEach(item => {
                Object.assign(item, updates);
                item.updated_at = new Date().toISOString();
              });
              writeDb(collections);
              return { data: items[0] || null, error: null };
            },
            then: (resolve) => {
              const collections = readDb();
              let items = collections[table] || [];
              for (const f of filters) items = items.filter(f);
              
              items.forEach(item => {
                Object.assign(item, updates);
                item.updated_at = new Date().toISOString();
              });
              writeDb(collections);
              resolve({ data: items, error: null });
            }
          };
          return builder;
        },
        delete: () => {
          const filters = [];
          const builder = {
            eq: (col, val) => {
              filters.push((item) => item[col] === val);
              return builder;
            },
            then: (resolve) => {
              const collections = readDb();
              const originalLength = (collections[table] || []).length;
              collections[table] = (collections[table] || []).filter(item => {
                // If it matches ALL filters, we drop it
                const matches = filters.every(f => f(item));
                return !matches;
              });
              writeDb(collections);
              resolve({ error: null });
            }
          };
          return builder;
        }
      };
    }
  };
}

module.exports = { supabase };
