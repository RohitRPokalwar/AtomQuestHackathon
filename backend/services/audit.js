// Audit trail service — logs all changes to goals after lock
// Append-only log, no delete capability

const { run, queryAll } = require('../database/db');
const cache = require('./cache');

// log a change to the audit trail
function logChange(entityType, entityId, action, changedBy, fieldName, oldValue, newValue) {
    cache.trackDbQuery();
    run(
        `INSERT INTO audit_log (entity_type, entity_id, action, changed_by, field_name, old_value, new_value)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [entityType, entityId, action, changedBy, fieldName,
         oldValue !== null ? String(oldValue) : null,
         newValue !== null ? String(newValue) : null]
    );
}

// log admin unlock action (critical gap fix)
function logUnlock(sheetId, adminId) {
    logChange('goal_sheet', sheetId, 'admin_unlock', adminId, 'locked', '1', '0');
}

// get audit log entries with filters
function getAuditLog(filters = {}) {
    cache.trackDbQuery();
    let sql = `SELECT a.*, u.name as changed_by_name 
               FROM audit_log a 
               JOIN users u ON a.changed_by = u.id 
               WHERE 1=1`;
    const params = [];

    if (filters.entityType) {
        sql += ' AND a.entity_type = ?';
        params.push(filters.entityType);
    }
    if (filters.entityId) {
        sql += ' AND a.entity_id = ?';
        params.push(filters.entityId);
    }
    if (filters.changedBy) {
        sql += ' AND a.changed_by = ?';
        params.push(filters.changedBy);
    }

    sql += ' ORDER BY a.timestamp DESC LIMIT 200';
    return queryAll(sql, params);
}

module.exports = { logChange, logUnlock, getAuditLog };
