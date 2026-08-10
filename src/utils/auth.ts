export type UserRole = 'factory_manager' | 'supervisor' | 'site_manager';

export interface UserProfile {
  name: string;
  role: UserRole;
  roleLabel: string;
  avatar: string;
}

const USER_KEY = 'canva_erp_user';

const mockProfiles: Record<UserRole, UserProfile> = {
  factory_manager: {
    name: 'Marcus Chen',
    role: 'factory_manager',
    roleLabel: 'Factory Manager',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0qNoj8973HzwwBaiuLFfEZpcw_5PFF3FH517j1n_iaEoQ88_b8FKJG0onAOQBZuR3pCLgqsyq-5TrOK_x-eHMXG2_t7otErd98u_FzDSjPBgM1KQt27w3eK4DZadTM9w8DT5kzExOSVTGVrCANvORfiiMzaB-gU3NMI_i-3A4ll7tz5cL0fJ04tLDetDmsIVzv4ln94TVtGYyodto_xJZRQgpZnqNljqIlbwE-VjdjGNcFTjNbIWo0w'
  },
  supervisor: {
    name: 'Robert Hudson',
    role: 'supervisor',
    roleLabel: 'Factory Supervisor',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARN1w0jeO-wgQ0R_yMru4N7d5b9mQ0ZNmhjf4tGUEAL2did7AI9Le3lxB_4srk6pqYZXXbzrbrKRU8sJSKpJ914HXf9JbFvhtnDPNLGWdXtc7BbfzPb14ncMCpA-c1nHTGrtpH-UlzMNsF007jEi8uBtnXnC9jj8RlTS6Ff1mJFYbEpz8Oa3TBHcw_KbwuVoqdfPY2yxzWfnwt65VjIYVKPJRt-RRMkP3B8R-6QCj-XMaCPnpwz4jsSQ'
  },
  site_manager: {
    name: 'Sarah Jenkins',
    role: 'site_manager',
    roleLabel: 'Site Manager',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDQbwmAHRyIL7aEE6D-vM4H-W0TxTZEFmSkV5z3WAeyLFxsoX4DnPGiGL0pwg-ypUirc03IyReZUbeHiwicECR5IG7LeL07BTO2gvfApOP0k3roQEumoFIQD3yb9RodyZXf3tZ9SSj_qa3Y45WL_9EIJ3fn9ntubo2HhLxvASEA_0nv7zTZgl7bddQ4JLe46izs46ysEKvObQi46gTXwCHTJv1J-Tkf98eI5odW-1MPsjhToySzSePoBw'
  }
};

export function getCurrentUser(): UserProfile {
  const stored = localStorage.getItem(USER_KEY) as UserRole;
  if (stored && mockProfiles[stored]) {
    return mockProfiles[stored];
  }
  return mockProfiles.factory_manager;
}

export function setCurrentUserRole(role: UserRole): void {
  localStorage.setItem(USER_KEY, role);
  window.dispatchEvent(new Event('storage'));
  window.location.reload(); // reload to re-run role rules
}
