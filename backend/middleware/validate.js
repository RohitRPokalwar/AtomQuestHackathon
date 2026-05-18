// Input validation middleware for goal operations

// validate goal sheet submission
function validateGoalSheet(req, res, next) {
    const { goals } = req.body;
    if (!goals || !Array.isArray(goals) || goals.length === 0) {
        return res.status(400).json({ error: 'At least one goal is required' });
    }
    if (goals.length > 8) {
        return res.status(400).json({ error: 'Maximum 8 goals allowed per employee' });
    }

    // float-safe weightage validation (critical gap fix)
    const totalWeightage = Math.round(goals.reduce((sum, g) => sum + (g.weightage || 0), 0) * 10) / 10;
    if (totalWeightage !== 100) {
        return res.status(400).json({ error: `Total weightage must equal 100%. Currently: ${totalWeightage}%` });
    }

    for (let i = 0; i < goals.length; i++) {
        const g = goals[i];
        if (!g.title || g.title.trim().length === 0) {
            return res.status(400).json({ error: `Goal ${i + 1}: Title is required` });
        }
        if (!g.uom_type || !['numeric', 'percentage', 'timeline', 'zero'].includes(g.uom_type)) {
            return res.status(400).json({ error: `Goal ${i + 1}: Valid UoM type required` });
        }
        const w = Math.round((g.weightage || 0) * 10) / 10;
        if (w < 10) {
            return res.status(400).json({ error: `Goal ${i + 1}: Minimum weightage is 10%` });
        }
        if (g.uom_type !== 'zero' && g.uom_type !== 'timeline' && (g.target_value === null || g.target_value === undefined)) {
            return res.status(400).json({ error: `Goal ${i + 1}: Target value required for ${g.uom_type} goals` });
        }
        if (g.uom_type === 'timeline' && !g.target_date) {
            return res.status(400).json({ error: `Goal ${i + 1}: Target date required for timeline goals` });
        }
    }
    next();
}

// validate check-in data
function validateCheckin(req, res, next) {
    const { actual_value, status } = req.body;
    if (status && !['not_started', 'on_track', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
    }
    next();
}

module.exports = { validateGoalSheet, validateCheckin };
