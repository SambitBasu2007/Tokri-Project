// ============================================================
//  Tokri – Social  |  Communities Hub Logic
// ============================================================

let supabase = null;

try {
    const module = await import('../shared/supabase.js');
    supabase = module.supabase;
} catch (err) {
    console.warn('[Social] Supabase not available:', err.message);
}

// ============================================================
//  STATE
// ============================================================
let currentUser = null;
let userNickname = '';
let activeTab = 'current';
let searchDebounceTimer = null;
let createCommunityType = 'family';
let userCommunityCount = 0;
let confirmCallback = null;

// ============================================================
//  AUTH
// ============================================================
async function initAuth() {
    if (!supabase) { showAuthRequired(); return false; }
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) { showAuthRequired(); return false; }
    currentUser = user;
    await fetchNickname();
    await fetchUserCommunityCount();
    return true;
}

async function fetchNickname() {
    if (!currentUser || !supabase) return;
    const { data, error } = await supabase.from('users').select('full_name').eq('id', currentUser.id).single();
    if (!error && data?.full_name) userNickname = data.full_name;
}

async function fetchUserCommunityCount() {
    if (!currentUser || !supabase) return;
    const { count, error } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);
    if (!error) userCommunityCount = count || 0;
}







function showAuthRequired() {
    const isSignUp = authMode === 'signup';
    const authFormHTML = `
    <div class="profile-auth-form" style="max-width:320px;margin:0 auto;text-align:left;">
      <div class="profile-auth-title" style="text-align:center;margin-bottom:12px;">${isSignUp ? 'Create Account' : 'Sign In'}</div>
      <input type="email" class="profile-auth-input" id="socialAuthEmail" placeholder="Email address" autocomplete="email">
      <input type="password" class="profile-auth-input" id="socialAuthPassword" placeholder="Password" autocomplete="${isSignUp ? 'new-password' : 'current-password'}">
      <div class="profile-auth-error" id="socialAuthError"></div>
      <div class="profile-auth-success" id="socialAuthSuccess"></div>
      <button class="btn btn-primary btn-block" id="socialAuthSubmitBtn" type="button">${isSignUp ? 'Create Account' : 'Sign In'}</button>
      <div class="profile-auth-toggle" style="text-align:center;">
        ${isSignUp ? 'Already have an account? <button type="button" id="socialAuthToggleBtn">Sign in</button>' : 'New here? <button type="button" id="socialAuthToggleBtn">Create account</button>'}
      </div>
    </div>`;

    ['panelCurrent', 'panelJoin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<div class="section-container"><div class="communities-empty"><div style="font-size:3rem;margin-bottom:16px;">🔒</div><div style="font-size:1.1rem;font-weight:700;color:var(--text-primary);margin-bottom:8px;">Sign in required</div><div style="color:var(--text-secondary);margin-bottom:24px;">Please sign in to view and join communities.</div>${authFormHTML}</div></div>`;
    });

    // Wire up inline auth form listeners
    const submitBtn = document.getElementById('socialAuthSubmitBtn');
    const toggleBtn = document.getElementById('socialAuthToggleBtn');
    if (submitBtn) submitBtn.addEventListener('click', isSignUp ? handleSocialSignUp : handleSocialSignIn);
    if (toggleBtn) toggleBtn.addEventListener('click', () => { authMode = authMode === 'signin' ? 'signup' : 'signin'; showAuthRequired(); });
}




async function handleSocialSignIn() {
    const email = document.getElementById('socialAuthEmail').value.trim();
    const password = document.getElementById('socialAuthPassword').value;
    const errorEl = document.getElementById('socialAuthError');
    const successEl = document.getElementById('socialAuthSuccess');
    const btn = document.getElementById('socialAuthSubmitBtn');

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
        setTimeout(async () => {
            const authed = await initAuth();
            if (authed) {
                if (activeTab === 'current') renderCurrentCommunities();
                else switchSocialTab('join');
            }
        }, 600);
    } catch (err) {
        errorEl.textContent = err.message || 'Sign in failed. Please try again.';
        btn.textContent = 'Sign In';
        btn.disabled = false;
    }
}


async function handleSocialSignUp() {
    const email = document.getElementById('socialAuthEmail').value.trim();
    const password = document.getElementById('socialAuthPassword').value;
    const errorEl = document.getElementById('socialAuthError');
    const successEl = document.getElementById('socialAuthSuccess');
    const btn = document.getElementById('socialAuthSubmitBtn');

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
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/index.html` }
        });
        if (error) throw error;

        successEl.textContent = 'Account created! You can now sign in.';
        setTimeout(() => {
            authMode = 'signin';
            showAuthRequired();
        }, 2000);
    } catch (err) {
        errorEl.textContent = err.message || 'Sign up failed. Please try again.';
        btn.textContent = 'Create Account';
        btn.disabled = false;
    }
}





// ============================================================
//  TABS
// ============================================================
function switchSocialTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.social-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.social-panel').forEach(p => p.classList.toggle('active', p.id === 'panel' + (tab === 'current' ? 'Current' : 'Join')));
    if (tab === 'current') renderCurrentCommunities();
}
document.querySelectorAll('.social-tab').forEach(tab => tab.addEventListener('click', () => switchSocialTab(tab.dataset.tab)));

// ============================================================
//  CURRENT COMMUNITIES
// ============================================================
async function renderCurrentCommunities() {
    const grid = document.getElementById('communitiesGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="communities-loading">Loading your communities…</div>';
    try {
        const { data: memberships, error: memError } = await supabase
            .from('community_members')
            .select(`community_id, communities(id, handle, display_name, type, leader_id, created_at)`)
            .eq('user_id', currentUser.id);
        if (memError) throw memError;
        if (!memberships || memberships.length === 0) {
            grid.innerHTML = `<div class="communities-empty"><div style="font-size:3rem;margin-bottom:16px;">🏠</div><div style="font-size:1.1rem;font-weight:700;color:var(--text-primary);margin-bottom:8px;">No communities yet</div><div style="color:var(--text-secondary);margin-bottom:24px;">Create a community or join one to get started.</div><button class="btn btn-primary" onclick="openCreateModal()">Create Community</button></div>`;
            return;
        }
        const cards = await Promise.all(memberships.map(async (m) => {
            const c = m.communities;
            const { data: members } = await supabase.from('community_members').select(`user_id, nickname, users(id, full_name)`).eq('community_id', c.id);
            const { data: requests } = await supabase.from('join_requests').select('id, user_id, status, users:user_id(full_name)').eq('community_id', c.id).eq('status', 'pending');
            let lastOrder = null;
            try {
                const { data: orders } = await supabase.from('order_events').select(`ordered_by, created_at, users:ordered_by(full_name)`).eq('community_id', c.id).order('created_at', { ascending: false }).limit(1);
                if (orders && orders.length) lastOrder = orders[0];
            } catch (e) { }
            return renderCommunityCard(c, members || [], buildStatusLine(lastOrder), requests || []);
        }));
        grid.innerHTML = cards.join('');
    } catch (err) {
        grid.innerHTML = `<div class="communities-empty"><div style="font-size:2.5rem;margin-bottom:12px;">⚠️</div><div style="font-weight:700;color:var(--text-primary);margin-bottom:8px;">Unable to load communities</div><div style="color:var(--text-secondary);">${err.message || 'Please try again later.'}</div></div>`;
    }
}

function buildStatusLine(lastOrder) {
    if (!lastOrder) return { text: 'No orders yet — be the first to shop!', hasActivity: false };
    const diffMs = Date.now() - new Date(lastOrder.created_at);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    let timeAgo;
    if (diffMins < 1) timeAgo = 'just now';
    else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
    else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
    else timeAgo = `${diffDays}d ago`;
    return { text: `${lastOrder.users?.full_name || 'Someone'} ordered ${timeAgo}`, hasActivity: true };
}

function renderCommunityCard(community, members, status, pendingRequests) {
    const isLeader = currentUser.id === community.leader_id;
    const typeIcon = community.type === 'family' ? '👨‍👩‍👧‍👦' : '👥';
    const memberCount = members.length;
    const requestCount = pendingRequests.length;

    let requestsHTML = '';
    if (isLeader && requestCount > 0) {
        requestsHTML = `<div class="community-requests"><div class="community-requests-title">🔔 ${requestCount} pending request${requestCount !== 1 ? 's' : ''}</div>` +
            pendingRequests.map(r => { const reqName = r.users?.full_name || r.user_id.slice(0, 8); return `<div class="community-request-row"><span class="community-request-user">${reqName}</span><button class="btn-request-accept" onclick="event.stopPropagation(); acceptJoinRequest('${r.id}', '${community.id}')">Accept</button><button class="btn-request-reject" onclick="event.stopPropagation(); rejectJoinRequest('${r.id}', '${community.id}')">Reject</button></div>`; }).join('') +
            `</div>`;
    }

    const membersHTML = members.map(m => {
        const isLeaderRow = m.user_id === community.leader_id;
        const isSelf = m.user_id === currentUser.id;
        const name = m.users?.full_name || m.nickname || 'Member';
        const displayName = isSelf ? `${name} (you)` : name;
        let actions = '';
        if (isLeader && !isLeaderRow) {
            actions = `<div class="member-actions-group"><button class="member-action" onclick="event.stopPropagation(); removeMember('${community.id}', '${m.user_id}')" title="Remove">✕</button><button class="member-action member-action--leader" onclick="event.stopPropagation(); transferLeadership('${community.id}', '${m.user_id}')" title="Make Leader">👑</button></div>`;
        }
        return `<div class="community-member-row${isLeaderRow ? ' leader' : ''}"><span class="community-member-star">${isLeaderRow ? '★' : ''}</span><span class="community-member-name">${displayName}</span>${isLeaderRow ? '<span class="community-member-role">Leader</span>' : ''}${actions}</div>`;
    }).join('');

    // Delete dropdown for leader only
    const deleteDropdown = isLeader ? `
        <div class="delete-dropdown-wrap">
            <button class="delete-dropdown-btn" onclick="event.stopPropagation(); toggleDeleteDropdown(this)" title="More options">⋯</button>
            <div class="delete-dropdown-menu">
                <button class="delete-dropdown-item" onclick="event.stopPropagation(); promptDeleteCommunity('${community.id}', '${community.display_name}')">🗑️ Delete Community</button>
            </div>
        </div>` : '';

    return `<div class="community-card" data-community-id="${community.id}"><div class="community-card-header" onclick="toggleCommunityDropdown('${community.id}')"><div class="community-card-icon">${typeIcon}</div><div class="community-card-info"><div class="community-card-name">${community.display_name}</div><div class="community-card-meta"><span class="community-card-type">${community.type}</span><span class="community-card-handle">@${community.handle}</span><span>· ${memberCount} member${memberCount !== 1 ? 's' : ''}</span>${requestCount > 0 && isLeader ? `<span class="community-card-badge">${requestCount} request${requestCount !== 1 ? 's' : ''}</span>` : ''}</span></div></div><svg class="community-card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></div><div class="community-card-status${status.hasActivity ? '' : ' community-card-status--none'}">${status.text}</div><div class="community-members-dropdown" id="dropdown-${community.id}"><div class="community-members-list">${requestsHTML}${membersHTML}</div><div class="community-actions-row"><button class="btn-leave" onclick="event.stopPropagation(); leaveCommunity('${community.id}')">${isLeader ? 'Leave (transfer leadership)' : 'Leave Community'}</button>${deleteDropdown}</div></div></div>`;
}

function toggleCommunityDropdown(communityId) {
    closeAllDeleteDropdowns();
    const card = document.querySelector(`[data-community-id="${communityId}"]`);
    if (card) card.classList.toggle('open');
}
window.toggleCommunityDropdown = toggleCommunityDropdown;

function toggleDeleteDropdown(btn) {
    const menu = btn.parentElement.querySelector('.delete-dropdown-menu');
    const willOpen = !menu.classList.contains('open');
    closeAllDeleteDropdowns();
    if (willOpen) menu.classList.add('open');
}
function closeAllDeleteDropdowns() {
    document.querySelectorAll('.delete-dropdown-menu.open').forEach(m => m.classList.remove('open'));
}
window.toggleDeleteDropdown = toggleDeleteDropdown;

document.addEventListener('click', (e) => {
    if (!e.target.closest('.delete-dropdown-wrap')) closeAllDeleteDropdowns();
});

// ============================================================
//  CONFIRMATION MODAL
// ============================================================
function showConfirm(title, text, onYes) {
    confirmCallback = onYes;
    const overlay = document.getElementById('confirmOverlay');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmText').textContent = text;
    overlay.classList.add('open');
}
function closeConfirm() {
    document.getElementById('confirmOverlay').classList.remove('open');
    confirmCallback = null;
}
document.getElementById('confirmYes')?.addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeConfirm();
});
document.getElementById('confirmNo')?.addEventListener('click', closeConfirm);
document.getElementById('confirmOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirmOverlay')) closeConfirm();
});
window.closeConfirm = closeConfirm;

// ============================================================
//  LEADER ACTIONS
// ============================================================
async function acceptJoinRequest(requestId, communityId) {
    try {
        const { error } = await supabase.from('join_requests').update({ status: 'accepted' }).eq('id', requestId);
        if (error) throw error;
        const { data: req } = await supabase.from('join_requests').select('user_id').eq('id', requestId).single();
        if (req) {
            const { error: memErr } = await supabase.from('community_members').insert({ community_id: communityId, user_id: req.user_id, nickname: 'Member' });
            if (memErr && memErr.code !== '23505') throw memErr;
        }
        renderCurrentCommunities();
    } catch (err) { alert('Failed to accept request: ' + err.message); }
}
window.acceptJoinRequest = acceptJoinRequest;

async function rejectJoinRequest(requestId, communityId) {
    try {
        const { error } = await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', requestId);
        if (error) throw error;
        renderCurrentCommunities();
    } catch (err) { alert('Failed to reject request: ' + err.message); }
}
window.rejectJoinRequest = rejectJoinRequest;

async function removeMember(communityId, userId) {
    showConfirm('Remove Member', 'Remove this member from the community?', async () => {
        try {
            const { error } = await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId);
            if (error) throw error;
            renderCurrentCommunities();
        } catch (err) { alert('Failed to remove member: ' + err.message); }
    });
}
window.removeMember = removeMember;

async function transferLeadership(communityId, newLeaderId) {
    showConfirm('Transfer Leadership', 'Transfer leadership to this member? You will no longer be the leader.', async () => {
        try {
            const { error } = await supabase.from('communities').update({ leader_id: newLeaderId }).eq('id', communityId);
            if (error) throw error;
            renderCurrentCommunities();
        } catch (err) { alert('Failed to transfer leadership: ' + err.message); }
    });
}
window.transferLeadership = transferLeadership;

async function leaveCommunity(communityId) {
    showConfirm('Leave Community', 'Are you sure you want to leave this community?', async () => {
        try {
            const { data: community } = await supabase.from('communities').select('leader_id').eq('id', communityId).single();
            const isLeader = community && community.leader_id === currentUser.id;
            // Delete membership
            const { error } = await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', currentUser.id);
            if (error) throw error;
            // Also delete any join_requests for this user+community (fixes stale request bug)
            await supabase.from('join_requests').delete().eq('community_id', communityId).eq('user_id', currentUser.id);
            if (isLeader) {
                const { error: rpcErr } = await supabase.rpc('reassign_random_leader', { community_id: communityId });
                if (rpcErr) console.warn('Reassign leader RPC:', rpcErr);
            }
            await fetchUserCommunityCount();
            renderCurrentCommunities();
        } catch (err) { alert('Failed to leave community: ' + err.message); }
    });
}
window.leaveCommunity = leaveCommunity;

async function promptDeleteCommunity(communityId, communityName) {
    showConfirm('Delete Community', `Permanently delete "${communityName}"? This cannot be undone and the @handle will be freed.`, async () => {
        try {
            const { error } = await supabase.from('communities').delete().eq('id', communityId);
            if (error) throw error;
            await fetchUserCommunityCount();
            renderCurrentCommunities();
        } catch (err) { alert('Failed to delete community: ' + err.message); }
    });
}
window.promptDeleteCommunity = promptDeleteCommunity;

// ============================================================
//  JOIN TAB
// ============================================================
function getJoinSearchQuery() { return document.getElementById('joinSearchInput').value.trim().toLowerCase(); }

async function searchCommunityByHandle(query) {
    const resultsContainer = document.getElementById('joinResults');
    if (!query || query.length < 2) { resultsContainer.innerHTML = '<div class="join-empty-hint">Type at least 2 characters to search</div>'; return; }
    resultsContainer.innerHTML = '<div class="join-empty-hint">Searching…</div>';
    try {
        const { data: communities, error } = await supabase.from('communities').select('id, handle, display_name, type, leader_id').ilike('handle', `%${query}%`).limit(20);
        if (error) throw error;
        if (!communities || communities.length === 0) { resultsContainer.innerHTML = '<div class="join-empty-hint">No communities found matching that handle</div>'; return; }

        // Check membership and requests
        const { data: myMemberships } = await supabase.from('community_members').select('community_id').eq('user_id', currentUser.id);
        const { data: myRequests } = await supabase.from('join_requests').select('id, community_id, status').eq('user_id', currentUser.id);
        const memberIds = new Set((myMemberships || []).map(m => m.community_id));
        const requestMap = new Map((myRequests || []).map(r => [r.community_id, r]));
        const atCap = userCommunityCount >= 10;

        // Fetch members for ALL found communities (not just joined ones)
        const memberPromises = communities.map(c =>
            supabase.from('community_members').select('user_id, nickname, users(id, full_name)').eq('community_id', c.id)
        );
        const memberResults = await Promise.all(memberPromises);

        const cards = communities.map((c, i) => {
            const typeIcon = c.type === 'family' ? '👨‍👩‍👧‍👦' : '👥';
            const isMember = memberIds.has(c.id);
            const requestData = requestMap.get(c.id);
            const requestStatus = requestData?.status;
            const members = memberResults[i]?.data || [];
            const memberCount = members.length;

            // FIX 1: Members dropdown for ALL communities
            let memberDropdown = '';
            if (memberCount > 0) {
                const memberRows = members.map(m => {
                    const isLeader = m.user_id === c.leader_id;
                    const isSelf = m.user_id === currentUser.id;
                    const name = m.users?.full_name || m.nickname || 'Member';
                    const displayName = isSelf ? `${name} (you)` : name;
                    return `<div class="search-member-row"><span class="search-member-star">${isLeader ? '★' : ''}</span><span class="search-member-name">${displayName}</span>${isLeader ? '<span class="search-member-role">Leader</span>' : ''}</div>`;
                }).join('');
                memberDropdown = `<div class="search-member-dropdown-wrap"><button class="search-member-dropdown-btn" onclick="event.stopPropagation(); toggleSearchMemberDropdown(this)">👥 ${memberCount} member${memberCount !== 1 ? 's' : ''}</button><div class="search-member-dropdown"><div class="search-member-dropdown-title">Members</div>${memberRows}</div></div>`;
            } else if (memberResults[i]?.error) {
                memberDropdown = `<div class="search-member-dropdown-wrap"><button class="search-member-dropdown-btn" disabled>Members hidden</button></div>`;
            } else {
                memberDropdown = `<div class="search-member-dropdown-wrap"><button class="search-member-dropdown-btn" disabled>No members</button></div>`;
            }

            let actionButton;
            if (isMember) actionButton = '<button class="btn-join" disabled>Joined</button>';
            else if (requestStatus === 'pending') actionButton = `<button class="btn-join requested" onclick="cancelJoinRequest('${requestData.id}', '${c.id}')">Cancel Request</button>`;
            else if (requestStatus === 'rejected') actionButton = `<button class="btn-join" onclick="sendJoinRequest('${c.id}')">Join</button>`;
            else if (atCap) actionButton = '<button class="btn-join" disabled title="You can only join 10 communities">At Limit (10)</button>';
            else actionButton = `<button class="btn-join" onclick="sendJoinRequest('${c.id}')">Join</button>`;

            return `<div class="join-result-card"><div class="join-result-icon">${typeIcon}</div><div class="join-result-info"><div class="join-result-name">${c.display_name}</div><div class="join-result-handle">@${c.handle}</div><div class="join-result-type">${c.type === 'family' ? 'Family group' : 'Friends group'}</div></div><div class="join-result-actions">${actionButton}${memberDropdown}</div></div>`;
        }).join('');
        resultsContainer.innerHTML = cards;
    } catch (err) { resultsContainer.innerHTML = '<div class="join-empty-hint">Search failed. Please try again.</div>'; }
}

function toggleSearchMemberDropdown(btn) {
    const menu = btn.parentElement.querySelector('.search-member-dropdown');
    const willOpen = !menu.classList.contains('open');
    document.querySelectorAll('.search-member-dropdown.open').forEach(m => m.classList.remove('open'));
    if (willOpen) menu.classList.add('open');
}
window.toggleSearchMemberDropdown = toggleSearchMemberDropdown;

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-member-dropdown-wrap')) document.querySelectorAll('.search-member-dropdown.open').forEach(m => m.classList.remove('open'));
});

document.getElementById('joinSearchInput').addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    const query = getJoinSearchQuery();
    searchDebounceTimer = setTimeout(() => searchCommunityByHandle(query), 300);
});

async function sendJoinRequest(communityId) {
    if (userCommunityCount >= 10) { alert('You can only join up to 10 communities.'); return; }
    try {
        if (!currentUser) { const { data: { user } } = await supabase.auth.getUser(); if (!user) { alert('Please sign in first.'); return; } currentUser = user; }

        // Check if community has 0 members — if so, delete it as bugged
        const { count, error: countErr } = await supabase.from('community_members').select('*', { count: 'exact', head: true }).eq('community_id', communityId);
        if (!countErr && count === 0) {
            const { error: delErr } = await supabase.from('communities').delete().eq('id', communityId);
            if (delErr) console.warn('Failed to clean bugged community:', delErr);
            const query = getJoinSearchQuery();
            await searchCommunityByHandle(query);
            return;
        }

        // Delete any old rejected/accepted request first (allows re-requesting)
        await supabase.from('join_requests').delete().eq('community_id', communityId).eq('user_id', currentUser.id);

        const { error } = await supabase.from('join_requests').insert({ community_id: communityId, user_id: currentUser.id, status: 'pending' });
        if (error) { if (error.code === '23505') alert('You have already requested to join this community.'); else throw error; return; }
        const query = getJoinSearchQuery();
        await searchCommunityByHandle(query);
    } catch (err) { alert('Failed to send join request. Please try again.'); }
}
window.sendJoinRequest = sendJoinRequest;

// FIX 3: Cancel join request
async function cancelJoinRequest(requestId, communityId) {
    try {
        const { error } = await supabase.from('join_requests').delete().eq('id', requestId);
        if (error) throw error;
        const query = getJoinSearchQuery();
        await searchCommunityByHandle(query);
    } catch (err) { alert('Failed to cancel request: ' + err.message); }
}
window.cancelJoinRequest = cancelJoinRequest;

// ============================================================
//  CREATE COMMUNITY MODAL
// ============================================================
function openCreateModal() { document.getElementById('createModalOverlay').classList.add('open'); document.getElementById('createNameInput').focus(); }
function closeCreateModal() { document.getElementById('createModalOverlay').classList.remove('open'); document.getElementById('createNameInput').value = ''; document.getElementById('createHandleInput').value = ''; }

async function submitCreateCommunity() {
    const name = document.getElementById('createNameInput').value.trim();
    const handle = document.getElementById('createHandleInput').value.trim().toLowerCase();
    if (!name || !handle) { alert('Please enter both a name and a unique handle.'); return; }
    if (!/^[a-z0-9_]+$/.test(handle)) { alert('Handle can only contain lowercase letters, numbers, and underscores.'); return; }
    try {
        if (!currentUser) { const { data: { user } } = await supabase.auth.getUser(); if (!user) { alert('Please sign in first.'); return; } currentUser = user; }
        const { error } = await supabase.from('communities').insert({ handle, display_name: name, type: createCommunityType, leader_id: currentUser.id });
        if (error) { if (error.code === '23505') alert('That handle is already taken.'); else throw error; return; }
        closeCreateModal();
        await fetchUserCommunityCount();
        switchSocialTab('current');
    } catch (err) { console.error('Create community failed:', err); alert('Failed to create community: ' + err.message); }
}

document.getElementById('createCommunityBtn').addEventListener('click', openCreateModal);
document.getElementById('createModalClose').addEventListener('click', closeCreateModal);
document.getElementById('createModalCancel').addEventListener('click', closeCreateModal);
document.getElementById('createModalSubmit').addEventListener('click', submitCreateCommunity);
document.querySelectorAll('.social-type-pill').forEach(pill => pill.addEventListener('click', () => { document.querySelectorAll('.social-type-pill').forEach(p => p.classList.remove('active')); pill.classList.add('active'); createCommunityType = pill.dataset.type; }));
document.getElementById('createModalOverlay').addEventListener('click', (e) => { if (e.target === document.getElementById('createModalOverlay')) closeCreateModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCreateModal(); closeConfirm(); } });
window.openCreateModal = openCreateModal;



window.handleSocialSignIn = handleSocialSignIn;
window.handleSocialSignUp = handleSocialSignUp;

// ============================================================
//  THEME TOGGLE
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
//  CART BUTTON
// ============================================================
const cartBtn = document.getElementById('cartBtn');
if (cartBtn) cartBtn.addEventListener('click', () => { window.location.href = '../index.html'; });

// ============================================================
//  INIT
// ============================================================
(async function init() { const authed = await initAuth(); if (authed) renderCurrentCommunities(); })();

// ============================================================
//  PROFILE SIDEBAR
// ============================================================
function openProfileSidebar() { document.getElementById('profileSidebar').classList.add('open'); document.getElementById('profileOverlay').classList.add('open'); renderAuthSection(); renderCommunitySummaryBox(); }
function closeProfileSidebar() { document.getElementById('profileSidebar').classList.remove('open'); document.getElementById('profileOverlay').classList.remove('open'); }
document.getElementById('profileBtn').addEventListener('click', openProfileSidebar);
document.getElementById('profileClose').addEventListener('click', closeProfileSidebar);
document.getElementById('profileOverlay').addEventListener('click', closeProfileSidebar);

let authMode = 'signin';
async function renderAuthSection() {
    const section = document.getElementById('profileAuthSection');
    if (!section) return;
    if (!supabase) { section.innerHTML = '<div class="profile-auth-loading">Auth service unavailable</div>'; return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const initial = user.email ? user.email[0].toUpperCase() : '?';
        const displayName = userNickname || user.email.split('@')[0];
        section.innerHTML = `<div class="profile-auth-user"><div class="profile-auth-avatar">${initial}</div><div class="profile-auth-info"><div class="profile-auth-email">${user.email}</div><div class="profile-auth-status">● Signed in as ${displayName}</div></div></div><div class="profile-nickname-section"><label class="profile-nickname-label">Your Nickname</label><input type="text" class="profile-auth-input" id="nicknameInput" value="${displayName}" placeholder="Enter your nickname" maxlength="30"><button class="btn btn-primary btn-block" id="saveNicknameBtn" type="button">Save Nickname</button><div class="profile-auth-error" id="nicknameError"></div></div><button class="btn-signout" id="signOutBtn" type="button">Sign Out</button>`;
        document.getElementById('signOutBtn').addEventListener('click', handleSignOut);
        document.getElementById('saveNicknameBtn').addEventListener('click', saveNickname);
    } else {
        const isSignUp = authMode === 'signup';
        section.innerHTML = `<div class="profile-auth-form"><div class="profile-auth-title">${isSignUp ? 'Create Account' : 'Sign In'}</div><input type="email" class="profile-auth-input" id="authEmail" placeholder="Email address" autocomplete="email"><input type="password" class="profile-auth-input" id="authPassword" placeholder="Password" autocomplete="${isSignUp ? 'new-password' : 'current-password'}"><div class="profile-auth-error" id="authError"></div><div class="profile-auth-success" id="authSuccess"></div><button class="btn btn-primary btn-block" id="authSubmitBtn" type="button">${isSignUp ? 'Create Account' : 'Sign In'}</button><div class="profile-auth-toggle">${isSignUp ? 'Already have an account? <button type="button" id="authToggleBtn">Sign in</button>' : 'New here? <button type="button" id="authToggleBtn">Create account</button>'}</div></div>`;
        document.getElementById('authSubmitBtn').addEventListener('click', isSignUp ? handleSignUp : handleSignIn);
        document.getElementById('authToggleBtn').addEventListener('click', toggleAuthMode);
    }
}
async function saveNickname() {
    const input = document.getElementById('nicknameInput');
    const errorEl = document.getElementById('nicknameError');
    const btn = document.getElementById('saveNicknameBtn');
    const name = input.value.trim();
    if (!name) { errorEl.textContent = 'Nickname cannot be empty.'; return; }
    errorEl.textContent = '';
    btn.textContent = 'Saving…'; btn.disabled = true;
    try {
        const { error } = await supabase.from('users').update({ full_name: name }).eq('id', currentUser.id);
        if (error) throw error;
        userNickname = name;
        btn.textContent = 'Saved!';
        setTimeout(() => { btn.textContent = 'Save Nickname'; btn.disabled = false; }, 1200);
    } catch (err) { errorEl.textContent = err.message || 'Failed to save.'; btn.textContent = 'Save Nickname'; btn.disabled = false; }
}

function toggleAuthMode() { authMode = authMode === 'signin' ? 'signup' : 'signin'; renderAuthSection(); }
async function handleSignIn() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');
    const successEl = document.getElementById('authSuccess');
    const btn = document.getElementById('authSubmitBtn');
    errorEl.textContent = ''; successEl.textContent = '';
    if (!email || !password) { errorEl.textContent = 'Please enter both email and password.'; return; }
    btn.textContent = 'Signing in…'; btn.disabled = true;
    try { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; successEl.textContent = 'Signed in successfully!'; setTimeout(() => { renderAuthSection(); renderCommunitySummaryBox(); }, 600); }
    catch (err) { errorEl.textContent = err.message || 'Sign in failed.'; btn.textContent = 'Sign In'; btn.disabled = false; }
}
async function handleSignUp() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');
    const successEl = document.getElementById('authSuccess');
    const btn = document.getElementById('authSubmitBtn');
    errorEl.textContent = ''; successEl.textContent = '';
    if (!email || !password) { errorEl.textContent = 'Please enter both email and password.'; return; }
    if (password.length < 6) { errorEl.textContent = 'Password must be at least 6 characters.'; return; }
    btn.textContent = 'Creating account…'; btn.disabled = true;
    try { const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/index.html` } }); if (error) throw error; successEl.textContent = 'Account created!'; setTimeout(() => { authMode = 'signin'; renderAuthSection(); }, 2000); }
    catch (err) { errorEl.textContent = err.message || 'Sign up failed.'; btn.textContent = 'Create Account'; btn.disabled = false; }
}
async function handleSignOut() { try { const { error } = await supabase.auth.signOut(); if (error) throw error; renderAuthSection(); renderCommunitySummaryBox(); } catch (err) { console.error('Sign out failed:', err); } }

async function renderCommunitySummaryBox() {
    const box = document.getElementById('communitySummaryBox');
    if (!box) return;
    if (!supabase) { box.innerHTML = `<div class="community-summary-title">Your Communities</div><div class="community-summary-empty"><a href="social/social.html" style="color:#0c831f;font-weight:700;text-decoration:none;">Sign in</a> to see your communities</div>`; box.onclick = () => { window.location.href = 'social/social.html'; }; return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { box.innerHTML = `<div class="community-summary-title">Your Communities</div><div class="community-summary-empty"><a href="#" onclick="openProfileSidebar(); return false;" style="color:#0c831f;font-weight:700;text-decoration:none;">Sign in</a> to see your communities</div>`; return; }
    box.innerHTML = '<div class="community-summary-loading">Loading communities…</div>';
    try {
        const { data, error } = await supabase.from('community_members').select('communities(id, handle, display_name, type)').eq('user_id', user.id).limit(10);
        if (error) throw error;
        if (!data || data.length === 0) { box.innerHTML = `<div class="community-summary-title">Your Communities</div><div class="community-summary-empty">No communities yet. <a href="social/social.html" style="color:#0c831f;font-weight:700;text-decoration:none;">Join or create one</a></div>`; }
        else { const chips = data.map(row => { const c = row.communities; const typeIcon = c.type === 'family' ? '👨👩👧👦' : '👥'; return `<span class="community-chip">${typeIcon} ${c.display_name}</span>`; }).join(''); const moreText = data.length >= 10 ? '<div class="community-chip-more">+ more on Social page</div>' : ''; box.innerHTML = `<div class="community-summary-title">Your Communities</div><div class="community-chips">${chips}</div>${moreText}`; }
        box.onclick = () => { window.location.href = 'social.html'; };
    } catch (err) { box.innerHTML = `<div class="community-summary-title">Your Communities</div><div class="community-summary-empty">Unable to load. <a href="social/social.html" style="color:#0c831f;font-weight:700;text-decoration:none;">Go to Social</a></div>`; box.onclick = () => { window.location.href = 'social/social.html'; }; }
}