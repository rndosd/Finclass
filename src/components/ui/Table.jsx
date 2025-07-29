import React from 'react';

const Table = ({ children }) => {
    return (
        <table className="min-w-full border border-gray-300">
            {children}
        </table>
    );
};

export default Table;
