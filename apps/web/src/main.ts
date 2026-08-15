import '@fontsource-variable/plus-jakarta-sans/wght.css'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource/noto-sans-devanagari/devanagari-400.css'
import '@fontsource/noto-sans-devanagari/devanagari-600.css'
import '@phosphor-icons/web/duotone'
import './styles/main.css'
import './styles/language.css'
import './styles/enhancements.css'
import './styles/editorial.css'
import './styles/premium.css'
import QRCode from 'qrcode'
import { createIcons, ArrowRight, BadgeCheck, Building2, Check, ChevronRight, CircleHelp, Clock3, Copy, Fingerprint, Gavel, Globe2, KeyRound, Landmark, Languages, LogIn, LogOut, Phone, RefreshCw, RotateCcw, ScanLine, ShieldCheck, ShieldX, UserRoundCheck, UsersRound, X, Zap } from 'lucide'
import { attacks } from './security/attackSuite'
import { DemoIssuanceError, authoriseDemoReplacement, issueDemoMandate, listCustomerComplaints, resolveCustomerComplaint, resolveDemoMandate, submitCustomerComplaint, bankPolicy, demoRepresentativeStatus, revokeDemoRepresentative } from './services/demoStore'
import { getOrCreateRepresentativeKey, randomCode, removeRepresentativeKey, rotateRepresentativeKey, sha256, stableStringify } from './services/cryptoBridge'
import { loadSwiftVerifier, swiftStatus, verifyWithSwift } from './services/wasmBridge'
import { t, type Language } from './i18n'
import type { Evidence, VerificationResult } from './types'
import { demoCredentials, destinationFor, getIdentity, mayAccess, signIn, signOut, type AppIdentity } from './services/auth'

const app = document.querySelector<HTMLDivElement>('#app')!
let language: Language = (localStorage.getItem('adhikaar:language') as Language | null) ?? 'en'
let citizenChallenge = randomCode(8)
let currentIdentity: AppIdentity | null = null

const icons = { ArrowRight, BadgeCheck, Building2, Check, ChevronRight, CircleHelp, Clock3, Copy, Fingerprint, Gavel, Globe2, KeyRound, Landmark, Languages, LogIn, LogOut, Phone, RefreshCw, RotateCcw, ScanLine, ShieldCheck, ShieldX, UserRoundCheck, UsersRound, X, Zap }
const escape = (value: string) => value.replace(/[&<>'"]/gu, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!)
const actionLabel = (value: string) => value.split('-').map(word => ['kyc', 'otp', 'pin', 'cvv', 'upi'].includes(word) ? word.toUpperCase() : word[0]?.toUpperCase() + word.slice(1)).join(' ')
const phosphor = (name: string, decorative = true) => `<i class="ph-duotone ph-${name}"${decorative ? ' aria-hidden="true"' : ''}></i>`

const attackIcons = ['fingerprint', 'timer', 'link-break', 'key', 'tree-structure', 'seal-warning', 'arrows-clockwise', 'files', 'database', 'wifi-slash', 'identification-card', 'warning']
let previousRoute = ''
let revealObserver: IntersectionObserver | undefined

const routeTitles: Record<string, string> = {
  '/': 'ADHIKAAR — Verify the request, not just the person',
  '/login': 'Sign in — ADHIKAAR',
  '/verify': 'Citizen safety check — ADHIKAAR',
  '/representative': 'Employee workspace — ADHIKAAR',
  '/institution': 'Institution administration — ADHIKAAR',
  '/attack-lab': 'Interactive safety lab — ADHIKAAR',
  '/transparency': 'Public trust record — ADHIKAAR',
  '/validators': 'Validator governance — ADHIKAAR',
  '/architecture': 'How ADHIKAAR works',
  '/privacy': 'Privacy by design — ADHIKAAR',
  '/limitations': 'Honest limitations — ADHIKAAR'
}

function enhancePresentation(routeChanged: boolean): void {
  revealObserver?.disconnect()
  const targets = [...document.querySelectorAll<HTMLElement>('.route-main > section, .route-main article, .route-main figure')]
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduceMotion && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-revealed')
        revealObserver?.unobserve(entry.target)
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' })
    targets.forEach((target, index) => {
      target.classList.add('reveal-item')
      target.style.setProperty('--reveal-delay', `${Math.min(index % 5, 4) * 55}ms`)
      revealObserver?.observe(target)
    })
  } else targets.forEach(target => target.classList.add('is-revealed'))

  requestAnimationFrame(() => app.classList.add('route-ready'))
  const main = document.querySelector<HTMLElement>('#main')
  if (main) main.tabIndex = -1
  if (routeChanged && previousRoute) {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
    main?.focus({ preventScroll: true })
  }
}

function refreshEngineStatus(): void {
  const status = swiftStatus()
  document.querySelectorAll<HTMLElement>('.engine-pill').forEach(pill => {
    pill.classList.toggle('ready', status.ready)
    pill.classList.toggle('failed', Boolean(status.error))
    pill.title = status.error ?? status.version
    pill.innerHTML = `<span></span> Swift verification ${status.ready ? 'ready' : status.error ? 'unavailable' : 'loading'}`
  })
}

function shell(content: string): string {
  const status = swiftStatus()
  const path = location.pathname
  const active = (href: string) => path === href ? ' class="active" aria-current="page"' : ''
  const dashboardDestination = currentIdentity ? destinationFor(currentIdentity.role) : '/login?role=citizen'
  const dashboardLink = currentIdentity ? `<a href="${dashboardDestination}"${active(dashboardDestination)} data-link>${currentIdentity.role === 'citizen' ? 'My safety check' : currentIdentity.role === 'representative' ? 'My workspace' : 'Admin console'}</a>` : ''
  const accountAction = currentIdentity
    ? `<div class="account-menu"><span class="account-avatar">${escape(currentIdentity.displayName.split(' ').map(part => part[0]).join('').slice(0, 2))}</span><span class="account-copy"><strong>${escape(currentIdentity.displayName)}</strong><small>${currentIdentity.role === 'citizen' ? 'Citizen' : currentIdentity.role === 'representative' ? 'Organisation employee' : 'Institution administrator'}</small></span><button class="icon-button sign-out" id="sign-out" aria-label="Sign out"><i data-lucide="log-out"></i></button></div>`
    : `<a class="button header-login" href="/login" data-link><i data-lucide="log-in"></i> Sign in</a>`
  return `<div class="ambient-stage" aria-hidden="true"><span></span><span></span><span></span></div><header class="site-header"><a class="brand" href="/" data-link aria-label="ADHIKAAR home"><span class="brand-mark"><img src="/brand/adhikaar-mark.svg" width="48" height="48" alt="" /></span><span>ADHIKAAR<small>Authority you can verify</small></span></a>
  <nav class="main-nav" aria-label="Main navigation">${dashboardLink}<a href="/attack-lab"${active('/attack-lab')} data-link>Safety lab</a><a href="/transparency"${active('/transparency')} data-link>Transparency</a><a href="/architecture"${active('/architecture')} data-link>How it works</a></nav>
  <div class="header-actions"><button class="icon-button" id="language" aria-label="Change language"><i data-lucide="languages"></i><span>${language === 'en' ? 'हिंदी' : 'English'}</span></button><span class="engine-pill ${status.ready ? 'ready' : ''}" title="${escape(status.error ?? '')}"><span></span> Swift verification ${status.ready ? 'ready' : 'loading'}</span>${accountAction}</div></header>
  <main id="main" class="route-main">${content}</main><nav class="mobile-nav" aria-label="Mobile navigation"><a href="/"${active('/')} data-link>${phosphor('house')}<span>Home</span></a><a href="${dashboardDestination}"${active(dashboardDestination)} data-link>${phosphor('squares-four')}<span>Dashboard</span></a><a href="/attack-lab"${active('/attack-lab')} data-link>${phosphor('shield-check')}<span>Safety</span></a></nav><footer><div class="footer-brand"><span class="brand-mark"><img src="/brand/adhikaar-mark.svg" width="48" height="48" alt="" /></span><div><strong>ADHIKAAR</strong><p>Identity is not authority. Permission is the proof.</p></div></div><div class="footer-links"><a href="/login?role=citizen" data-link>Citizen access</a><a href="/login?role=organisation" data-link>Organisation access</a><a href="/validators" data-link>Validator lab</a><a href="/privacy" data-link>Privacy</a><a href="/limitations" data-link>Limitations</a></div><div class="footer-trust">${phosphor('shield-check')}<span><strong>Privacy-first demonstration</strong>No wallet · No call recording · No personal data on-chain</span></div><p class="footer-note">Fictional hackathon demonstration using fictional institutions, people and contact details.</p></footer>`
}

function homePage(): string {
  return shell(`<section class="hero"><div class="hero-glow" aria-hidden="true"></div><div class="hero-copy"><span class="eyebrow">${phosphor('sparkle')} A safer way to handle unexpected calls</span><h1>Check the request.<br><em>Not just the person.</em></h1><p>A real employee can still ask for something they are not allowed to. ADHIKAAR helps you check both—before you act.</p><div class="hero-actions"><a class="button primary" href="/login?role=citizen" data-link>Citizen sign in <i data-lucide="arrow-right"></i></a><a class="button secondary" href="/login?role=organisation" data-link>Organisation sign in</a></div><div class="trust-row"><span>${phosphor('seal-check')} Supabase protected access</span><span>${phosphor('wallet')} No wallet</span><span>${phosphor('eye-slash')} No personal data on-chain</span></div></div><div class="hero-art"><img src="/assets/adhikaar-two-sided-trust.jpg" width="1400" height="779" fetchpriority="high" alt="A receiver and an employee connected through a clear permission check" /><div class="floating-note">${phosphor('shield-check')}<span><strong>Request checked</strong>Identity and permission are separate</span></div><div class="hero-proof-rail" aria-label="How a request is checked"><span>${phosphor('user-circle-check')}<small>Person</small></span><i></i><span>${phosphor('list-checks')}<small>Request</small></span><i></i><span>${phosphor('seal-check')}<small>Permission</small></span></div></div></section>
  <section class="section intro"><span class="section-kicker">Made for everyday conversations</span><h2>One calm check. Two beautifully simple sides.</h2><div class="two-sides"><article><div class="role-card-image"><img src="/assets/receiver-safety.jpg" width="1448" height="1086" loading="lazy" alt="A citizen checks an unexpected request calmly"/><span>Receiver experience</span></div><div class="role-icon receiver">${phosphor('user-circle-check')}</div><p class="step-label">Citizen side</p><h3>You stay in control</h3><ol><li>Open your private safety space.</li><li>Create a one-time 8-character check code.</li><li>Enter the employee's 6-character proof.</li></ol><a href="/login?role=citizen" data-link>Enter citizen dashboard <i data-lucide="chevron-right"></i></a></article><div class="connection"><span></span>${phosphor('arrows-left-right')}<span></span></div><article><div class="role-card-image"><img src="/assets/employee-authority.jpg" width="1448" height="1086" loading="lazy" alt="An organisation employee creates an approved interaction proof"/><span>Employee experience</span></div><div class="role-icon employee">${phosphor('buildings')}</div><p class="step-label">Organisation side</p><h3>Prove the exact purpose</h3><ol><li>Open a protected organisation workspace.</li><li>Choose only policy-approved actions.</li><li>Share a 90-second proof with the receiver.</li></ol><a href="/login?role=organisation" data-link>Enter organisation workspace <i data-lucide="chevron-right"></i></a></article></div></section>
  <section class="section visual-story"><div class="visual-story-copy"><span class="section-kicker">Trust, made visible</span><h2>A complete journey—not three unrelated tools.</h2><p>The employee declares the exact request, the receiver checks it privately, and independent validators witness the institution's trust state. Each layer answers one clear question.</p><div class="story-points"><span>${phosphor('hand-heart')}<strong>Human first</strong><small>Plain language before proof details</small></span><span>${phosphor('timer')}<strong>90 seconds</strong><small>Fresh, challenge-bound interaction</small></span><span>${phosphor('tree-structure')}<strong>2 of 3</strong><small>Shared institutional oversight</small></span></div></div><div class="image-mosaic"><figure class="mosaic-main"><img src="/assets/call-bound-authority.jpg" width="1672" height="941" loading="lazy" alt="A receiver and employee connected by a permission-bound call proof"/><figcaption>Bound to this conversation</figcaption></figure><figure><img src="/assets/privacy-boundaries.jpg" width="1536" height="1024" loading="lazy" alt="A private phone surrounded by clear data boundaries"/><figcaption>Private by default</figcaption></figure><figure><img src="/assets/consortium-transparency.jpg" width="1672" height="941" loading="lazy" alt="Independent validators sharing responsibility for trust"/><figcaption>Witnessed together</figcaption></figure></div></section>
  <section class="section statement"><span class="statement-mark">${phosphor('quotes')}</span><blockquote>“A genuine bank employee may schedule a KYC appointment—but must never request your OTP.”</blockquote><p>That difference is ADHIKAAR.</p><a class="button secondary" href="/attack-lab" data-link>See the live safety checks</a></section>`)
}

function loginPage(): string {
  const requested = new URLSearchParams(location.search).get('role') === 'organisation' ? 'organisation' : 'citizen'
  const citizen = demoCredentials.find(item => item.role === 'citizen')!
  const employee = demoCredentials.find(item => item.role === 'representative')!
  const administrator = demoCredentials.find(item => item.role === 'institution_admin')!
  return shell(`<section class="login-shell"><div class="login-story ${requested}"><div class="login-story-copy"><span class="eyebrow"><i data-lucide="shield-check"></i> Protected access, made understandable</span><h1>${requested === 'citizen' ? 'Stay calm.<br><em>Check first.</em>' : 'Authority begins<br><em>with policy.</em>'}</h1><p>${requested === 'citizen' ? 'Your private safety space makes unexpected calls easier to handle—without recording the conversation or exposing personal data.' : 'ADHIKAAR keeps employee identity, role, allowed purpose and institution policy connected through protected records.'}</p><div class="login-assurance"><span><i data-lucide="fingerprint"></i><strong>Role verified by Supabase</strong>Dashboard access comes from protected membership records.</span><span><i data-lucide="key-round"></i><strong>No role stored in editable profile data</strong>An employee cannot promote their own account.</span></div></div><img src="${requested === 'citizen' ? '/assets/citizen-login-calm.jpg' : '/assets/institution-governance.jpg'}" width="${requested === 'citizen' ? '1024' : '1824'}" height="${requested === 'citizen' ? '1536' : '941'}" alt="${requested === 'citizen' ? 'A citizen calmly checks an unexpected phone call' : 'An institution administrator reviews employee authority policy'}"/></div>
  <div class="login-panel"><a class="back-home" href="/" data-link>← Back to home</a><span class="panel-kicker">Choose your secure space</span><h2>Sign in to ADHIKAAR</h2><p class="muted">All accounts below are fictional and created only for this demonstration.</p>
  <nav class="role-switch" aria-label="Account type"><a class="${requested === 'citizen' ? 'active' : ''}" href="/login?role=citizen" data-link ${requested === 'citizen' ? 'aria-current="page"' : ''}>${phosphor('user-circle-check')}<span><strong>Citizen</strong><small>Check an incoming request</small></span></a><a class="${requested === 'organisation' ? 'active' : ''}" href="/login?role=organisation" data-link ${requested === 'organisation' ? 'aria-current="page"' : ''}>${phosphor('buildings')}<span><strong>Organisation</strong><small>Employee or administrator</small></span></a></nav>
  <form id="login-form" class="login-form"><input type="hidden" name="requested-role" value="${requested}"/><label for="login-email">Work or account email</label><div class="field-with-icon"><i data-lucide="users-round"></i><input id="login-email" name="email" type="email" autocomplete="username" placeholder="name@example.com" required /></div><label for="login-password">Password</label><div class="field-with-icon"><i data-lucide="key-round"></i><input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required /></div><button class="button primary wide" type="submit">Continue securely <i data-lucide="arrow-right"></i></button><div id="login-message" aria-live="polite"></div></form>
  <div class="demo-access"><div class="demo-heading"><span></span><strong>One-click judge access</strong><span></span></div>${requested === 'citizen' ? demoCredentialCard(citizen) : `${demoCredentialCard(employee)}${demoCredentialCard(administrator)}`}</div><p class="login-footnote"><i data-lucide="shield-check"></i> Authentication is handled by Supabase Auth. Authorisation is checked again from RLS-protected database records.</p></div></section>`)
}

function demoCredentialCard(credential: (typeof demoCredentials)[number]): string {
  const icon = credential.role === 'citizen' ? 'user-round-check' : credential.role === 'representative' ? 'building-2' : 'landmark'
  return `<article class="demo-credential"><div class="demo-role-icon"><i data-lucide="${icon}"></i></div><div><strong>${credential.label}</strong><code>${credential.email}</code><span>Password: <code>${credential.password}</code></span></div><button type="button" class="demo-login" data-email="${credential.email}" data-password="${credential.password}">Enter demo <i data-lucide="arrow-right"></i></button></article>`
}

function accessDeniedPage(path: string): string {
  return shell(`<section class="access-denied"><div class="result-symbol"><i data-lucide="shield-x"></i></div><span class="eyebrow">Protected role boundary</span><h1>This dashboard belongs to a different role.</h1><p>You are signed in as <strong>${escape(currentIdentity?.displayName ?? 'another user')}</strong>. Supabase membership rules prevent this account from opening <code>${escape(path)}</code>.</p><a class="button primary" href="${currentIdentity ? destinationFor(currentIdentity.role) : '/login'}" data-link>Return to my dashboard <i data-lucide="arrow-right"></i></a><button class="button secondary" id="switch-account" type="button">Switch account</button></section>`)
}

function verifyPage(): string {
  const c = t(language)
  return shell(`<section class="dashboard-welcome citizen-welcome"><div><span>Citizen safety space</span><strong>Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${escape(currentIdentity?.displayName.split(' ')[0] ?? 'there')}.</strong><small>Your check codes stay on this device and expire with each interaction.</small></div><div class="session-trust"><i data-lucide="shield-check"></i><span><strong>Protected session</strong>Signed in with Supabase Auth</span></div></section><section class="page-head citizen-head illustrated-head"><div class="head-copy"><span class="eyebrow">${c.receiverEyebrow}</span><h1>${c.receiverTitle}</h1><p>${c.receiverIntro}</p><div class="privacy-chip"><i data-lucide="shield-check"></i><span><strong>${c.privacyTitle}</strong>${c.privacyBody}</span></div></div><div class="route-art receiver-art"><img src="/assets/receiver-safety.jpg" width="1448" height="1086" alt="A receiver calmly checks the authority behind an unexpected call"/><span class="art-caption"><strong>Stay in control</strong>No wallet. No call recording. One private check.</span></div></section>
  <section class="verify-layout"><div class="journey"><div class="journey-step active"><span>1</span><div><strong>${c.challengeTitle}</strong><p>${c.challengeHelp}</p></div></div><div class="challenge-card"><div class="challenge-label">${c.privateCode}</div><output id="challenge" aria-live="polite">${citizenChallenge}</output><div><button class="text-button" id="copy-challenge"><i data-lucide="copy"></i> ${c.copy}</button><button class="text-button" id="regenerate"><i data-lucide="refresh-cw"></i> ${c.regenerate}</button></div></div><div class="journey-step active"><span>2</span><div><strong>${c.employeeProofTitle}</strong><p>${c.employeeProofHelp}</p></div></div><form id="verify-form" class="code-form"><label for="verification-code">${c.codeLabel}</label><div class="code-row"><input id="verification-code" name="code" maxlength="6" inputmode="text" autocomplete="one-time-code" placeholder="ABC234" pattern="[A-HJ-NP-Z2-9]{6}" required /><button class="scan-button" type="button" title="${c.scanTitle}" aria-label="${c.scanTitle}"><i data-lucide="scan-line"></i></button></div><button class="button primary wide" type="submit">${c.verify} <i data-lucide="arrow-right"></i></button></form></div>
  <aside id="verification-result" class="result-placeholder"><div class="placeholder-illustration"><i data-lucide="shield-check"></i></div><h2>${c.resultPlaceholderTitle}</h2><p>${c.resultPlaceholderBody}</p><div class="safety-note"><i data-lucide="phone"></i><p>${c.safe}</p></div></aside></section><dialog id="qr-dialog"><button class="dialog-close" aria-label="${c.close}">×</button><h2>${c.scanTitle}</h2><p>${c.scanHelp}</p><video id="qr-video" playsinline></video><p class="scan-status">${c.manualFallback}</p></dialog>`)
}

function representativePage(): string {
  return shell(`<section class="dashboard-welcome employee-welcome"><div><span>Organisation workspace</span><strong>${escape(currentIdentity?.institutionName ?? 'Bharat Trust Bank — DEMO')}</strong><small>Membership and role verified from protected institution records.</small></div><div class="session-trust"><i data-lucide="badge-check"></i><span><strong>Employee authenticated</strong>Representative access · Active</span></div></section><section class="page-head employee-head illustrated-head"><div class="route-art employee-art"><img src="/assets/employee-authority.jpg" width="1448" height="1086" alt="A representative creates a proof containing only approved conversation actions"/><span class="art-caption"><strong>Policy-guided</strong>Unsafe requests are blocked before sharing.</span></div><div class="head-copy"><span class="eyebrow">Employee dashboard · ${escape(currentIdentity?.institutionName ?? 'Bharat Trust Bank — DEMO')}</span><h1>Create a trusted interaction proof</h1><p>The receiver gives you a private challenge. Your device signs a short-lived proof of exactly what you are allowed to discuss.</p><div class="profile-card"><div class="avatar">AS</div><div><strong>${escape(currentIdentity?.displayName ?? 'Aarav Sharma — DEMO')}</strong><span>KYC Verification Officer</span></div><span class="status-dot">Active</span></div></div></section>
  <section class="dashboard-grid"><aside class="dashboard-nav"><div class="active">${phosphor('key')} New interaction</div><div>${phosphor('fingerprint')} Device key ready</div><div>${phosphor('clock')} Recent proofs stay local</div><div class="policy-summary"><span>Signed policy</span><strong>Bank KYC Review v1</strong><small>4 actions allowed · 8 blocked</small></div></aside>
  <div class="issuance-card"><div class="form-progress"><span class="done">1</span><i></i><span class="active">2</span><i></i><span>3</span></div><h2>What will this conversation cover?</h2><p class="muted">Only actions explicitly allowed by your organisation can be included.</p><form id="issue-form"><label for="employee-challenge">Receiver's 8-character check code</label><input id="employee-challenge" name="employee-challenge" maxlength="9" placeholder="ABCD2345" required /><fieldset><legend>Choose approved actions</legend>${bankPolicy.permittedActionCodes.map((action, index) => `<label class="action-option"><input type="checkbox" name="action" value="${action}" ${index === 0 ? 'checked' : ''}/><span><i data-lucide="check"></i></span><strong>${actionLabel(action)}</strong><small>${action === 'confirm-masked-reference' ? 'Confirm only a partially hidden case or account reference.' : 'Approved by Bank KYC Review v1.'}</small></label>`).join('')}</fieldset><details class="blocked-actions"><summary><i data-lucide="x"></i> ${bankPolicy.prohibitedActionCodes.length} requests this role can never make</summary><ul>${bankPolicy.prohibitedActionCodes.map(action => `<li>${actionLabel(action)}</li>`).join('')}</ul></details><button class="button primary wide" type="submit">Create 90-second proof <i data-lucide="arrow-right"></i></button><button class="danger-demo" id="unauthorised-demo" type="button">Demonstrate a blocked OTP request</button></form><div id="issue-output" aria-live="polite"></div></div>
  <aside class="device-card"><div class="device-icon"><i data-lucide="fingerprint"></i></div><span class="status-dot" id="device-enrolment-status">Local key · enrols on first proof</span><h3>Private signing key</h3><p>Your private key is non-exportable and remains in this browser.</p><dl><div><dt>Algorithm</dt><dd>P-256 / ES256</dd></div><div><dt>Storage</dt><dd>Browser key store</dd></div><div><dt>Key status</dt><dd id="key-status">Checking…</dd></div></dl><div class="key-actions"><button id="rotate-key" type="button">Rotate key</button><button id="remove-key" type="button">Remove key</button></div><p class="small-warning">Clearing browser storage removes this key. Production recovery requires administrator re-enrolment.</p></aside></section>`)
}

function attackLabPage(): string {
  return shell(`<section class="page-head illustrated-head safety-lab-head"><div class="head-copy"><span class="eyebrow">${phosphor('shield-chevron')} Interactive safety lab</span><h1>See every safety boundary respond.</h1><p>Each scenario changes one part of a real signed proof, then asks the Swift verification engine for a fresh decision.</p><div class="lab-hero-actions"><button id="run-all" class="button primary"><i data-lucide="zap"></i> Run all 12 checks</button><span>${phosphor('check-circle')} Live verdicts, never hard-coded</span></div></div><div class="route-art safety-lab-art"><img src="/assets/safety-lab-editorial.jpg" width="1587" height="991" alt="A citizen calmly follows safe, paused and blocked request paths"/><span class="art-caption"><strong>Twelve real scenarios</strong>Identity, policy, freshness, replay and registry evidence.</span></div></section><div id="suite-summary" class="suite-summary" role="status" aria-live="polite">${phosphor('flask')} <span>No checks run yet.</span></div><section class="attack-grid">${attacks().map((attack, index) => `<article class="attack-card" data-attack="${index}"><div class="attack-card-top"><span class="attack-visual">${phosphor(attackIcons[index] ?? 'warning')}</span><span class="attack-number">${String(index + 1).padStart(2, '0')}</span></div><h2>${attack.title}</h2><p>${attack.change}</p><div class="attack-result">Expected: <strong>${attack.expected.replaceAll('_', ' ')}</strong></div><button class="button secondary run-attack">Run this check</button></article>`).join('')}</section>`)
}

function transparencyPage(): string {
  return shell(`<section class="page-head illustrated-head transparency-head"><div class="head-copy"><span class="eyebrow">Public trust record</span><h1>Trust should never depend on one gatekeeper.</h1><p>Three fictional validators witness every institutional change. Two independent approvals are required, while personal interaction data stays off-chain.</p><div class="validator-mini"><span>01</span><span>02</span><span>03</span><strong>2 of 3 must agree</strong></div></div><div class="route-art transparency-art"><img src="/assets/consortium-transparency.jpg" width="1672" height="941" alt="Three consortium validators participating in a transparent approval process"/><span class="art-caption"><strong>Shared oversight</strong>Hashes and roots only—never citizen data.</span></div></section><section class="transparency-intro"><span>Consortium record</span><h2>Every approved institution leaves a public, privacy-safe trail.</h2></section><section class="transparency-list">${['Bharat Trust Bank — DEMO', 'Metro University Services — DEMO', 'Bharat Parcel Network — DEMO'].map((name, index) => `<article><div class="institution-logo">${index === 0 ? 'BT' : index === 1 ? 'MU' : 'BP'}</div><div><span class="verified-label"><i data-lucide="badge-check"></i> Sandbox approved</span><h2>${name}</h2><p>Registry version ${index + 7} · Two of three validators approved</p></div><code>0x${(index + 4).toString().repeat(12)}…</code></article>`).join('')}</section>`)
}

function institutionPage(): string {
  return shell(`<section class="dashboard-welcome admin-welcome"><div><span>Institution control centre</span><strong>Welcome, ${escape(currentIdentity?.displayName.split(' ')[0] ?? 'Administrator')}.</strong><small>Your administrative scope is limited to ${escape(currentIdentity?.institutionName ?? 'Bharat Trust Bank — DEMO')}.</small></div><div class="session-trust"><i data-lucide="landmark"></i><span><strong>Administrator verified</strong>RLS-protected membership</span></div></section><section class="page-head operations-head admin-illustrated"><div><span class="eyebrow"><i data-lucide="landmark"></i> Institution administration · Fictional sandbox</span><h1>Define what employees may ask.</h1><p>Administrators publish explicit action policies and revoke compromised credentials. Every change is scoped to the institution.</p></div><div class="admin-governance-art"><img src="/assets/institution-governance.jpg" width="1824" height="941" alt="Institution leaders review a representative authority policy"/><div class="operation-badge"><i data-lucide="shield-check"></i><div><strong>Bank KYC Review v1</strong><span>Signed policy · Active</span></div></div></div></section><section class="admin-grid"><article class="policy-editor"><span class="panel-kicker">Current signed policy</span><h2>KYC Verification Officer</h2><p>Default deny: anything not listed under “May request” is rejected by the receiver's Swift verifier.</p><div class="policy-columns"><div><h3><i data-lucide="check"></i> May request</h3>${bankPolicy.permittedActionCodes.map(action => `<span>${actionLabel(action)}</span>`).join('')}</div><div class="blocked"><h3><i data-lucide="shield-x"></i> Never permitted</h3>${bankPolicy.prohibitedActionCodes.map(action => `<span>${actionLabel(action)}</span>`).join('')}</div></div><div class="policy-proof"><span>Canonical policy hash</span><code>sha256:7f3c…d824</code><strong>Witnessed in registry snapshot 7</strong></div></article><aside class="revocation-console" id="revocation-console"><div class="device-icon"><i data-lucide="fingerprint"></i></div><span class="panel-kicker">Representative credential</span><h2>Aarav Sharma — DEMO</h2><p>KYC Verification Officer · Device key v1</p><div class="credential-status" id="credential-status"><span></span>Checking protected status…</div><p class="muted">Publish an immutable revocation to demonstrate how an existing proof is rejected on the citizen's device.</p><button id="revoke-representative" class="button primary wide" disabled><i data-lucide="shield-x"></i>Checking credential…</button><p id="revocation-message" class="muted" aria-live="polite"></p></aside></section><section class="enrolment-section"><span class="section-kicker">How an employee joins</span><h2>Institution-controlled from identity check to device key.</h2><div class="enrolment-flow">${[['01','Invite','An administrator creates the employee invitation.'],['02','Assign authority','A protected membership assigns role and permitted purpose.'],['03','Bind device','The browser creates a non-exportable signing key.'],['04','Issue credential','The institution signs the public key, role and expiry.']].map(item => `<article><span>${item[0]}</span><h3>${item[1]}</h3><p>${item[2]}</p></article>`).join('')}</div><p class="enrolment-note">Employees cannot change their own role, policy, institution membership or revocation status.</p></section>`)
}

function validatorsPage(): string {
  return shell(`<section class="page-head operations-head"><div><span class="eyebrow"><i data-lucide="gavel"></i> Consortium validator simulator</span><h1>One operator cannot rewrite trust.</h1><p>Run a real two-of-three governance transaction against local Anvil. Only hashes are proposed, approved and stored.</p></div><div class="operation-badge chain"><i data-lucide="globe-2"></i><div><strong>Local chain 31337</strong><span id="chain-badge">Checking connection…</span></div></div></section><section class="validator-console"><div class="validator-stage"><div class="validator-person approved"><span>01</span><strong>Financial Safety</strong><small>Fictional validator</small></div><div class="approval-line"><i></i><span>2 / 3</span><i></i></div><div class="validator-person"><span>02</span><strong>Digital Communications</strong><small>Fictional validator</small></div><div class="validator-person"><span>03</span><strong>Cyber Trust</strong><small>Fictional validator</small></div></div><div class="governance-card"><span class="panel-kicker">Live governed operation</span><h2>Register Bharat Trust Bank — DEMO</h2><p>The proposal contains an institution identifier hash, public-key hash and metadata hash—never a name, phone number or citizen interaction.</p><dl id="registry-state"><div><dt>Contract</dt><dd>0x5FbD…0aa3</dd></div><div><dt>Institution state</dt><dd>Checking…</dd></div><div><dt>Latest block</dt><dd>—</dd></div></dl><div id="validator-progress" class="validator-progress" aria-live="polite">Ready to run the governed demonstration.</div><button id="run-governance" class="button primary wide"><i data-lucide="gavel"></i> Run two-of-three approval</button></div></section>`)
}

function architecturePage(): string {
  return shell(`<section class="page-head illustrated-head architecture-head"><div class="head-copy"><span class="eyebrow">${phosphor('phone-call')} Protocol, not call surveillance</span><h1>Bound to the call.<br><em>Never listening in.</em></h1><p>ADHIKAAR verifies declared authority while preserving call privacy. It does not record audio, analyse speech or pretend to know everything said.</p><a class="button primary" href="/login?role=citizen" data-link>Try the receiver flow <i data-lucide="arrow-right"></i></a></div><div class="route-art architecture-art"><img src="/assets/call-bound-authority.jpg" width="1672" height="941" alt="Two people on a call connected by a short-lived permission proof"/><span class="art-caption"><strong>Conversation-bound</strong>A fresh challenge connects the declaration to this exact interaction.</span></div></section><section class="call-sequence"><article><span>01</span><div class="sequence-icon">${phosphor('phone-call')}</div><h2>Call begins</h2><p>The receiver creates a fresh private challenge and reads it to the employee.</p></article><article><span>02</span><div class="sequence-icon">${phosphor('list-checks')}</div><h2>Employee declares the request</h2><p>The employee selects the purpose and exact actions in the organisation's calling dashboard.</p></article><article><span>03</span><div class="sequence-icon">${phosphor('timer')}</div><h2>Device signs 90 seconds</h2><p>Challenge, actions, policy version, expiry and one-time nonce become one signed mandate.</p></article><article><span>04</span><div class="sequence-icon">${phosphor('seal-check')}</div><h2>Receiver decides locally</h2><p>Swift checks identity, allowlist, freshness, revocation, replay and witnessed registry state.</p></article></section><section class="integration-section"><div><span class="section-kicker">Phone integration</span><h2>Works beside today's calls—and inside tomorrow's calling stack.</h2><p>The protocol is channel-independent. It never needs access to call audio.</p></div><div class="integration-grid"><article>${phosphor('chat-circle-dots')}<strong>Prototype today</strong><p>Challenge spoken during the call; proof shared as a six-character code or QR.</p></article><article>${phosphor('headset')}<strong>Call-centre CRM</strong><p>Embed the employee dashboard beside the dialler and attach the mandate to the active call ID.</p></article><article>${phosphor('chats-circle')}<strong>SMS or RCS</strong><p>Send a signed deep link from the organisation's registered sender while the call is active.</p></article><article>${phosphor('code')}<strong>IVR and softphone SDK</strong><p>Read or display the proof code automatically, with the same browser-side verifier.</p></article></div></section><section class="honesty-callout">${phosphor('info')}<div><strong>What the proof does—and does not say</strong><p>It proves that the enrolled employee declared these specific actions and policy permits them. If the person verbally asks for anything else, the receiver must refuse it. ADHIKAAR does not claim to understand or police the audio conversation.</p></div></section>`)
}

function informationPage(kind: string): string {
  const content: Record<string, [string, string, string, string[], string[], string[]]> = {
    '/privacy': ['Privacy by design', 'Your safety account protects role access while each private challenge stays on your device.', '/assets/privacy-boundaries.jpg', ['The raw citizen challenge is never stored.', 'Analytics use minimised, hashed interaction references.', 'No call audio, conversation transcript or raw IP address is collected.', 'Only public trust roots—not personal interaction data—go on-chain.'], ['device-mobile', 'hash', 'microphone-slash', 'tree-structure'], ['On this device', 'Minimised events', 'Never collected', 'Public trust only']],
    '/limitations': ['What ADHIKAAR cannot promise', 'Honest boundaries make a security product stronger—and safer to trust.', '/assets/honest-limitations.jpg', ['A fully compromised phone or browser can undermine any local check.', 'Authorisation cannot guarantee that an authorised employee behaves honestly.', 'The prototype does not authenticate caller-number routing or detect deepfakes.', 'This demonstration is not yet a regulator-backed national service.'], ['device-mobile-slash', 'user-focus', 'phone-disconnect', 'buildings'], ['Use a clean device', 'Verify the exact ask', 'Use a trusted callback', 'Needs real governance']]
  }
  const item = content[kind] ?? content['/limitations']!
  return shell(`<section class="page-head illustrated-head information-head ${kind === '/privacy' ? 'privacy-head' : 'limitations-head'}"><div class="head-copy"><span class="eyebrow">${phosphor(kind === '/privacy' ? 'hand-heart' : 'info')} Plain-language guide</span><h1>${item[0]}</h1><p>${item[1]}</p><div class="information-promise">${phosphor(kind === '/privacy' ? 'lock-key-open' : 'compass')}<span><strong>${kind === '/privacy' ? 'Minimal by default' : 'Clear before clever'}</strong>${kind === '/privacy' ? 'Collect less. Explain more.' : 'No security theatre. No impossible claims.'}</span></div></div><div class="route-art information-art"><img src="${item[2]}" width="1536" height="1024" alt="${kind === '/privacy' ? 'A private phone protected by clear data boundaries' : 'A person using a phone within clearly defined security boundaries'}"/><span class="art-caption"><strong>${kind === '/privacy' ? 'Your conversation stays yours' : 'Trust includes boundaries'}</strong>${kind === '/privacy' ? 'The proof checks authority without listening.' : 'Every limitation comes with a safer next step.'}</span></div></section><section class="information-cards">${item[3].map((line, index) => `<article><span class="information-icon">${phosphor(item[4][index] ?? 'info')}</span><div><small>${item[5][index]}</small><p>${line}</p></div></article>`).join('')}</section>`)
}

function resultMarkup(result: VerificationResult, duration: number): string {
  const tone = result.verdict === 'VERIFIED_AUTHORISED' ? 'good' : result.verdict === 'AUTHENTIC_UNAUTHORISED' || result.verdict === 'STALE' ? 'warning' : 'danger'
  return `<div class="result-card ${tone}"><div class="result-symbol"><i data-lucide="${tone === 'good' ? 'shield-check' : tone === 'warning' ? 'circle-help' : 'x'}"></i></div><span class="result-kicker">Swift WebAssembly decision</span><h2>${language === 'hi' ? result.titleHindi : result.titleEnglish}</h2><p>${language === 'hi' ? result.explanationHindi : result.explanationEnglish}</p><div class="result-actions"><h3>Requested in this conversation</h3>${result.requestedActions.map(action => `<span>${actionLabel(action)}</span>`).join('')}</div><div class="safe-callback"><i data-lucide="phone"></i><div><strong>Verified safe callback</strong><span>1800-000-2026 · FICTIONAL DEMONSTRATION NUMBER</span></div></div><details><summary>See technical proof</summary><dl><div><dt>Engine</dt><dd>${result.verificationEngine}</dd></div><div><dt>Version</dt><dd>${result.engineVersion}</dd></div><div><dt>Decision time</dt><dd>${duration.toFixed(2)} ms</dd></div><div><dt>Reason codes</dt><dd>${result.reasonCodes.join(', ')}</dd></div></dl></details></div>`
}

async function bindPage(): Promise<void> {
  document.querySelectorAll<HTMLAnchorElement>('[data-link]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); history.pushState({}, '', link.href); void render() }))
  document.querySelector('#sign-out')?.addEventListener('click', () => void (async () => {
    await signOut()
    history.pushState({}, '', '/')
    await render()
  })())
  document.querySelector('#switch-account')?.addEventListener('click', () => void (async () => {
    await signOut()
    history.pushState({}, '', '/login')
    await render()
  })())
  const loginForm = document.querySelector<HTMLFormElement>('#login-form')
  const performLogin = async (email: string, password: string): Promise<void> => {
    const message = document.querySelector<HTMLElement>('#login-message')
    const button = loginForm?.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (button) { button.disabled = true; button.innerHTML = '<span class="button-spinner"></span> Verifying account…' }
    if (message) { message.className = 'login-message'; message.textContent = 'Checking your identity and protected role…' }
    try {
      const identity = await signIn(email, password)
      currentIdentity = identity
      if (message) { message.className = 'login-message success'; message.textContent = `Welcome, ${identity.displayName}. Opening your protected dashboard…` }
      await new Promise(resolve => window.setTimeout(resolve, 240))
      history.pushState({}, '', destinationFor(identity.role))
      await render()
    } catch (error) {
      if (message) { message.className = 'login-message error'; message.textContent = error instanceof Error ? error.message : String(error) }
      if (button) { button.disabled = false; button.innerHTML = 'Continue securely <i data-lucide="arrow-right"></i>' }
      createIcons({ icons })
    }
  }
  loginForm?.addEventListener('submit', event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget as HTMLFormElement)
    void performLogin(String(data.get('email') ?? ''), String(data.get('password') ?? ''))
  })
  document.querySelectorAll<HTMLButtonElement>('.demo-login').forEach(button => button.addEventListener('click', () => {
    const email = button.dataset.email ?? ''
    const password = button.dataset.password ?? ''
    const emailInput = document.querySelector<HTMLInputElement>('#login-email')
    const passwordInput = document.querySelector<HTMLInputElement>('#login-password')
    if (emailInput) emailInput.value = email
    if (passwordInput) passwordInput.value = password
    void performLogin(email, password)
  }))
  document.querySelector('#language')?.addEventListener('click', () => { language = language === 'en' ? 'hi' : 'en'; localStorage.setItem('adhikaar:language', language); void render() })
  document.querySelector('#regenerate')?.addEventListener('click', () => { citizenChallenge = randomCode(8); const output = document.querySelector('#challenge'); if (output) output.textContent = citizenChallenge })
  document.querySelector('#copy-challenge')?.addEventListener('click', () => void navigator.clipboard.writeText(citizenChallenge))
  const scanButton = document.querySelector<HTMLButtonElement>('.scan-button')
  const scanDialog = document.querySelector<HTMLDialogElement>('#qr-dialog')
  scanButton?.addEventListener('click', () => void (async () => {
    if (!scanDialog) return
    scanDialog.showModal()
    const { BrowserQRCodeReader } = await import('@zxing/browser')
    const reader = new BrowserQRCodeReader()
    const video = document.querySelector<HTMLVideoElement>('#qr-video')!
    const status = document.querySelector<HTMLElement>('.scan-status')!
    void reader.decodeFromVideoDevice(undefined, video, (result, error, controls) => {
      if (result) {
        try {
          const parsed = JSON.parse(result.getText()) as { code?: string }
          const code = parsed.code ?? result.getText()
          const input = document.querySelector<HTMLInputElement>('#verification-code')!
          input.value = code.toUpperCase().slice(0, 6)
          controls.stop(); scanDialog.close(); input.focus()
        } catch { status.textContent = 'That QR code is not an ADHIKAAR proof. Please try another.' }
      } else if (error?.name === 'NotAllowedError') status.textContent = 'Camera permission was not granted. Enter the six-character code instead.'
    }).catch(() => { status.textContent = 'Camera unavailable. Enter the six-character code instead.' })
  })())
  scanDialog?.querySelector('.dialog-close')?.addEventListener('click', () => scanDialog.close())
  document.querySelector<HTMLFormElement>('#verify-form')?.addEventListener('submit', event => {
    event.preventDefault(); void (async () => {
      const code = new FormData(event.currentTarget as HTMLFormElement).get('code')?.toString() ?? ''
      const container = document.querySelector('#verification-result')!; container.innerHTML = '<div class="loading"><span></span><h2>Checking the signed proof…</h2><p>Identity, permission, freshness and registry status are checked on this device.</p></div>'
      try {
        const evidence = await resolveDemoMandate(code, citizenChallenge)
        const verified = verifyWithSwift(evidence)
        container.className = ''
        container.innerHTML = `${resultMarkup(verified.result, verified.durationMs)}<section class="complaint-box"><span class="verified-label"><i data-lucide="message-square-warning"></i> Report a verbal request</span><h2>Did the employee ask for something unsafe?</h2><p>This message goes only to the administrator of the organisation proven by this code.</p><form id="complaint-form"><textarea name="message" minlength="10" maxlength="1000" required placeholder="Describe exactly what the employee verbally requested…"></textarea><button class="button secondary wide" type="submit">Send confidential report</button><p class="complaint-feedback" aria-live="polite"></p></form></section>`
        document.querySelector<HTMLFormElement>('#complaint-form')?.addEventListener('submit', complaintEvent => {
          complaintEvent.preventDefault(); void (async () => {
            const form = complaintEvent.currentTarget as HTMLFormElement
            const button = form.querySelector<HTMLButtonElement>('button')!
            const feedback = form.querySelector<HTMLElement>('.complaint-feedback')!
            const message = new FormData(form).get('message')?.toString() ?? ''
            button.disabled = true; button.textContent = 'Sending securely…'
            try { await submitCustomerComplaint(evidence.mandate.mandateId, message); feedback.textContent = 'Report sent to the organisation administrator.'; form.querySelector('textarea')?.setAttribute('disabled', '') }
            catch (complaintError) { feedback.textContent = complaintError instanceof Error ? complaintError.message : 'Report could not be sent.'; button.disabled = false }
          })()
        })
      }
      catch (error) { container.className = ''; container.innerHTML = `<div class="result-card danger"><div class="result-symbol"><i data-lucide="x"></i></div><h2>We could not verify this request</h2><p>${escape(error instanceof Error ? error.message : String(error))}</p><div class="safe-callback"><i data-lucide="phone"></i><span>Stop and call the organisation through a number you already trust.</span></div></div>` }
      createIcons({ icons })
    })()
  })
  const keyStatus = document.querySelector('#key-status')
  const enrolmentStatus = document.querySelector('#device-enrolment-status')
  if (keyStatus) void getOrCreateRepresentativeKey().then(() => { keyStatus.textContent = 'Ready on this browser' }).catch(() => {
    keyStatus.textContent = 'Unavailable'
    if (enrolmentStatus) enrolmentStatus.textContent = 'Signing key unavailable'
  })
  if (enrolmentStatus) void demoRepresentativeStatus().then(status => {
    if (status.replacementPending) {
      enrolmentStatus.textContent = 'Replacement approved · rotate key before next proof'
      if (keyStatus) keyStatus.textContent = 'Rotation required'
    }
  })
  document.querySelector('#rotate-key')?.addEventListener('click', () => void rotateRepresentativeKey().then(() => {
    if (keyStatus) keyStatus.textContent = 'Rotated just now'
    if (enrolmentStatus) enrolmentStatus.textContent = 'New local key · enrols on first proof'
  }).catch(() => {
    if (keyStatus) keyStatus.textContent = 'Rotation unavailable'
    if (enrolmentStatus) enrolmentStatus.textContent = 'Signing key unavailable'
  }))
  document.querySelector('#remove-key')?.addEventListener('click', () => void removeRepresentativeKey().then(() => {
    if (keyStatus) keyStatus.textContent = 'Removed — recreated on next proof'
    if (enrolmentStatus) enrolmentStatus.textContent = 'No local signing key'
  }).catch(() => {
    if (keyStatus) keyStatus.textContent = 'Could not remove key'
  }))
  document.querySelector<HTMLFormElement>('#issue-form')?.addEventListener('submit', event => {
    event.preventDefault(); void (async () => {
      const form = event.currentTarget as HTMLFormElement
      const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]')
      if (submitButton?.disabled) return
      const originalButtonMarkup = submitButton?.innerHTML ?? ''
      if (submitButton) {
        submitButton.disabled = true
        submitButton.textContent = 'Creating secure proof…'
      }
      form.setAttribute('aria-busy', 'true')
      const data = new FormData(form)
      const challenge = data.get('employee-challenge')?.toString() ?? ''
      const actions = data.getAll('action').map(String)
      const output = document.querySelector('#issue-output')!
      output.innerHTML = '<div class="loading"><span></span><h2>Creating the signed proof…</h2><p>Enrolling this device and checking the institution policy.</p></div>'
      try {
        const { evidence, localCacheStored } = await issueDemoMandate(challenge, actions)
        if (enrolmentStatus) enrolmentStatus.textContent = 'Institution enrolment confirmed'
        let qrMarkup = ''
        let qrAvailable = false
        try {
          const qr = await QRCode.toDataURL(JSON.stringify({ v: 1, code: evidence.mandate.verificationCode }), { margin: 1, width: 220 })
          qrMarkup = `<img src="${qr}" alt="QR code containing the verification code"/>`
          qrAvailable = true
        } catch {
          // The institution has already accepted the proof. The manual code remains
          // authoritative when this optional presentation layer is unavailable.
        }
        const fallbackNotes = [
          !qrAvailable ? 'QR unavailable—read the six-character code aloud instead.' : '',
          !localCacheStored ? 'The institution accepted this proof, but this browser could not keep its optional local backup.' : ''
        ].filter(Boolean)
        const proofNote = fallbackNotes.length ? fallbackNotes.join(' ') : 'The receiver must check this with their own private challenge.'
        output.innerHTML = `<div class="issued-proof"><span class="verified-label"><i data-lucide="badge-check"></i> Signed and accepted by the institution</span><h2>Share this proof with the receiver</h2><div class="proof-share">${qrMarkup}<div><span>VERIFICATION CODE</span><strong>${evidence.mandate.verificationCode}</strong><p><i data-lucide="clock-3"></i> Expires in 90 seconds</p></div></div><p class="proof-note">${proofNote}</p></div>`
      } catch (error) {
        const message = error instanceof DemoIssuanceError
          ? error.message
          : 'We could not create the proof securely. No proof was issued. Please try again.'
        output.innerHTML = `<div class="inline-error"><i data-lucide="x"></i><p>${escape(message)}</p></div>`
      } finally {
        form.removeAttribute('aria-busy')
        if (submitButton) {
          submitButton.disabled = false
          submitButton.innerHTML = originalButtonMarkup
        }
        createIcons({ icons })
      }
    })()
  })
  document.querySelector('#unauthorised-demo')?.addEventListener('click', () => {
    const output = document.querySelector('#issue-output')!
    output.innerHTML = '<div class="blocked-message"><i data-lucide="shield-check"></i><div><strong>OTP request blocked before issuance</strong><p>Your signed Bank KYC policy does not permit this action. No proof was created.</p><a href="/attack-lab" data-link>See how the receiver also detects a compromised client</a></div></div>'
    createIcons({ icons }); void bindPage()
  })
  const run = async (card: HTMLElement, evidence: Evidence, expected: string) => {
    try { const { result, durationMs } = verifyWithSwift(evidence); const passed = result.verdict === expected; card.classList.add(passed ? 'passed' : 'failed'); card.querySelector('.attack-result')!.innerHTML = `${passed ? 'Protected' : 'Unexpected'} · <strong>${result.verdict.replaceAll('_', ' ')}</strong> · ${durationMs.toFixed(2)} ms`; return passed }
    catch (error) { card.classList.add('failed'); card.querySelector('.attack-result')!.textContent = error instanceof Error ? error.message : String(error); return false }
  }
  document.querySelectorAll<HTMLElement>('.attack-card').forEach(card => card.querySelector('.run-attack')?.addEventListener('click', () => { const attack = attacks()[Number(card.dataset.attack)]; if (attack) void run(card, attack.evidence, attack.expected) }))
  document.querySelector('#run-all')?.addEventListener('click', () => void (async () => {
    const cards = [...document.querySelectorAll<HTMLElement>('.attack-card')]
    const catalog = attacks(); const results: boolean[] = []
    for (let index = 0; index < cards.length; index += 1) { const attack = catalog[index]; const card = cards[index]; if (attack && card) results.push(await run(card, attack.evidence, attack.expected)) }
    const passed = results.filter(Boolean).length; document.querySelector('#suite-summary')!.innerHTML = `<strong>${passed}/${results.length}</strong> defined adversarial checks rejected as expected${passed === results.length ? ' ✓' : ''}`
  })())
  const adminGrid = document.querySelector<HTMLElement>('.admin-grid')
  if (adminGrid) adminGrid.insertAdjacentHTML('afterend', '<section class="complaints-panel"><span class="section-kicker">Customer safety inbox</span><h2>Reports from verified interactions</h2><p>Only reports tied to this organisation’s employee proofs appear here.</p><div id="complaint-list" aria-live="polite"><div class="loading"><span></span><p>Loading customer reports…</p></div></div></section>')
  const renderComplaints = async () => {
    const list = document.querySelector<HTMLElement>('#complaint-list'); if (!list) return
    try {
      const complaints = await listCustomerComplaints()
      list.innerHTML = complaints.length ? complaints.map(item => `<article class="complaint-card"><div><span>${escape(item.citizenName)} · ${new Date(item.created_at).toLocaleString()}</span><strong>${escape(item.representatives?.display_name ?? 'Organisation employee')}</strong><p>${escape(item.message)}</p></div>${item.status === 'pending' ? `<div class="complaint-actions"><button class="button secondary" data-complaint="${item.id}" data-decision="dismiss">Dismiss</button><button class="button primary" data-complaint="${item.id}" data-decision="revoke">Revoke credential</button></div>` : `<span class="complaint-state">${item.status === 'credential_revoked' ? 'Credential revoked' : 'Dismissed'}</span>`}</article>`).join('') : '<div class="empty-inbox"><strong>No customer reports</strong><p>New reports from verified calls will appear here.</p></div>'
      list.querySelectorAll<HTMLButtonElement>('[data-complaint]').forEach(button => button.addEventListener('click', () => void (async () => {
        button.disabled = true
        try { await resolveCustomerComplaint(button.dataset.complaint!, button.dataset.decision as 'dismiss' | 'revoke'); await renderComplaints() }
        catch (decisionError) { button.disabled = false; list.insertAdjacentHTML('afterbegin', `<p class="inline-error">${escape(decisionError instanceof Error ? decisionError.message : 'Decision failed.')}</p>`) }
      })()))
    } catch (complaintError) { list.innerHTML = `<p class="inline-error">${escape(complaintError instanceof Error ? complaintError.message : 'Customer reports unavailable.')}</p>` }
  }
  if (adminGrid) void renderComplaints()
  const revokeButton = document.querySelector<HTMLButtonElement>('#revoke-representative')
  const updateRevocationCard = async () => {
    if (!revokeButton) return
    const consoleCard = document.querySelector<HTMLElement>('#revocation-console')!
    const statusLabel = document.querySelector<HTMLElement>('#credential-status')!
    const status = await demoRepresentativeStatus()
    if (!status.id) {
      statusLabel.innerHTML = '<span></span>Awaiting employee device enrolment'
      revokeButton.disabled = true
      revokeButton.innerHTML = '<i data-lucide="fingerprint"></i>Employee must create one proof first'
    } else if (status.revoked) {
      consoleCard.classList.add('revoked')
      statusLabel.innerHTML = '<span></span>Revoked in the immutable trust record'
      revokeButton.disabled = status.replacementPending
      revokeButton.className = 'button secondary wide'
      revokeButton.innerHTML = status.replacementPending
        ? '<i data-lucide="fingerprint"></i>Replacement approved · awaiting employee'
        : '<i data-lucide="rotate-ccw"></i>Issue replacement credential'
    } else {
      statusLabel.innerHTML = '<span></span>Active and in good standing'
      revokeButton.disabled = false
      revokeButton.innerHTML = '<i data-lucide="shield-x"></i>Revoke fictional credential'
    }
    createIcons({ icons })
  }
  if (revokeButton) void updateRevocationCard()
  revokeButton?.addEventListener('click', () => void (async () => {
    const message = document.querySelector<HTMLElement>('#revocation-message')!
    revokeButton.disabled = true
    const status = await demoRepresentativeStatus()
    revokeButton.innerHTML = `<span class="button-spinner"></span> ${status.revoked ? 'Authorising replacement…' : 'Publishing revocation…'}`
    try {
      if (status.revoked) {
        await authoriseDemoReplacement()
        message.textContent = 'Old revocation preserved. Ask the employee to rotate their browser key, then create a new proof.'
      } else {
        await revokeDemoRepresentative()
        message.textContent = 'Revocation published. Any existing proof now fails closed on the citizen side.'
      }
      await updateRevocationCard()
    } catch (error) {
      message.textContent = error instanceof Error ? error.message : String(error)
      revokeButton.disabled = false
    }
  })())
  const registryState = document.querySelector<HTMLElement>('#registry-state')
  const chainBadge = document.querySelector<HTMLElement>('#chain-badge')
  const renderRegistryStatus = async () => {
    if (!registryState || !chainBadge) return
    const { getRegistryStatus } = await import('./services/registry')
    const status = await getRegistryStatus()
    chainBadge.textContent = status.reachable ? `Connected · block ${status.updatedBlock}` : 'Anvil unavailable · fail-safe mode'
    registryState.innerHTML = `<div><dt>Contract</dt><dd>${status.contractAddress.slice(0, 6)}…${status.contractAddress.slice(-4)}</dd></div><div><dt>Institution state</dt><dd>${!status.reachable ? 'Unavailable' : status.active ? 'Active on-chain' : 'Not registered'}</dd></div><div><dt>Latest block</dt><dd>${status.reachable ? status.updatedBlock.toString() : '—'}</dd></div>`
  }
  if (registryState) void renderRegistryStatus()
  document.querySelector<HTMLButtonElement>('#run-governance')?.addEventListener('click', event => void (async () => {
    const button = event.currentTarget as HTMLButtonElement
    const progress = document.querySelector<HTMLElement>('#validator-progress')!
    button.disabled = true
    try {
      const { runGovernedRegistration } = await import('./services/registry')
      await runGovernedRegistration(message => { progress.textContent = message })
      progress.classList.add('complete')
      await renderRegistryStatus()
    } catch (error) {
      progress.textContent = error instanceof Error ? error.message : String(error)
      progress.classList.add('error')
    } finally { button.disabled = false }
  })())
}

async function render(): Promise<void> {
  const path = location.pathname
  const routeChanged = path !== previousRoute
  app.classList.remove('route-ready')
  try { currentIdentity = await getIdentity() } catch { currentIdentity = null }
  document.documentElement.lang = language
  document.body.dataset.route = path.replace(/^\//u, '') || 'home'
  document.title = routeTitles[path] ?? 'Page not found — ADHIKAAR'
  const protectedPath = ['/verify', '/representative', '/institution'].includes(path)
  if (protectedPath && !currentIdentity) {
    const role = path === '/verify' ? 'citizen' : 'organisation'
    history.replaceState({}, '', `/login?role=${role}&next=${encodeURIComponent(path)}`)
    app.innerHTML = loginPage()
  } else if (protectedPath && currentIdentity && !mayAccess(currentIdentity, path)) {
    app.innerHTML = accessDeniedPage(path)
  } else {
    app.innerHTML = path === '/' ? homePage() : path === '/login' ? loginPage() : path === '/verify' ? verifyPage() : path === '/representative' ? representativePage() : path === '/attack-lab' ? attackLabPage() : path === '/transparency' ? transparencyPage() : path === '/institution' ? institutionPage() : path === '/validators' ? validatorsPage() : path === '/architecture' ? architecturePage() : informationPage(path)
  }
  createIcons({ icons }); await bindPage(); refreshEngineStatus(); enhancePresentation(routeChanged)
  previousRoute = path
}

window.addEventListener('popstate', () => void render())
await render()
void loadSwiftVerifier().then(refreshEngineStatus)
