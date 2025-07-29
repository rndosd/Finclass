// /src/components/modals/PayrollAdminModal.styles.js
export const styles = {
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 1040,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    modalContent: {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        width: '90%',
        maxWidth: '800px', // 이전 900px에서 약간 줄임, 필요시 조정
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 7px 25px rgba(0,0,0,0.25)',
        position: 'relative'
    },
    closeButton: {
        position: 'absolute',
        top: '15px',
        right: '20px',
        background: 'none',
        border: 'none',
        fontSize: '2em',
        cursor: 'pointer',
        color: '#aaa',
        lineHeight: 1
    },
    section: {
        marginBottom: '30px',
        paddingBottom: '25px',
        borderBottom: '1px solid #eee'
    },
    sectionTitle: {
        fontSize: '1.5em',
        color: '#2c3e50',
        marginBottom: '20px',
        borderBottom: '2px solid #3498db',
        paddingBottom: '10px'
    },
    input: {
        padding: '10px 12px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        marginRight: '10px',
        marginBottom: '10px',
        fontSize: '0.95em',
        minWidth: '180px',
        boxSizing: 'border-box' // 패딩 포함 크기 계산
    },
    button: {
        padding: '10px 18px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        backgroundColor: '#3498db',
        color: 'white',
        marginRight: '10px',
        fontSize: '0.95em',
        transition: 'background-color 0.2s ease'
        // ':hover': { backgroundColor: '#2980b9' } // JS 객체로는 hover 직접 처리 어려움. 인라인 스타일이나 이벤트 핸들러로 가능
    },
    deleteButton: { backgroundColor: '#e74c3c' },
    saveButton: { backgroundColor: '#2ecc71' },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '15px',
        fontSize: '0.9em'
    },
    th: {
        backgroundColor: '#f0f4f7',
        padding: '12px',
        border: '1px solid #dee2e6',
        textAlign: 'left',
        fontWeight: '600',
        color: '#495057'
    },
    td: {
        padding: '12px',
        border: '1px solid #dee2e6',
        textAlign: 'left',
        verticalAlign: 'middle'
    },
    fileInputLabel: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        color: '#555'
    },
    fileInput: {
        display: 'block',
        marginBottom: '15px',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        width: 'calc(100% - 22px)' // 패딩 고려
    },
    formGroup: {
        marginBottom: '15px',
        padding: '15px',
        border: '1px solid #f0f0f0',
        borderRadius: '5px',
        backgroundColor: '#f9f9f9'
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: '500',
        color: '#555'
    },
    select: {
        padding: '10px 12px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        minWidth: '180px',
        fontSize: '0.95em'
    },
    alert: (type) => ({
        padding: '12px 15px',
        margin: '15px 0',
        borderRadius: '5px',
        color: 'white',
        backgroundColor: type === 'error' ? '#e74c3c' : (type === 'success' ? '#2ecc71' : '#3498db')
    }),
    inlineForm: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap'
    },
    studentRow: { // CSS 클래스로 관리하는게 나음 (:hover 등)
        // transition: 'background-color 0.1s ease'
    },
    paidStatus: (status) => ({
        padding: '3px 8px',
        borderRadius: '10px',
        fontSize: '0.8em',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: status === 'paid' ? '#28a745' : (status === 'pending' ? '#ffc107' : (status === 'failed' ? '#dc3545' : '#6c757d')),
    }),
};