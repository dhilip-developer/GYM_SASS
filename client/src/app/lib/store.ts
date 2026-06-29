// Simple in-memory store with localStorage persistence
export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  membershipType: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'pending';
  amount: number;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  photo?: string;
  address?: string;
  emergencyContact?: string;
  joinedDate: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  salary: number;
  joinedDate: string;
  status: 'active' | 'inactive';
  photo?: string;
}

export interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  type: string;
}

export interface Campaign {
  id: string;
  name: string;
  message: string;
  recipients: string[];
  status: 'draft' | 'sent' | 'scheduled';
  scheduledDate?: string;
  createdDate: string;
}

class Store {
  private storageKey = 'gym_admin_data';

  private getInitialData() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
    return this.getDefaultData();
  }

  private getDefaultData() {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthFromNow = new Date(today);
    monthFromNow.setMonth(monthFromNow.getMonth() + 1);
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    return {
      members: [
        {
          id: '1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          membershipType: 'Premium',
          startDate: monthAgo.toISOString().split('T')[0],
          endDate: monthFromNow.toISOString().split('T')[0],
          status: 'active' as const,
          amount: 99,
          paymentStatus: 'paid' as const,
          address: '123 Main St, City',
          emergencyContact: '+1234567899',
          joinedDate: monthAgo.toISOString().split('T')[0],
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          phone: '+1234567891',
          membershipType: 'Basic',
          startDate: monthAgo.toISOString().split('T')[0],
          endDate: twoWeeksFromNow.toISOString().split('T')[0],
          status: 'active' as const,
          amount: 49,
          paymentStatus: 'pending' as const,
          address: '456 Oak Ave, Town',
          emergencyContact: '+1234567898',
          joinedDate: monthAgo.toISOString().split('T')[0],
        },
        {
          id: '3',
          name: 'Mike Johnson',
          email: 'mike.j@example.com',
          phone: '+1234567892',
          membershipType: 'Premium',
          startDate: '2024-01-15',
          endDate: '2024-02-15',
          status: 'expired' as const,
          amount: 99,
          paymentStatus: 'overdue' as const,
          address: '789 Pine Rd, Village',
          emergencyContact: '+1234567897',
          joinedDate: '2024-01-15',
        },
      ],
      staff: [
        {
          id: '1',
          name: 'Sarah Williams',
          email: 'sarah.w@gym.com',
          phone: '+1234567893',
          role: 'Trainer',
          salary: 3500,
          joinedDate: '2023-06-01',
          status: 'active' as const,
        },
        {
          id: '2',
          name: 'Tom Brown',
          email: 'tom.b@gym.com',
          phone: '+1234567894',
          role: 'Receptionist',
          salary: 2500,
          joinedDate: '2023-08-15',
          status: 'active' as const,
        },
      ],
      payments: [
        {
          id: '1',
          memberId: '2',
          memberName: 'Jane Smith',
          amount: 49,
          dueDate: today.toISOString().split('T')[0],
          status: 'pending' as const,
          type: 'Monthly Membership',
        },
        {
          id: '2',
          memberId: '3',
          memberName: 'Mike Johnson',
          amount: 99,
          dueDate: '2024-02-15',
          status: 'overdue' as const,
          type: 'Monthly Membership',
        },
      ],
      campaigns: [],
      settings: {
        gymName: 'FitPro Gym',
        email: 'admin@fitprogym.com',
        phone: '+1234567890',
        address: '123 Fitness Street, City',
        currency: 'USD',
        timezone: 'America/New_York',
      },
      isLoggedIn: false,
    };
  }

  private data = this.getInitialData();

  private save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  // Auth
  login(email: string, password: string): boolean {
    // Simple mock authentication
    if (email && password) {
      this.data.isLoggedIn = true;
      this.save();
      return true;
    }
    return false;
  }

  logout() {
    this.data.isLoggedIn = false;
    this.save();
  }

  isLoggedIn(): boolean {
    return this.data.isLoggedIn;
  }

  // Members
  getMembers(): Member[] {
    return this.data.members;
  }

  addMember(member: Omit<Member, 'id'>): Member {
    const newMember = { ...member, id: Date.now().toString() };
    this.data.members.push(newMember);
    this.save();
    return newMember;
  }

  updateMember(id: string, updates: Partial<Member>): Member | null {
    const index = this.data.members.findIndex((m: Member) => m.id === id);
    if (index !== -1) {
      this.data.members[index] = { ...this.data.members[index], ...updates };
      this.save();
      return this.data.members[index];
    }
    return null;
  }

  deleteMember(id: string): boolean {
    const index = this.data.members.findIndex((m: Member) => m.id === id);
    if (index !== -1) {
      this.data.members.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  // Staff
  getStaff(): Staff[] {
    return this.data.staff;
  }

  addStaff(staff: Omit<Staff, 'id'>): Staff {
    const newStaff = { ...staff, id: Date.now().toString() };
    this.data.staff.push(newStaff);
    this.save();
    return newStaff;
  }

  updateStaff(id: string, updates: Partial<Staff>): Staff | null {
    const index = this.data.staff.findIndex((s: Staff) => s.id === id);
    if (index !== -1) {
      this.data.staff[index] = { ...this.data.staff[index], ...updates };
      this.save();
      return this.data.staff[index];
    }
    return null;
  }

  deleteStaff(id: string): boolean {
    const index = this.data.staff.findIndex((s: Staff) => s.id === id);
    if (index !== -1) {
      this.data.staff.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  // Payments
  getPayments(): Payment[] {
    return this.data.payments;
  }

  updatePayment(id: string, status: Payment['status']): Payment | null {
    const index = this.data.payments.findIndex((p: Payment) => p.id === id);
    if (index !== -1) {
      this.data.payments[index].status = status;
      this.save();
      return this.data.payments[index];
    }
    return null;
  }

  // Campaigns
  getCampaigns(): Campaign[] {
    return this.data.campaigns;
  }

  addCampaign(campaign: Omit<Campaign, 'id'>): Campaign {
    const newCampaign = { ...campaign, id: Date.now().toString() };
    this.data.campaigns.push(newCampaign);
    this.save();
    return newCampaign;
  }

  // Settings
  getSettings() {
    return this.data.settings;
  }

  updateSettings(updates: Partial<typeof this.data.settings>) {
    this.data.settings = { ...this.data.settings, ...updates };
    this.save();
    return this.data.settings;
  }
}

export const store = new Store();
