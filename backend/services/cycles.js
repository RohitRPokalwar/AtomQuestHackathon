// Real-time cycle window calculations for admin dashboard

function parseDateEnd(dateStr) {
    const d = new Date(dateStr);
    d.setHours(23, 59, 59, 999);
    return d;
}

function enrichCycle(cycle, now = new Date()) {
    const open = new Date(cycle.window_open);
    const close = parseDateEnd(cycle.window_close);
    const msPerDay = 86400000;

    let window_status = 'ended';
    if (now < open) window_status = 'upcoming';
    else if (now <= close) window_status = 'open';

    let days_remaining = null;
    let days_until_open = null;
    if (window_status === 'open') {
        days_remaining = Math.max(0, Math.ceil((close - now) / msPerDay));
    } else if (window_status === 'upcoming') {
        days_until_open = Math.max(0, Math.ceil((open - now) / msPerDay));
    }

    const total = close - open;
    const elapsed = now - open;
    let window_progress = 0;
    if (window_status === 'open' && total > 0) {
        window_progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    } else if (window_status === 'ended') {
        window_progress = 100;
    }

    const windowState = getWindowState(cycle, now);

    return {
        ...cycle,
        is_active: !!cycle.is_active,
        window_status,
        days_remaining,
        days_until_open,
        window_progress,
        is_live_window: window_status === 'open',
        portal_open: windowState.windowOpen,
        admin_override: windowState.adminOverride,
    };
}

/** Portal accepts submissions when HR/admin activated the cycle OR calendar window is open */
function getWindowState(cycle, now = new Date()) {
    if (!cycle) {
        return { windowOpen: false, calendarOpen: false, adminOverride: false };
    }
    const open = new Date(cycle.window_open);
    const close = parseDateEnd(cycle.window_close);
    const calendarOpen = now >= open && now <= close;
    const adminOverride = !!cycle.is_active;
    return {
        windowOpen: adminOverride || calendarOpen,
        calendarOpen,
        adminOverride: adminOverride && !calendarOpen,
    };
}

function enrichCycles(cycles, now = new Date()) {
    const enriched = cycles.map(c => enrichCycle(c, now));
    const activeAdmin = enriched.find(c => c.is_active);
    const liveWindows = enriched.filter(c => c.is_live_window);

    return {
        server_time: now.toISOString(),
        active_admin_cycle: activeAdmin || null,
        live_window_count: liveWindows.length,
        cycles: enriched,
    };
}

module.exports = { enrichCycle, enrichCycles, getWindowState, parseDateEnd };
