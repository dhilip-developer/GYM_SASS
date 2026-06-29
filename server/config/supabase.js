const { createClient } = require('@supabase/supabase-js');
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
  console.warn('==================================================================');
  console.warn('[WARNING]: Supabase URL or Service Role Key is not configured!');
  console.warn('The server is running in SIMULATED IN-MEMORY DATABASE mode.');
  console.warn('All changes will be lost when the server restarts.');
  console.warn('Please update the .env file with real credentials for production.');
  console.warn('==================================================================');

  // In-Memory Database collections
  const collections = {
    gym_settings: [
      {
        id: 'settings-1',
        gym_name: 'FitPro Gym',
        owner_name: 'Alex Johnson',
        phone: '9876543210',
        whatsapp_number: '9876543210',
        email: 'owner@fitprogym.com',
        address: '123 Health Street, Fitness City',
        created_at: new Date().toISOString()
      }
    ],
    plans: [
      { id: 'p1', name: 'Monthly', duration_days: 30, price: 800.00, description: '1 month membership', is_active: true },
      { id: 'p2', name: 'Quarterly', duration_days: 90, price: 2100.00, description: '3 months membership', is_active: true },
      { id: 'p3', name: 'Half-yearly', duration_days: 180, price: 3800.00, description: '6 months membership', is_active: true },
      { id: 'p4', name: 'Annual', duration_days: 365, price: 6500.00, description: '1 year membership', is_active: true }
    ],
    members: [],
    memberships: [],
    message_templates: [
      {
        id: 't1',
        trigger_type: 'expiry_3day',
        template_body: 'Hi {Name}, your {GymName} membership expires in 3 days on {ExpiryDate}. Renew now! Contact: {OwnerPhone}',
        is_active: true,
        updated_at: new Date().toISOString()
      },
      {
        id: 't2',
        trigger_type: 'expiry_1day',
        template_body: 'Hi {Name}, your {GymName} membership expires TOMORROW ({ExpiryDate}). Renew today! Call: {OwnerPhone}',
        is_active: true,
        updated_at: new Date().toISOString()
      },
      {
        id: 't3',
        trigger_type: 'expired',
        template_body: 'Hi {Name}, your {GymName} membership expired on {ExpiryDate}. We miss you! Renew anytime: {OwnerPhone}',
        is_active: true,
        updated_at: new Date().toISOString()
      }
    ],
    message_logs: []
  };

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
      const list = collections[this.collectionName].filter(this.filter);
      if (list.length === 0) {
        return { data: null, error: { message: 'Not found' } };
      }
      return { data: this._enrich(list[0]), error: null };
    }

    async then(resolve) {
      let list = [...collections[this.collectionName]].filter(this.filter);
      
      if (this.sorting) {
        list.sort(this.sorting);
      }
      
      const count = list.length;
      
      if (this.paginationRange) {
        list = list.slice(this.paginationRange.from, this.paginationRange.to + 1);
      }

      const enriched = list.map(item => this._enrich(item));
      resolve({ data: enriched, count, error: null });
    }

    _enrich(item) {
      // Handle mock join expansions
      const copy = { ...item };
      
      if (this.collectionName === 'members') {
        // join memberships + plans
        const memberMemberships = collections.memberships.filter(m => m.member_id === item.id);
        copy.memberships = memberMemberships.map(m => {
          const plan = collections.plans.find(p => p.id === m.plan_id);
          return { ...m, plans: plan };
        });
      }
      
      if (this.collectionName === 'memberships') {
        // join members and plans
        copy.members = collections.members.find(m => m.id === item.member_id);
        copy.plans = collections.plans.find(p => p.id === item.plan_id);
      }

      if (this.collectionName === 'message_logs') {
        copy.members = collections.members.find(m => m.id === item.member_id);
      }

      return copy;
    }
  }

  // Mock Supabase Client Class
  supabase = {
    auth: {
      signInWithPassword: async ({ email, password }) => {
        // Dummy login: any password works
        return {
          data: {
            session: { access_token: 'mock-session-token-' + Date.now() },
            user: { id: 'mock-owner-id', email }
          },
          error: null
        };
      },
      getUser: async (token) => {
        if (token && token.startsWith('mock-session-token-')) {
          return {
            data: { user: { id: 'mock-owner-id', email: 'owner@fitprogym.com' } },
            error: null
          };
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
          
          return {
            select: () => ({
              single: async () => ({ data: inserted[0], error: null })
            })
          };
        },
        update: (updates) => {
          return {
            eq: (col, val) => {
              const items = collections[table].filter(item => item[col] === val);
              items.forEach(item => {
                Object.assign(item, updates);
              });
              
              return {
                select: () => ({
                  single: async () => ({ data: items[0] || null, error: null })
                })
              };
            }
          };
        },
        delete: () => {
          return {
            eq: (col, val) => {
              const initialLen = collections[table].length;
              collections[table] = collections[table].filter(item => item[col] !== val);
              return {
                error: null
              };
            }
          };
        }
      };
    }
  };
}

module.exports = { supabase };
