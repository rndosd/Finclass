// src/pages/police/utils/policePathUtils.js

export const getPolicePath = (type, classId, docId = null) => {
    if (!classId) return null;
    switch (type) {
        case 'students':
            return `classes/${classId}/students`;
        case 'policeRulesCollection':
            return `classes/${classId}/policeRules`;
        case 'policeRuleDocument':
            return `classes/${classId}/policeRules/${docId}`;
        case 'policeReports':
            return `classes/${classId}/policeReports`;
        case 'policeFineHistory':
            return `classes/${classId}/policeFineHistory`;
        default:
            console.error(`[policePathUtils] Unknown path type: ${type}`);
            return null;
    }
};
