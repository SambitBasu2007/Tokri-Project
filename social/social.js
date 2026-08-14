// ============================================================
//  Tokri – Social  |  Communities Hub Logic
//  All data is fetched from Supabase. Follows the same section
//  comment style and patterns as app.js.
//
//  CONCEPTS USED:
//    - Dynamic import with fallback (same pattern as fixed app.js)
//    - Tab switching with .active class toggle
//    - Supabase queries with RLS policies
//    - Debounced search input
//    - Expandable dropdowns for community members
//    - Modal open/close mechanics
// ============================================================


// ============================================================
//  SECTION 1: SUPABASE CLIENT IMPORT (with fallback)
// ============================================================
let supabase = null;

// Load Supabase in background — never block script execution
setTimeout(() => {
    import('../supabase.js')
        .then(module => { supabase = module.supabase; })
        .catch(err => { console.warn('[Social] Supabase not available:', err.message); });
}, 0);








// ============================================================
//  SECTION 2: APPLICATION STATE
// ============================================================
let currentUser = null;
let userCommunities = [];
let activeTab = 'current';
let searchDebounceTimer = null;
let createCommunityType = 'family';


// ============================================================
//  SECTION 3: AUTH GUARD — redirect if not logged in
// ============================================================
async function initAuth() {
    if (!supabase) {
        showAuthRequired();
        return false;
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        showAuthRequired();
        return false;
    }

    currentUser = user;
    return true;
}

function showAuthRequired() {
    const panels = ['panelCurrent', 'panelJoin'];
    panels.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `
        <div class="section-container">
          <div class="communities-empty">
            <div style="font-size:3rem;margin-bottom:16px;">🔒</div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary);margin-bottom:8px;">Sign in required</div>
            <div style="color:var(--text-secondary);margin-bottom:24px;">Please sign in to view and join communities.</div>
            <a href="../index.html" class="btn btn-primary">Go to Home</a>
          </div>
        </div>
      `;
        }
    });
}

// aaaaaaaaaaaaa


// aaaaaaaaaaaaaaaaaa

// ============================================================
//  SECTION 4: TAB SWITCHING
//  Mirrors app.js Section 8 (category-pill active-state pattern).
// ============================================================
function switchSocialTab(tab) {
    activeTab = tab;

    // Toggle tab buttons
    document.querySelectorAll('.social-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });

    // Toggle panels
    document.querySelectorAll('.social-panel').forEach(p => {
        p.classList.toggle('active', p.id === 'panel' + (tab === 'current' ? 'Current' : 'Join'));
    });

    if (tab === 'current') {
        renderCurrentCommunities();
    }
}

// Wire tab click listeners
document.querySelectorAll('.social-tab').forEach(tab => {
    tab.addEventListener('click', () => switchSocialTab(tab.dataset.tab));
});


// ============================================================
//  SECTION 5: RENDER CURRENT COMMUNITIES
//  Fetches communities + members + latest order event per community.
// ============================================================
async function renderCurrentCommunities() {
    const grid = document.getElementById('communitiesGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="communities-loading">Loading your communities…</div>';

    try {
        // Fetch communities the user belongs to
        const { data: memberships, error: memError } = await supabase
            .from('community_members')
            .select(`
        community_id,
        communities(id, handle, display_name, type, leader_id, created_at)
      `)
            .eq('user_id', currentUser.id);

        if (memError) throw memError;

        if (!memberships || memberships.length === 0) {
            grid.innerHTML = `
        <div class="communities-empty">
          <div style="font-size:3rem;margin-bottom:16px;">🏠</div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary);margin-bottom:8px;">No communities yet</div>
          <div style="color:var(--text-secondary);margin-bottom:24px;">Create a community or join one to get started.</div>
          <button class="btn btn-primary" onclick="openCreateModal()">Create Community</button>
        </div>
      `;
            return;
        }

        // For each community, fetch members and latest order
        const communityCards = await Promise.all(
            memberships.map(async (membership) => {
                const community = membership.communities;

                // Fetch members with their public.users profile
                const { data: members, error: membersError } = await supabase
                    .from('community_members')
                    .select(`
            user_id,
            nickname,
            users(id, full_name)
          `)
                    .eq('community_id', community.id);

                if (membersError) {
                    console.error('Members fetch error:', membersError);
                }

                // Fetch latest order event (join to public.users for name)
                // Note: ordered_by references public.users(id), so we can join naturally
                let lastOrder = null;
                try {
                    const { data: orders, error: orderError } = await supabase
                        .from('order_events')
                        .select(`
              ordered_by,
              created_at,
              users:ordered_by(full_name)
            `)
                        .eq('community_id', community.id)
                        .order('created_at', { ascending: false })
                        .limit(1);

                    if (!orderError && orders && orders.length > 0) {
                        lastOrder = orders[0];
                    }
                } catch (e) {
                    console.warn('Order fetch error:', e);
                }

                const statusLine = buildStatusLine(lastOrder);
                return renderCommunityCard(community, members || [], statusLine);
            })
        );

        grid.innerHTML = communityCards.join('');

    } catch (err) {
        console.error('Failed to load communities:', err);
        grid.innerHTML = `
      <div class="communities-empty">
        <div style="font-size:2.5rem;margin-bottom:12px;">⚠️</div>
        <div style="font-weight:700;color:var(--text-primary);margin-bottom:8px;">Unable to load communities</div>
        <div style="color:var(--text-secondary);">${err.message || 'Please try again later.'}</div>
      </div>
    `;
    }
}


// ============================================================
//  SECTION 6: STATUS LINE BUILDER
//  Computes human-readable activity text from order timestamp.
// ============================================================
function buildStatusLine(lastOrder) {
    if (!lastOrder) {
        return { text: 'No orders yet — be the first to shop!', hasActivity: false };
    }

    const orderedAt = new Date(lastOrder.created_at);
    const now = new Date();
    const diffMs = now - orderedAt;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let timeAgo;
    if (diffMins < 1) timeAgo = 'just now';
    else if (diffMins < 60) timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    else if (diffHours < 24) timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    else timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    const name = lastOrder.users?.full_name || 'Someone';
    return { text: `${name} ordered ${timeAgo}`, hasActivity: true };
}


// ============================================================
//  SECTION 7: RENDER A SINGLE COMMUNITY CARD
// ============================================================
function renderCommunityCard(community, members, status) {
    const typeIcon = community.type === 'family' ? '👨‍👩‍👧‍👦' : '👥';
    const memberCount = members.length;

    const membersHTML = members.map(m => {
        const isLeader = m.user_id === community.leader_id;
        const displayName = m.nickname || m.users?.full_name || 'Member';
        return `
      <div class="community-member-row${isLeader ? ' leader' : ''}">
        <span class="community-member-star">${isLeader ? '★' : ''}</span>
        <span class="community-member-name">${displayName}</span>
        ${isLeader ? '<span class="community-member-role">Leader</span>' : ''}
      </div>
    `;
    }).join('');

    return `
    <div class="community-card" data-community-id="${community.id}">
      <div class="community-card-header" onclick="toggleCommunityDropdown('${community.id}')">
        <div class="community-card-icon">${typeIcon}</div>
        <div class="community-card-info">
          <div class="community-card-name">${community.display_name}</div>
          <div class="community-card-meta">
            <span class="community-card-type">${community.type}</span>
            <span class="community-card-handle">@${community.handle}</span>
            <span>· ${memberCount} member${memberCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <svg class="community-card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      <div class="community-card-status${status.hasActivity ? '' : ' community-card-status--none'}">
        ${status.text}
      </div>
      <div class="community-members-dropdown" id="dropdown-${community.id}">
        <div class="community-members-list">
          ${membersHTML}
        </div>
      </div>
    </div>
  `;
}


// ============================================================
//  SECTION 8: TOGGLE COMMUNITY DROPDOWN
//  Expands/collapses the members list for a given community.
// ============================================================
function toggleCommunityDropdown(communityId) {
    const card = document.querySelector(`[data-community-id="${communityId}"]`);
    if (!card) return;
    card.classList.toggle('open');
}

// Expose to global scope for inline onclick handlers
window.toggleCommunityDropdown = toggleCommunityDropdown;


// ============================================================
//  SECTION 9: JOIN TAB — SEARCH BY HANDLE
//  Debounced input, same pattern as app.js search/filter.
// ============================================================
function renderJoinTab() {
    // Initial empty state is already in HTML
}

function getJoinSearchQuery() {
    return document.getElementById('joinSearchInput').value.trim().toLowerCase();
}

async function searchCommunityByHandle(query) {
    const resultsContainer = document.getElementById('joinResults');

    if (!query || query.length < 2) {
        resultsContainer.innerHTML = '<div class="join-empty-hint">Type at least 2 characters to search</div>';
        return;
    }

    resultsContainer.innerHTML = '<div class="join-empty-hint">Searching…</div>';

    try {
        // Search communities by handle (case-insensitive)
        const { data: communities, error } = await supabase
            .from('communities')
            .select('id, handle, display_name, type, leader_id')
            .ilike('handle', `%${query}%`)
            .limit(20);

        if (error) throw error;

        if (!communities || communities.length === 0) {
            resultsContainer.innerHTML = '<div class="join-empty-hint">No communities found matching that handle</div>';
            return;
        }

        // Check which ones the user has already requested or joined
        const { data: myMemberships } = await supabase
            .from('community_members')
            .select('community_id')
            .eq('user_id', currentUser.id);

        const { data: myRequests } = await supabase
            .from('join_requests')
            .select('community_id, status')
            .eq('user_id', currentUser.id);

        const memberIds = new Set((myMemberships || []).map(m => m.community_id));
        const requestMap = new Map((myRequests || []).map(r => [r.community_id, r.status]));

        const cards = communities.map(c => {
            const typeIcon = c.type === 'family' ? '👨‍👩‍👧‍👦' : '👥';
            const isMember = memberIds.has(c.id);
            const requestStatus = requestMap.get(c.id);

            let actionButton;
            if (isMember) {
                actionButton = '<button class="btn-join" disabled>Joined</button>';
            } else if (requestStatus === 'pending') {
                actionButton = '<button class="btn-join requested" disabled>Requested</button>';
            } else if (requestStatus === 'rejected') {
                actionButton = '<button class="btn-join" disabled>Rejected</button>';
            } else {
                actionButton = `<button class="btn-join" onclick="sendJoinRequest('${c.id}')">Join</button>`;
            }

            return `
        <div class="join-result-card">
          <div class="join-result-icon">${typeIcon}</div>
          <div class="join-result-info">
            <div class="join-result-name">${c.display_name}</div>
            <div class="join-result-handle">@${c.handle}</div>
            <div class="join-result-type">${c.type === 'family' ? 'Family group' : 'Friends group'}</div>
          </div>
          <div class="join-result-actions">
            ${actionButton}
          </div>
        </div>
      `;
        }).join('');

        resultsContainer.innerHTML = cards;

    } catch (err) {
        console.error('Search error:', err);
        resultsContainer.innerHTML = '<div class="join-empty-hint">Search failed. Please try again.</div>';
    }
}

// Debounced input listener — same pattern as app.js Section 9
document.getElementById('joinSearchInput').addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    const query = getJoinSearchQuery();
    searchDebounceTimer = setTimeout(() => searchCommunityByHandle(query), 300);
});


// ============================================================
//  SECTION 10: SEND JOIN REQUEST
//  Inserts into join_requests with status 'pending'.
// ============================================================
async function sendJoinRequest(communityId) {
    try {
        const { error } = await supabase
            .from('join_requests')
            .insert({
                community_id: communityId,
                user_id: currentUser.id,
                status: 'pending'
            });

        if (error) {
            if (error.code === '23505') {
                alert('You have already requested to join this community.');
            } else {
                throw error;
            }
            return;
        }

        // Re-render the search results to show "Requested" state
        const query = getJoinSearchQuery();
        await searchCommunityByHandle(query);

    } catch (err) {
        console.error('Join request failed:', err);
        alert('Failed to send join request. Please try again.');
    }
}

window.sendJoinRequest = sendJoinRequest;


// ============================================================
//  SECTION 11: CREATE COMMUNITY MODAL
// ============================================================
function openCreateModal() {
    document.getElementById('createModalOverlay').classList.add('open');
    document.getElementById('createNameInput').focus();
}

function closeCreateModal() {
    document.getElementById('createModalOverlay').classList.remove('open');
    document.getElementById('createNameInput').value = '';
    document.getElementById('createHandleInput').value = '';
}

async function submitCreateCommunity() {
    const name = document.getElementById('createNameInput').value.trim();
    const handle = document.getElementById('createHandleInput').value.trim().toLowerCase();

    if (!name || !handle) {
        alert('Please enter both a name and a unique handle.');
        return;
    }

    if (!/^[a-z0-9_]+$/.test(handle)) {
        alert('Handle can only contain lowercase letters, numbers, and underscores.');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('communities')
            .insert({
                handle,
                display_name: name,
                type: createCommunityType,
                leader_id: currentUser.id
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                alert('That handle is already taken. Please choose another.');
            } else {
                throw error;
            }
            return;
        }

        closeCreateModal();
        switchSocialTab('current');

    } catch (err) {
        console.error('Create community failed:', err);
        alert('Failed to create community. Please try again.');
    }
}

// Wire create modal listeners
document.getElementById('createCommunityBtn').addEventListener('click', openCreateModal);
document.getElementById('createModalClose').addEventListener('click', closeCreateModal);
document.getElementById('createModalCancel').addEventListener('click', closeCreateModal);
document.getElementById('createModalSubmit').addEventListener('click', submitCreateCommunity);

// Type pill selection
document.querySelectorAll('.social-type-pill').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('.social-type-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        createCommunityType = pill.dataset.type;
    });
});

// Close modal on overlay click or Escape key
document.getElementById('createModalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('createModalOverlay')) closeCreateModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCreateModal();
});

window.openCreateModal = openCreateModal;


// ============================================================
//  SECTION 12: THEME TOGGLE (copied from app.js Section 13)
// ============================================================
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', next);
        themeToggle.innerHTML = next === 'light'
            ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
            : '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
    });
}


// ============================================================
//  SECTION 13: CART BUTTON — navigate back to home cart
// ============================================================
const cartBtn = document.getElementById('cartBtn');
if (cartBtn) {
    cartBtn.addEventListener('click', () => {
        window.location.href = '../index.html';
    });
}


// ============================================================
//  SECTION 14: INITIALIZATION
// ============================================================
(async function init() {
    const authed = await initAuth();
    if (authed) {
        renderCurrentCommunities();
    }
})();




















































// ============================================================
//  SECTION 18: PROFILE SIDEBAR
// ============================================================
//
//  Mirrors SECTION 12 (Cart Panel) open/close mechanics exactly.
//  Adds a slide-in profile sidebar with community summary box.
//

function openProfileSidebar() {
    document.getElementById('profileSidebar').classList.add('open');
    document.getElementById('profileOverlay').classList.add('open');
    renderAuthSection();
    renderCommunitySummaryBox();
}

function closeProfileSidebar() {
    document.getElementById('profileSidebar').classList.remove('open');
    document.getElementById('profileOverlay').classList.remove('open');
}

// Attach click handlers to profile button, close button, and overlay
document.getElementById('profileBtn').addEventListener('click', openProfileSidebar);
document.getElementById('profileClose').addEventListener('click', closeProfileSidebar);
document.getElementById('profileOverlay').addEventListener('click', closeProfileSidebar);

/**
 * renderCommunitySummaryBox()
 * Queries community_members joined to communities for the current user,
 * renders up to 10 mini community chips, and wires click to social.html.
 */
// ============================================================
//  SECTION 19: AUTH SECTION (Sign In / Sign Up / User Info)
// ============================================================
let authMode = 'signin';

async function renderAuthSection() {
    const section = document.getElementById('profileAuthSection');
    if (!section) return;

    if (!supabase) {
        section.innerHTML = '<div class="profile-auth-loading">Auth service unavailable</div>';
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const initial = user.email ? user.email[0].toUpperCase() : '?';
        section.innerHTML = `
      <div class="profile-auth-user">
        <div class="profile-auth-avatar">${initial}</div>
        <div class="profile-auth-info">
          <div class="profile-auth-email">${user.email}</div>
          <div class="profile-auth-status">● Signed in</div>
        </div>
      </div>
      <button class="btn-signout" id="signOutBtn" type="button">Sign Out</button>
    `;
        document.getElementById('signOutBtn').addEventListener('click', handleSignOut);
    } else {
        const isSignUp = authMode === 'signup';
        section.innerHTML = `
      <div class="profile-auth-form">
        <div class="profile-auth-title">${isSignUp ? 'Create Account' : 'Sign In'}</div>
        <input type="email" class="profile-auth-input" id="authEmail" placeholder="Email address" autocomplete="email">
        <input type="password" class="profile-auth-input" id="authPassword" placeholder="Password" autocomplete="${isSignUp ? 'new-password' : 'current-password'}">
        <div class="profile-auth-error" id="authError"></div>
        <div class="profile-auth-success" id="authSuccess"></div>
        <button class="btn btn-primary btn-block" id="authSubmitBtn" type="button">${isSignUp ? 'Create Account' : 'Sign In'}</button>
        <div class="profile-auth-toggle">
          ${isSignUp ? 'Already have an account? <button type="button" id="authToggleBtn">Sign in</button>' : 'New here? <button type="button" id="authToggleBtn">Create account</button>'}
        </div>
      </div>
    `;
        document.getElementById('authSubmitBtn').addEventListener('click', isSignUp ? handleSignUp : handleSignIn);
        document.getElementById('authToggleBtn').addEventListener('click', toggleAuthMode);
    }
}

function toggleAuthMode() {
    authMode = authMode === 'signin' ? 'signup' : 'signin';
    renderAuthSection();
}

async function handleSignIn() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');
    const successEl = document.getElementById('authSuccess');
    const btn = document.getElementById('authSubmitBtn');

    errorEl.textContent = '';
    successEl.textContent = '';

    if (!email || !password) {
        errorEl.textContent = 'Please enter both email and password.';
        return;
    }

    btn.textContent = 'Signing in…';
    btn.disabled = true;

    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        successEl.textContent = 'Signed in successfully!';
        setTimeout(() => { renderAuthSection(); renderCommunitySummaryBox(); }, 600);
    } catch (err) {
        errorEl.textContent = err.message || 'Sign in failed. Please try again.';
        btn.textContent = 'Sign In';
        btn.disabled = false;
    }
}

async function handleSignUp() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');
    const successEl = document.getElementById('authSuccess');
    const btn = document.getElementById('authSubmitBtn');

    errorEl.textContent = '';
    successEl.textContent = '';

    if (!email || !password) {
        errorEl.textContent = 'Please enter both email and password.';
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters.';
        return;
    }

    btn.textContent = 'Creating account…';
    btn.disabled = true;

    try {
        const { error } = await supabase.auth.signUp({
            email, password,
            options: { emailRedirectTo: `${window.location.origin}/index.html` }
        });
        if (error) throw error;
        successEl.textContent = 'Account created! You can now sign in.';
        setTimeout(() => { authMode = 'signin'; renderAuthSection(); }, 2000);
    } catch (err) {
        errorEl.textContent = err.message || 'Sign up failed. Please try again.';
        btn.textContent = 'Create Account';
        btn.disabled = false;
    }
}

async function handleSignOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        renderAuthSection();
        renderCommunitySummaryBox();
    } catch (err) {
        console.error('Sign out failed:', err);
    }
}

// ============================================================
//  SECTION 20: COMMUNITY SUMMARY BOX
// ============================================================
async function renderCommunitySummaryBox() {
    const box = document.getElementById('communitySummaryBox');
    if (!box) return;

    if (!supabase) {
        box.innerHTML = `
      <div class="community-summary-title">Your Communities</div>
      <div class="community-summary-empty">
        <a href="social/social.html" style="color:#0c831f;font-weight:700;text-decoration:none;">Sign in</a> to see your communities
      </div>
    `;
        box.onclick = () => { window.location.href = 'social/social.html'; };
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        box.innerHTML = `
      <div class="community-summary-title">Your Communities</div>
      <div class="community-summary-empty">
        <a href="#" onclick="openProfileSidebar(); return false;" style="color:#0c831f;font-weight:700;text-decoration:none;">Sign in</a> to see your communities
      </div>
    `;
        return;
    }

    box.innerHTML = '<div class="community-summary-loading">Loading communities…</div>';

    try {
        const { data, error } = await supabase
            .from('community_members')
            .select('communities(id, handle, display_name, type)')
            .eq('user_id', user.id)
            .limit(10);

        if (error) throw error;

        if (!data || data.length === 0) {
            box.innerHTML = `
        <div class="community-summary-title">Your Communities</div>
        <div class="community-summary-empty">No communities yet. <a href="social/social.html" style="color:#0c831f;font-weight:700;text-decoration:none;">Join or create one</a></div>
      `;
        } else {
            const chips = data.map(row => {
                const c = row.communities;
                const typeIcon = c.type === 'family' ? '👨👩👧👦' : '👥';
                return `<span class="community-chip">${typeIcon} ${c.display_name}</span>`;
            }).join('');

            const moreText = data.length >= 10 ? '<div class="community-chip-more">+ more on Social page</div>' : '';

            box.innerHTML = `
        <div class="community-summary-title">Your Communities</div>
        <div class="community-chips">${chips}</div>
        ${moreText}
      `;
        }
        box.onclick = () => { window.location.href = 'social/social.html'; };

    } catch (err) {
        console.error('Failed to load communities:', err);
        box.innerHTML = `
      <div class="community-summary-title">Your Communities</div>
      <div class="community-summary-empty">Unable to load. <a href="social/social.html" style="color:#0c831f;font-weight:700;text-decoration:none;">Go to Social</a></div>
    `;
        box.onclick = () => { window.location.href = 'social/social.html'; };
    }
}
