import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type AppRole = 'citizen' | 'representative' | 'institution_admin'

export interface AppIdentity {
  userId: string
  email: string
  displayName: string
  role: AppRole
  institutionId?: string
  institutionName?: string
}

export interface DemoCredential {
  role: AppRole
  label: string
  email: string
  password: string
  destination: string
}

export const demoCredentials: DemoCredential[] = [
  {
    role: 'citizen',
    label: 'Citizen / receiver',
    email: 'citizen.demo@example.com',
    password: 'Citizen@2026',
    destination: '/verify'
  },
  {
    role: 'representative',
    label: 'Organisation employee',
    email: 'aarav.employee@example.com',
    password: 'Employee@2026',
    destination: '/representative'
  },
  {
    role: 'institution_admin',
    label: 'Institution administrator',
    email: 'meera.admin@example.com',
    password: 'Admin@2026',
    destination: '/institution'
  }
]

// Supabase publishable keys are designed for browser use. Localhost uses the fixed
// key created by the local Supabase CLI; public builds use the hosted project's
// independently rotatable publishable key when deployment variables are omitted.
const localPublishableKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const hostedSupabaseUrl = 'https://yjwwrainneuqpzcppurb.supabase.co'
const hostedPublishableKey = 'sb_publishable_YCU_Qg4EoQs-GZezFYxv1A_0sPOvnzz'
const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
const fallbackUrl = isLocalhost ? 'http://127.0.0.1:54321' : hostedSupabaseUrl
const fallbackKey = isLocalhost ? localPublishableKey : hostedPublishableKey
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackKey

export const supabase: SupabaseClient = createClient(supabaseUrl, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'adhikaar-auth'
  }
})

let cachedIdentity: AppIdentity | null | undefined

async function resolveIdentity(userId: string, email: string): Promise<AppIdentity> {
  const { data: profile, error: profileError } = await supabase.from('profiles').select('display_name, platform_role').eq('id', userId).single()
  if (profileError) throw new Error('Your account exists, but its protected role profile could not be loaded.')
  const profileRole = profile.platform_role as AppRole
  if (profileRole === 'citizen') {
    return { userId, email, displayName: profile.display_name, role: 'citizen' }
  }

  const { data: memberships, error: membershipError } = await supabase.from('institution_memberships').select('institution_id, membership_role, institutions(display_name)').eq('user_id', userId).eq('status', 'active').limit(1)
  if (membershipError) throw new Error('Your organisation membership could not be verified.')

  const membership = memberships?.[0] as { institution_id: string; membership_role: AppRole; institutions?: { display_name?: string } | { display_name?: string }[] } | undefined
  const role = membership?.membership_role ?? profileRole
  if (!['citizen', 'representative', 'institution_admin'].includes(role)) throw new Error('This demonstration does not expose a dashboard for your account role.')
  const institution = Array.isArray(membership?.institutions) ? membership?.institutions[0] : membership?.institutions
  return {
    userId,
    email,
    displayName: profile.display_name,
    role,
    institutionId: membership?.institution_id,
    institutionName: institution?.display_name
  }
}

export async function getIdentity(force = false): Promise<AppIdentity | null> {
  if (!force && cachedIdentity !== undefined) return cachedIdentity
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.user) {
    cachedIdentity = null
    return null
  }
  const user = data.session.user
  cachedIdentity = await resolveIdentity(user.id, user.email ?? '')
  return cachedIdentity
}

export async function signIn(email: string, password: string): Promise<AppIdentity> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  if (error || !data.user) throw new Error('The email or password is incorrect. Use one of the fictional demo accounts below.')
  cachedIdentity = await resolveIdentity(data.user.id, data.user.email ?? email)
  return cachedIdentity
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' })
  cachedIdentity = null
}

export function destinationFor(role: AppRole): string {
  if (role === 'citizen') return '/verify'
  if (role === 'institution_admin') return '/institution'
  return '/representative'
}

export function mayAccess(identity: AppIdentity, path: string): boolean {
  if (path === '/verify') return identity.role === 'citizen'
  if (path === '/representative') return identity.role === 'representative'
  if (path === '/institution') return identity.role === 'institution_admin'
  return true
}

supabase.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT') cachedIdentity = null
  if (event === 'SIGNED_IN' || event === 'USER_UPDATED') cachedIdentity = undefined
})
